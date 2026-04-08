import { Router, Response } from 'express';
import { checkJwt, AuthRequest, extractUserId, getWorkspaceOwnerId, requireAdmin } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { TimeEntry, Client, IClient, ITimeEntry, IProject, ITaskType, LineItem, Project, User, SiteConfig } from '../models';
import {
  parseDateStart,
  parseDateEnd,
  getDiscountPercent,
  getEffectiveRate,
} from '../utils/calculations';

const router = Router();

// All routes require authentication + admin
router.use(checkJwt);
router.use(requireAdmin);

// POST /api/reports/generate-invoice - Generate invoice data (all workspace entries)
router.post(
  '/generate-invoice',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const { clientId, projectId, projectIds, startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      throw createError('Start date and end date are required', 400);
    }

    const workspaceProjectIds = await Project.find({ userId: workspaceOwnerId }).distinct('_id');

    // Filter by project(s): projectIds array, or legacy single projectId
    let effectiveProjectIds = workspaceProjectIds;
    const requestedIds = Array.isArray(projectIds) && projectIds.length > 0
      ? projectIds
      : projectId
        ? [projectId]
        : [];
    if (requestedIds.length > 0) {
      const valid = requestedIds.filter((id) =>
        workspaceProjectIds.some((pid) => pid.toString() === id)
      );
      if (valid.length > 0) effectiveProjectIds = valid as unknown as typeof workspaceProjectIds;
    }

    let selectedProjectDocs: Array<{
      _id: unknown;
      title: string;
      clientId: { toString(): string };
      billingMode?: string;
      agreedAmount?: number;
      fixedPriceInvoiceLabel?: string;
      retainerHoursTotal?: number;
      retainerHoursAdjustment?: number;
    }> = [];
    let isFixedPriceInvoice = false;
    let isRetainerReport = false;

    if (requestedIds.length > 0) {
      selectedProjectDocs = await Project.find({
        _id: { $in: requestedIds },
        userId: workspaceOwnerId,
      }).lean();
      if (selectedProjectDocs.length !== requestedIds.length) {
        throw createError('One or more projects not found', 400);
      }
      const modes = new Set(
        selectedProjectDocs.map((p) => p.billingMode ?? 'HOURLY')
      );
      if (modes.size > 1) {
        throw createError(
          'Selected projects use different billing modes. Use one billing mode per invoice, or run separate previews.',
          400
        );
      }
      const mode = [...modes][0];
      if (mode === 'FIXED_PRICE') {
        isFixedPriceInvoice = true;
        const clientIds = new Set(
          selectedProjectDocs.map((p) => p.clientId.toString())
        );
        if (clientIds.size > 1) {
          throw createError(
            'Fixed-price invoicing requires projects for a single client.',
            400
          );
        }
        if (clientId && !clientIds.has(clientId)) {
          throw createError(
            'Selected projects do not match the selected client filter.',
            400
          );
        }
        for (const p of selectedProjectDocs) {
          if (p.agreedAmount === undefined || p.agreedAmount === null) {
            throw createError(
              `Project "${p.title}" is missing an agreed amount for fixed-price billing.`,
              400
            );
          }
        }
      }
      if (mode === 'HOUR_RETAINER') {
        isRetainerReport = true;
        const clientIds = new Set(
          selectedProjectDocs.map((p) => p.clientId.toString())
        );
        if (clientIds.size > 1) {
          throw createError(
            'Hour retainer reports require projects for a single client.',
            400
          );
        }
        if (clientId && !clientIds.has(clientId)) {
          throw createError(
            'Selected projects do not match the selected client filter.',
            400
          );
        }
        for (const p of selectedProjectDocs) {
          const pool = p.retainerHoursTotal;
          if (pool === undefined || pool === null || pool <= 0 || Number.isNaN(Number(pool))) {
            throw createError(
              `Project "${p.title}" is missing retainer hours (block size) for hour-retainer billing.`,
              400
            );
          }
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {
      projectId: { $in: effectiveProjectIds },
      isRunning: false,
      startTime: {
        $gte: parseDateStart(startDate),
        $lte: parseDateEnd(endDate),
      },
    };

    const entries = await TimeEntry.find(query)
      .populate({
        path: 'projectId',
        populate: { path: 'clientId' },
      })
      .populate('taskTypeId');

    // Filter by clientId if specified (need to check after population)
    let filteredEntries = entries;
    if (clientId) {
      filteredEntries = entries.filter((entry) => {
        const project = entry.projectId as unknown as IProject & { clientId: { _id: string } };
        return project?.clientId?._id?.toString() === clientId;
      });
    }

    // Build a cache of client documents (with full Mongoose doc for Map access)
    // We need the actual Mongoose documents to reliably read the Map field
    const clientCache = new Map<string, IClient>();

    // If a specific client is selected, pre-load it
    if (clientId) {
      const c = await Client.findOne({ _id: clientId, userId: workspaceOwnerId });
      if (c) clientCache.set(clientId, c);
    }

    // Fixed-price / retainer preview without client filter: load the project's client for the header
    if ((isFixedPriceInvoice || isRetainerReport) && !clientId && selectedProjectDocs.length > 0) {
      const cid = selectedProjectDocs[0].clientId.toString();
      const inf = await Client.findOne({ _id: cid, userId: workspaceOwnerId });
      if (inf) clientCache.set(cid, inf);
    }

    // For "All Clients" mode, collect unique client IDs from entries and load them
    if (!clientId) {
      const clientIds = new Set<string>();
      for (const entry of filteredEntries) {
        const project = entry.projectId as unknown as IProject & { clientId: { _id: string } };
        const cId = project?.clientId?._id?.toString();
        if (cId) clientIds.add(cId);
      }
      if (clientIds.size > 0) {
        const clients = await Client.find({
          _id: { $in: Array.from(clientIds) },
          userId: workspaceOwnerId,
        });
        for (const c of clients) {
          clientCache.set(c._id.toString(), c);
        }
      }
    }

    // Single client for invoice header: explicit filter, or inferred from fixed-price / retainer selection
    const effectiveInvoiceClientId = clientId
      ? clientId
      : (isFixedPriceInvoice || isRetainerReport) && selectedProjectDocs.length > 0
        ? selectedProjectDocs[0].clientId.toString()
        : undefined;
    const invoiceClient = effectiveInvoiceClientId
      ? clientCache.get(effectiveInvoiceClientId) || null
      : null;

    // Load users for earned rate lookup (entry.userId -> User.earnedRates)
    const entryUserIds = [...new Set(filteredEntries.map((e) => (e as ITimeEntry).userId))];
    const users = await User.find({ auth0Id: { $in: entryUserIds } }).lean();
    const userMap = new Map(users.map((u) => [u.auth0Id, u]));

    // Group entries by task type (with earned amount tracking)
    const lineItems = new Map<
      string,
      {
        taskTypeName: string;
        taskTypeColor: string;
        baseRate: number;
        discount: number;
        effectiveRate: number;
        hours: number;
        amount: number;
        earnedAmount: number;
        descriptions: string[];
      }
    >();

    // Per-entry cost breakdown for detailed view
    const costBreakdown: Array<{
      userName: string;
      taskTypeName: string;
      hours: number;
      billed: number;
      earned: number;
      margin: number;
    }> = [];

    for (const entry of filteredEntries) {
      const taskType = entry.taskTypeId as unknown as ITaskType;
      if (!taskType) continue;

      // Resolve the client for THIS entry (each entry may belong to a different client)
      const project = entry.projectId as unknown as IProject & { clientId: { _id: string } };
      const entryClientId = project?.clientId?._id?.toString();
      const entryClient = entryClientId ? clientCache.get(entryClientId) || null : null;

      const taskTypeKey = taskType._id.toString();
      const discount = getDiscountPercent(entryClient, taskTypeKey);
      const clampedDiscount = Math.min(100, Math.max(0, discount));
      const effectiveRate = getEffectiveRate(taskType, entryClient);
      const hours = (entry as ITimeEntry).duration / 3600;
      const amount = hours * effectiveRate;

      const entryUser = userMap.get((entry as ITimeEntry).userId);
      const earnedRate = entryUser?.earnedRates?.[taskTypeKey] ?? 0;
      const earnedAmount = hours * (typeof earnedRate === 'number' ? earnedRate : 0);
      const margin = amount - earnedAmount;

      costBreakdown.push({
        userName: entryUser?.name ?? 'Unknown',
        taskTypeName: taskType.name,
        hours,
        billed: amount,
        earned: earnedAmount,
        margin,
      });

      // When grouping by task type, we also need to account for different
      // clients having different discounts on the same task type.
      // Use a composite key of taskTypeId + clientId for accurate grouping.
      const groupKey = clientId
        ? taskTypeKey  // Single client: group by task type only
        : `${taskTypeKey}:${entryClientId || 'unknown'}`; // Multi-client: group by task+client

      if (!lineItems.has(groupKey)) {
        lineItems.set(groupKey, {
          taskTypeName: taskType.name,
          taskTypeColor: taskType.color,
          baseRate: taskType.rate,
          discount: clampedDiscount,
          effectiveRate,
          hours: 0,
          amount: 0,
          earnedAmount: 0,
          descriptions: [],
        });
      }

      const item = lineItems.get(groupKey)!;
      item.hours += hours;
      item.amount += amount;
      item.earnedAmount += earnedAmount;
      if ((entry as ITimeEntry).description) {
        item.descriptions.push((entry as ITimeEntry).description!);
      }
    }

    // Round values
    const items = Array.from(lineItems.values()).map((item) => ({
      ...item,
      hours: Math.round(item.hours * 100) / 100,
      amount: Math.round(item.amount * 100) / 100,
      earnedAmount: Math.round(item.earnedAmount * 100) / 100,
      isFixedCost: false,
    }));

    // Query fixed-cost line items for the same filters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lineItemQuery: any = {
      userId: workspaceOwnerId,
      date: {
        $gte: parseDateStart(startDate),
        $lte: parseDateEnd(endDate),
      },
    };
    if (clientId) lineItemQuery.clientId = clientId;

    // Filter by selected projects: include line items assigned to one of
    // the selected projects OR line items with no project (client-level charges)
    if (requestedIds.length > 0) {
      lineItemQuery.$or = [
        { projectId: { $in: requestedIds } },
        { projectId: { $exists: false } },
        { projectId: null },
      ];
    }

    const fixedCostItems = await LineItem.find(lineItemQuery)
      .populate('projectId', 'title clientId')
      .sort({ date: -1 });

    // Scope ad-hoc line items: fixed-price selection always uses that project's client;
    // otherwise multi-client "All" mode uses clients seen in time entries
    let filteredFixedItems = fixedCostItems;
    if ((isFixedPriceInvoice || isRetainerReport) && selectedProjectDocs.length > 0) {
      const cid = selectedProjectDocs[0].clientId.toString();
      filteredFixedItems = fixedCostItems.filter(
        (fi) => fi.clientId.toString() === cid
      );
    } else if (!clientId && filteredEntries.length > 0) {
      const entryClientIds = new Set<string>();
      for (const entry of filteredEntries) {
        const project = entry.projectId as unknown as IProject & { clientId: { _id: string } };
        const cId = project?.clientId?._id?.toString();
        if (cId) entryClientIds.add(cId);
      }
      filteredFixedItems = fixedCostItems.filter((fi) =>
        entryClientIds.has(fi.clientId.toString())
      );
    }

    const fixedItems = filteredFixedItems.map((fi) => ({
      taskTypeName: fi.category || 'Fixed Cost',
      taskTypeColor: '#6B7280',
      baseRate: 0,
      discount: 0,
      effectiveRate: 0,
      hours: 0,
      amount: Math.round(fi.amount * 100) / 100,
      earnedAmount: 0,
      descriptions: [fi.description],
      isFixedCost: true,
    }));

    const tmEarnedUnrounded = Array.from(lineItems.values()).reduce(
      (s, item) => s + item.earnedAmount,
      0
    );
    const tmHoursUnrounded = Array.from(lineItems.values()).reduce(
      (s, item) => s + item.hours,
      0
    );

    let allItems = [...items, ...fixedItems];
    let invoiceKind: 'HOURLY' | 'FIXED_PRICE' | 'RETAINER_REPORT' = 'HOURLY';

    let total = Math.round(
      allItems.reduce((sum, item) => sum + item.amount, 0) * 100
    ) / 100;

    let totalHours = Math.round(tmHoursUnrounded * 100) / 100;

    let totalEarned = Math.round(tmEarnedUnrounded * 100) / 100;

    let totalMargin = Math.round((total - totalEarned) * 100) / 100;

    if (isFixedPriceInvoice && selectedProjectDocs.length > 0) {
      invoiceKind = 'FIXED_PRICE';
      const projectFeeLines = selectedProjectDocs.map((p) => {
        const amt = Math.round(Number(p.agreedAmount) * 100) / 100;
        const label = (p.fixedPriceInvoiceLabel?.trim() || p.title) as string;
        return {
          taskTypeName: label,
          taskTypeColor: '#0d9488',
          baseRate: 0,
          discount: 0,
          effectiveRate: 0,
          hours: 0,
          amount: amt,
          earnedAmount: 0,
          descriptions: [
            `Agreed project fee (${String(startDate).slice(0, 10)} – ${String(endDate).slice(0, 10)})`,
          ],
          isFixedCost: false,
          isAgreedProjectFee: true,
        };
      });
      allItems = [...projectFeeLines, ...fixedItems];
      const feesTotal = projectFeeLines.reduce((s, x) => s + x.amount, 0);
      const fixedSum = fixedItems.reduce((s, x) => s + x.amount, 0);
      total = Math.round((feesTotal + fixedSum) * 100) / 100;
      totalHours = Math.round(tmHoursUnrounded * 100) / 100;
      totalEarned = Math.round(tmEarnedUnrounded * 100) / 100;
      totalMargin = Math.round((total - totalEarned) * 100) / 100;
    }

    let retainerSummary:
      | {
          projects: Array<{
            projectId: string;
            title: string;
            poolHours: number;
            adjustmentHours: number;
            consumedHoursAllTime: number;
            remainingHours: number;
          }>;
        }
      | undefined;

    if (isRetainerReport && selectedProjectDocs.length > 0) {
      invoiceKind = 'RETAINER_REPORT';

      const allTimeEntries = await TimeEntry.find({
        projectId: { $in: requestedIds },
        isRunning: false,
      })
        .select('duration projectId')
        .lean();

      const consumedByProject = new Map<string, number>();
      for (const e of allTimeEntries) {
        const pid = e.projectId.toString();
        const h = (e.duration || 0) / 3600;
        consumedByProject.set(pid, (consumedByProject.get(pid) || 0) + h);
      }

      retainerSummary = {
        projects: selectedProjectDocs.map((p) => {
          const pid = (p._id as { toString(): string }).toString();
          const consumedRaw = consumedByProject.get(pid) || 0;
          const consumed = Math.round(consumedRaw * 100) / 100;
          const adj = Number(p.retainerHoursAdjustment ?? 0);
          const pool = Number(p.retainerHoursTotal) + adj;
          const remaining = Math.round((pool - consumed) * 100) / 100;
          return {
            projectId: pid,
            title: p.title,
            poolHours: Number(p.retainerHoursTotal),
            adjustmentHours: adj,
            consumedHoursAllTime: consumed,
            remainingHours: remaining,
          };
        }),
      };

      const basePeriodItems =
        items.length > 0
          ? items
          : [
              {
                taskTypeName: 'Activity in period',
                taskTypeColor: '#9ca3af',
                baseRate: 0,
                discount: 0,
                effectiveRate: 0,
                hours: 0,
                amount: 0,
                earnedAmount: 0,
                descriptions: ['No time entries in this date range'],
                isFixedCost: false,
              },
            ];

      const retainerPeriodLines = basePeriodItems.map((item) => ({
        ...item,
        amount: 0,
        baseRate: 0,
        discount: 0,
        effectiveRate: 0,
        earnedAmount: 0,
        isRetainerUtilizationRow: true,
      }));

      allItems = [...retainerPeriodLines, ...fixedItems];
      const fixedSum = fixedItems.reduce((s, x) => s + x.amount, 0);
      total = Math.round(fixedSum * 100) / 100;
      totalHours = Math.round(tmHoursUnrounded * 100) / 100;
      totalEarned = Math.round(tmEarnedUnrounded * 100) / 100;
      totalMargin = Math.round((total - totalEarned) * 100) / 100;
    }

    const roundedBreakdown = costBreakdown.map((r) => ({
      ...r,
      hours: Math.round(r.hours * 100) / 100,
      billed: Math.round(r.billed * 100) / 100,
      earned: Math.round(r.earned * 100) / 100,
      margin: Math.round(r.margin * 100) / 100,
    }));

    // Company info from workspace owner's site config (for invoices)
    const siteConfig = await SiteConfig.findOne({ userId: workspaceOwnerId })
      .select('companyName companyAddress companyPhone companyEmail')
      .lean();
    const companyInfo = siteConfig
      ? {
          name: siteConfig.companyName,
          address: siteConfig.companyAddress,
          phone: siteConfig.companyPhone,
          email: siteConfig.companyEmail,
        }
      : undefined;

    // Serialize client with full fields (address, businessEntity, paymentPreference) for invoice
    const clientForInvoice = invoiceClient
      ? {
          _id: invoiceClient._id.toString(),
          name: invoiceClient.name,
          company: invoiceClient.company,
          email: invoiceClient.email,
          businessEntity: (invoiceClient as IClient & { businessEntity?: string }).businessEntity,
          address: (invoiceClient as IClient & { address?: string }).address,
          paymentPreference: (invoiceClient as IClient & { paymentPreference?: string }).paymentPreference || 'MAILED',
        }
      : undefined;

    res.json({
      client: clientForInvoice || undefined,
      companyInfo: companyInfo?.name || companyInfo?.address || companyInfo?.phone || companyInfo?.email ? companyInfo : undefined,
      items: allItems,
      total,
      totalHours,
      totalEarned,
      totalMargin,
      costBreakdown: roundedBreakdown,
      entryCount: filteredEntries.length,
      lineItemCount: fixedItems.length,
      dateRange: { start: startDate, end: endDate },
      invoiceKind,
      retainerSummary,
    });
  })
);

// GET /api/reports/summary - Get summary stats (all workspace entries)
router.get(
  '/summary',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const { startDate, endDate } = req.query;

    const projectIds = await Project.find({ userId: workspaceOwnerId }).distinct('_id');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {
      projectId: { $in: projectIds },
      isRunning: false,
    };

    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) {
        query.startTime.$gte = parseDateStart(startDate as string);
      }
      if (endDate) {
        query.startTime.$lte = parseDateEnd(endDate as string);
      }
    }

    const entries = await TimeEntry.find(query).lean();

    const totalSeconds = entries.reduce((sum, e) => sum + (e.duration || 0), 0);
    const totalHours = Math.round((totalSeconds / 3600) * 100) / 100;

    res.json({
      totalEntries: entries.length,
      totalHours,
      totalSeconds,
    });
  })
);

export default router;
