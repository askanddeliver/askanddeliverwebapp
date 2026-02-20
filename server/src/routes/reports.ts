import { Router, Response } from 'express';
import { checkJwt, AuthRequest, extractUserId } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { TimeEntry, Client, IClient, ITimeEntry, IProject, ITaskType, LineItem } from '../models';

const router = Router();

// All routes require authentication
router.use(checkJwt);

/**
 * Safely read a discount value from a client's taskDiscounts field.
 * Handles both Mongoose Map objects and plain objects.
 */
function getDiscount(client: IClient | null, taskTypeId: string): number {
  if (!client || !client.taskDiscounts) return 0;

  // Try Mongoose Map .get() first
  if (typeof client.taskDiscounts.get === 'function') {
    return client.taskDiscounts.get(taskTypeId) || 0;
  }

  // Fallback: plain object access (e.g. from .lean() or JSON)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const discounts = client.taskDiscounts as any;
  return discounts[taskTypeId] || 0;
}

// POST /api/reports/generate-invoice - Generate invoice data
router.post(
  '/generate-invoice',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { clientId, projectId, startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      throw createError('Start date and end date are required', 400);
    }

    // Build query — parse dates with explicit time to avoid UTC/local mismatch
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {
      userId,
      isRunning: false,
      startTime: {
        $gte: new Date(startDate + 'T00:00:00'),
        $lte: new Date(endDate + 'T23:59:59.999'),
      },
    };

    if (projectId) {
      query.projectId = projectId;
    }

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
      const c = await Client.findOne({ _id: clientId, userId });
      if (c) clientCache.set(clientId, c);
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
          userId,
        });
        for (const c of clients) {
          clientCache.set(c._id.toString(), c);
        }
      }
    }

    // Determine the single client to show on the invoice header (only when filtered)
    const invoiceClient = clientId ? clientCache.get(clientId) || null : null;

    // Group entries by task type
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
        descriptions: string[];
      }
    >();

    for (const entry of filteredEntries) {
      const taskType = entry.taskTypeId as unknown as ITaskType;
      if (!taskType) continue;

      // Resolve the client for THIS entry (each entry may belong to a different client)
      const project = entry.projectId as unknown as IProject & { clientId: { _id: string } };
      const entryClientId = project?.clientId?._id?.toString();
      const entryClient = entryClientId ? clientCache.get(entryClientId) || null : null;

      const taskTypeKey = taskType._id.toString();
      const discount = getDiscount(entryClient, taskTypeKey);
      const clampedDiscount = Math.min(100, Math.max(0, discount));
      const effectiveRate = taskType.rate * (1 - clampedDiscount / 100);
      const hours = (entry as ITimeEntry).duration / 3600;
      const amount = hours * effectiveRate;

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
          descriptions: [],
        });
      }

      const item = lineItems.get(groupKey)!;
      item.hours += hours;
      item.amount += amount;
      if ((entry as ITimeEntry).description) {
        item.descriptions.push((entry as ITimeEntry).description!);
      }
    }

    // Round values
    const items = Array.from(lineItems.values()).map((item) => ({
      ...item,
      hours: Math.round(item.hours * 100) / 100,
      amount: Math.round(item.amount * 100) / 100,
      isFixedCost: false,
    }));

    // Query fixed-cost line items for the same filters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lineItemQuery: any = {
      userId,
      date: {
        $gte: new Date(startDate + 'T00:00:00'),
        $lte: new Date(endDate + 'T23:59:59.999'),
      },
    };
    if (clientId) lineItemQuery.clientId = clientId;
    if (projectId) lineItemQuery.projectId = projectId;

    const fixedCostItems = await LineItem.find(lineItemQuery)
      .populate('projectId', 'title clientId')
      .sort({ date: -1 });

    // If no specific client filter, but we do have entries, still include
    // line items that belong to clients represented in the entries
    let filteredFixedItems = fixedCostItems;
    if (!clientId && filteredEntries.length > 0) {
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
      descriptions: [fi.description],
      isFixedCost: true,
    }));

    const allItems = [...items, ...fixedItems];

    const total = Math.round(
      allItems.reduce((sum, item) => sum + item.amount, 0) * 100
    ) / 100;

    const totalHours = Math.round(
      items.reduce((sum, item) => sum + item.hours, 0) * 100
    ) / 100;

    res.json({
      client: invoiceClient || undefined,
      items: allItems,
      total,
      totalHours,
      entryCount: filteredEntries.length,
      lineItemCount: fixedItems.length,
      dateRange: { start: startDate, end: endDate },
    });
  })
);

// GET /api/reports/summary - Get summary stats
router.get(
  '/summary',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { startDate, endDate } = req.query;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { userId, isRunning: false };

    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) {
        query.startTime.$gte = new Date((startDate as string) + 'T00:00:00');
      }
      if (endDate) {
        query.startTime.$lte = new Date((endDate as string) + 'T23:59:59.999');
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
