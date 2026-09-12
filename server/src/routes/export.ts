import { Router, Response } from 'express';
import { checkJwt, AuthRequest, extractUserId, getWorkspaceOwnerId, requireAdmin } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import {
  TimeEntry,
  Client,
  LineItem,
  ITimeEntry,
  IProject,
  ITaskType,
  IProjectTask,
  IClient,
  Project,
  TaskType,
  ProjectTask,
  User,
  Invoice,
  FilterPreset,
} from '../models';
import {
  parseDateStart,
  parseDateEnd,
  getEffectiveRate,
  getDiscountPercent,
  calculateAmount,
  secondsToHours,
} from '../utils/calculations';
import {
  sanitizeReportCsvColumns,
  REPORT_CSV_HEADERS,
  type ReportCsvColumnId,
} from '../utils/reportColumns';

const router = Router();

router.use(checkJwt);
router.use(requireAdmin);

function normalizeIdList(multi: unknown, single?: unknown): string[] {
  if (Array.isArray(multi) && multi.length > 0) {
    return multi.map(String).filter(Boolean);
  }
  if (typeof multi === 'string' && multi.trim()) {
    return multi.split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (typeof single === 'string' && single.trim()) {
    return [single.trim()];
  }
  return [];
}

function formatDurationHuman(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

function billingModeLabel(mode?: string): string {
  if (mode === 'FIXED_PRICE') return 'Fixed price';
  if (mode === 'HOUR_RETAINER') return 'Hour retainer';
  return 'Hourly';
}

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

function formatClock(value?: Date): string {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function csvEscape(cell: string): string {
  return `"${String(cell).replace(/"/g, '""')}"`;
}

function invoiceNumberOf(entry: ITimeEntry): string {
  const inv = entry.invoiceId as unknown;
  if (!inv) return '';
  if (typeof inv === 'object' && inv !== null && 'invoiceNumber' in inv) {
    return String((inv as { invoiceNumber?: string }).invoiceNumber || '');
  }
  return '';
}

function serializeClients<T extends { taskDiscounts?: unknown }>(clients: T[]): T[] {
  return clients.map((c) => ({
    ...c,
    taskDiscounts: c.taskDiscounts instanceof Map
      ? Object.fromEntries(c.taskDiscounts)
      : c.taskDiscounts,
  }));
}

const USER_BACKUP_FIELDS =
  'auth0Id email name nickname picture role workspaceOwnerId clientId disciplines disciplineTasks availability bio payoutPreference earnedRates status invitedBy createdAt updatedAt';

function backupFilename(presetName?: string): string {
  const day = new Date().toISOString().split('T')[0];
  if (!presetName) return `askanddeliver-backup-${day}.json`;
  const slug = presetName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'preset';
  return `askanddeliver-backup-${slug}-${day}.json`;
}

// POST /api/export/backup - Full workspace JSON, or a filter-preset related graph
router.post(
  '/backup',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const { presetId, startDate, endDate } = req.body || {};
    const hasStart = typeof startDate === 'string' && startDate.trim().length > 0;
    const hasEnd = typeof endDate === 'string' && endDate.trim().length > 0;
    if (hasStart !== hasEnd) {
      throw createError('Start date and end date are both required, or omit both for all time', 400);
    }

    if (presetId) {
      const preset = await FilterPreset.findOne({ _id: String(presetId), userId }).lean();
      if (!preset) throw createError('Preset not found', 404);

      const requestedClientIds = (preset.clientIds || []).map(String).filter(Boolean);
      const requestedBillingModes = (preset.billingModes || []).filter(
        (m): m is 'HOURLY' | 'FIXED_PRICE' | 'HOUR_RETAINER' =>
          m === 'HOURLY' || m === 'FIXED_PRICE' || m === 'HOUR_RETAINER'
      );
      const requestedMemberIds = (preset.memberAuth0Ids || []).map(String).filter(Boolean);
      const requestedProjectIds = (preset.projectIds || []).map(String).filter(Boolean);

      let selectedProjects = await Project.find({
        userId: workspaceOwnerId,
        ...(requestedProjectIds.length > 0 ? { _id: { $in: requestedProjectIds } } : {}),
      }).lean();

      if (requestedClientIds.length > 0) {
        const allowed = new Set(requestedClientIds);
        selectedProjects = selectedProjects.filter((p) => allowed.has(p.clientId.toString()));
      }
      if (requestedBillingModes.length > 0) {
        const allowedModes = new Set(requestedBillingModes);
        selectedProjects = selectedProjects.filter((p) =>
          allowedModes.has((p.billingMode ?? 'HOURLY') as 'HOURLY' | 'FIXED_PRICE' | 'HOUR_RETAINER')
        );
      }

      const scopedProjectIds = selectedProjects.map((p) => p._id);
      const clientIdSet = new Set(
        requestedClientIds.length > 0
          ? requestedClientIds
          : selectedProjects.map((p) => p.clientId.toString())
      );

      const clients = clientIdSet.size
        ? await Client.find({
            userId: workspaceOwnerId,
            _id: { $in: Array.from(clientIdSet) },
          }).lean()
        : [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entryQuery: any = {
        projectId: { $in: scopedProjectIds },
      };
      if (requestedMemberIds.length > 0) {
        entryQuery.userId = requestedMemberIds.length === 1
          ? requestedMemberIds[0]
          : { $in: requestedMemberIds };
      }
      if (hasStart || hasEnd) {
        entryQuery.startTime = {};
        if (hasStart) entryQuery.startTime.$gte = parseDateStart(startDate);
        if (hasEnd) entryQuery.startTime.$lte = parseDateEnd(endDate);
      } else if (preset.startDate || preset.endDate) {
        entryQuery.startTime = {};
        if (preset.startDate) entryQuery.startTime.$gte = parseDateStart(preset.startDate);
        if (preset.endDate) entryQuery.startTime.$lte = parseDateEnd(preset.endDate);
      }

      const entries = scopedProjectIds.length === 0
        ? []
        : await TimeEntry.find(entryQuery).lean();

      const taskTypeIds = [
        ...new Set(entries.map((e) => e.taskTypeId?.toString()).filter(Boolean)),
      ];
      const entryUserIds = [...new Set(entries.map((e) => e.userId).filter(Boolean))];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lineItemQuery: any = { userId: workspaceOwnerId };
      if (clientIdSet.size > 0) lineItemQuery.clientId = { $in: Array.from(clientIdSet) };
      if (requestedProjectIds.length > 0) {
        lineItemQuery.$or = [
          { projectId: { $in: requestedProjectIds } },
          { projectId: { $exists: false } },
          { projectId: null },
        ];
      }
      if (entryQuery.startTime) {
        lineItemQuery.date = { ...entryQuery.startTime };
      }

      const scopedClientObjectIds = clients.map((c) => c._id);
      const invoiceOr: Record<string, unknown>[] = [];
      if (scopedClientObjectIds.length > 0) {
        invoiceOr.push({ clientId: { $in: scopedClientObjectIds } });
      }
      if (scopedProjectIds.length > 0) {
        invoiceOr.push({ projectIds: { $in: scopedProjectIds } });
      }

      const [taskTypes, projectTasks, lineItems, invoices, users] = await Promise.all([
        taskTypeIds.length
          ? TaskType.find({ userId: workspaceOwnerId, _id: { $in: taskTypeIds } }).lean()
          : Promise.resolve([]),
        scopedProjectIds.length
          ? ProjectTask.find({
              userId: workspaceOwnerId,
              projectId: { $in: scopedProjectIds },
            }).lean()
          : Promise.resolve([]),
        LineItem.find(lineItemQuery).lean(),
        invoiceOr.length
          ? Invoice.find({ userId: workspaceOwnerId, $or: invoiceOr }).lean()
          : Promise.resolve([]),
        entryUserIds.length
          ? User.find({ auth0Id: { $in: entryUserIds } }).select(USER_BACKUP_FIELDS).lean()
          : Promise.resolve([]),
      ]);

      const backup = {
        exportedAt: new Date().toISOString(),
        workspaceOwnerId,
        scope: 'preset' as const,
        preset: {
          _id: preset._id,
          name: preset.name,
          kind: preset.kind,
        },
        clients: serializeClients(clients),
        projects: selectedProjects,
        taskTypes,
        projectTasks,
        timeEntries: entries,
        lineItems,
        invoices,
        filterPresets: [preset],
        users,
      };

      const filename = backupFilename(preset.name);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.json(backup);
      return;
    }

    const projectIds = await Project.find({ userId: workspaceOwnerId }).distinct('_id');

    const [clients, projects, taskTypes, entries, lineItems, projectTasks, invoices, filterPresets, users] =
      await Promise.all([
        Client.find({ userId: workspaceOwnerId }).lean(),
        Project.find({ userId: workspaceOwnerId }).lean(),
        TaskType.find({ userId: workspaceOwnerId }).lean(),
        TimeEntry.find({ projectId: { $in: projectIds } }).lean(),
        LineItem.find({ userId: workspaceOwnerId }).lean(),
        ProjectTask.find({ userId: workspaceOwnerId }).lean(),
        Invoice.find({ userId: workspaceOwnerId }).lean(),
        FilterPreset.find({ userId }).lean(),
        User.find({
          $or: [{ auth0Id: workspaceOwnerId }, { workspaceOwnerId }],
        })
          .select(USER_BACKUP_FIELDS)
          .lean(),
      ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      workspaceOwnerId,
      scope: 'full' as const,
      preset: null,
      clients: serializeClients(clients),
      projects,
      taskTypes,
      projectTasks,
      timeEntries: entries,
      lineItems,
      invoices,
      filterPresets,
      users,
    };

    const filename = backupFilename();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.json(backup);
  })
);

// POST /api/export/csv - Export time entries as CSV (workspace-scoped)
router.post(
  '/csv',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const {
      clientId,
      clientIds,
      projectId,
      projectIds,
      startDate,
      endDate,
      billingModes,
      memberAuth0Ids,
      columns,
      includeEntryDescriptions,
    } = req.body;

    const requestedClientIds = normalizeIdList(clientIds, clientId);
    const hasClientFilter = requestedClientIds.length > 0;
    const requestedBillingModes = normalizeIdList(billingModes).filter(
      (m): m is 'HOURLY' | 'FIXED_PRICE' | 'HOUR_RETAINER' =>
        m === 'HOURLY' || m === 'FIXED_PRICE' || m === 'HOUR_RETAINER'
    );
    const requestedMemberIds = normalizeIdList(memberAuth0Ids);
    const includeDescriptions = includeEntryDescriptions !== false;
    const columnIds = sanitizeReportCsvColumns(columns).filter(
      (id) => id !== 'description' || includeDescriptions
    );

    const workspaceProjectIds = await Project.find({ userId: workspaceOwnerId }).distinct('_id');

    const requestedIds = Array.isArray(projectIds) && projectIds.length > 0
      ? projectIds.map(String).filter(Boolean)
      : projectId
        ? [String(projectId)]
        : [];
    let effectiveIds = requestedIds.length > 0
      ? requestedIds.filter((id) => workspaceProjectIds.some((pid) => pid.toString() === id))
      : workspaceProjectIds.map((id) => id.toString());

    if (requestedBillingModes.length > 0) {
      const allowedModes = new Set(requestedBillingModes);
      const docs = await Project.find({ _id: { $in: effectiveIds } }).select('billingMode').lean();
      effectiveIds = docs
        .filter((p) => allowedModes.has((p.billingMode ?? 'HOURLY') as 'HOURLY' | 'FIXED_PRICE' | 'HOUR_RETAINER'))
        .map((p) => p._id.toString());
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {
      projectId: { $in: effectiveIds },
      isRunning: false,
    };

    if (requestedMemberIds.length > 0) {
      query.userId = requestedMemberIds.length === 1
        ? requestedMemberIds[0]
        : { $in: requestedMemberIds };
    }

    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) {
        query.startTime.$gte = parseDateStart(startDate);
      }
      if (endDate) {
        query.startTime.$lte = parseDateEnd(endDate);
      }
    }

    const entries = effectiveIds.length === 0
      ? []
      : await TimeEntry.find(query)
        .populate({
          path: 'projectId',
          populate: { path: 'clientId' },
        })
        .populate('taskTypeId')
        .populate('projectTaskId')
        .populate({ path: 'invoiceId', select: 'invoiceNumber' })
        .sort({ startTime: -1 });

    let filteredEntries = entries;
    if (hasClientFilter) {
      const allowed = new Set(requestedClientIds);
      filteredEntries = entries.filter((entry) => {
        const project = entry.projectId as unknown as IProject & { clientId: { _id: string; name: string } };
        const cid = project?.clientId?._id?.toString();
        return Boolean(cid && allowed.has(cid));
      });
    }

    const clientCache = new Map<string, IClient>();
    const idsToLoad = new Set<string>(requestedClientIds);
    for (const entry of filteredEntries) {
      const proj = entry.projectId as unknown as IProject & { clientId: { _id: string } };
      const cid = proj?.clientId?._id?.toString();
      if (cid) idsToLoad.add(cid);
    }
    if (idsToLoad.size > 0) {
      const clients = await Client.find({
        _id: { $in: Array.from(idsToLoad) },
        userId: workspaceOwnerId,
      });
      for (const c of clients) {
        clientCache.set(c._id.toString(), c);
      }
    }

    const entryUserIds = [...new Set(filteredEntries.map((e) => (e as ITimeEntry).userId).filter(Boolean))];
    const users = entryUserIds.length > 0
      ? await User.find({ auth0Id: { $in: entryUserIds } }).lean()
      : [];
    const userMap = new Map(users.map((u) => [u.auth0Id, u]));

    const cellFor = (entry: (typeof filteredEntries)[number], column: ReportCsvColumnId): string => {
      const timed = entry as ITimeEntry;
      const project = entry.projectId as unknown as IProject & {
        clientId: { _id: string; name: string };
        billingMode?: string;
      };
      const taskType = entry.taskTypeId as unknown as ITaskType | null;
      const projectTask = entry.projectTaskId as unknown as IProjectTask | null;
      const entryClientId = project?.clientId?._id?.toString();
      const entryClient = entryClientId ? clientCache.get(entryClientId) || null : null;
      const hours = secondsToHours(timed.duration);
      const effectiveRate = taskType ? getEffectiveRate(taskType, entryClient) : 0;
      const billed = taskType ? calculateAmount(timed.duration, effectiveRate) : 0;
      const member = timed.userId ? userMap.get(timed.userId) : undefined;
      const taskTypeKey = taskType?._id?.toString() || '';
      const earnedRate = member?.earnedRates?.[taskTypeKey] ?? 0;
      const earned = hours * (typeof earnedRate === 'number' ? earnedRate : 0);
      const discount = taskType ? getDiscountPercent(entryClient, taskTypeKey) : 0;

      switch (column) {
        case 'date':
          return new Date(timed.startTime).toLocaleDateString();
        case 'start':
          return formatClock(timed.startTime);
        case 'end':
          return formatClock(timed.endTime);
        case 'hours':
          return hours.toFixed(2);
        case 'durationHuman':
          return formatDurationHuman(timed.duration);
        case 'member':
          return member?.name || '';
        case 'client':
          return project?.clientId?.name || 'Unknown';
        case 'project':
          return project?.title || 'Unknown';
        case 'billingMode':
          return billingModeLabel(project?.billingMode);
        case 'projectTask':
          return projectTask?.title || '';
        case 'taskType':
          return taskType?.name || 'Unknown';
        case 'description':
          return timed.description || '';
        case 'baseRate':
          return money(taskType?.rate || 0);
        case 'discount':
          return `${discount}%`;
        case 'effectiveRate':
          return money(effectiveRate);
        case 'billed':
          return money(billed);
        case 'earnedRate':
          return money(typeof earnedRate === 'number' ? earnedRate : 0);
        case 'earned':
          return money(Math.round(earned * 100) / 100);
        case 'margin':
          return money(Math.round((billed - earned) * 100) / 100);
        case 'invoiced':
          return timed.invoiceId ? 'Yes' : 'No';
        case 'invoiceNumber':
          return invoiceNumberOf(timed);
        case 'running':
          return timed.isRunning ? 'Yes' : 'No';
        default:
          return '';
      }
    };

    const rows = filteredEntries.map((entry) => columnIds.map((col) => cellFor(entry, col)));

    // Query fixed-cost line items for the same period
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lineItemQuery: any = { userId: workspaceOwnerId };
    if (hasClientFilter) lineItemQuery.clientId = { $in: requestedClientIds };
    if (requestedIds.length > 0) {
      lineItemQuery.$or = [
        { projectId: { $in: requestedIds } },
        { projectId: { $exists: false } },
        { projectId: null },
      ];
    }
    if (startDate || endDate) {
      lineItemQuery.date = {};
      if (startDate) lineItemQuery.date.$gte = parseDateStart(startDate);
      if (endDate) lineItemQuery.date.$lte = parseDateEnd(endDate);
    }

    const fixedItems = await LineItem.find(lineItemQuery)
      .populate('clientId', 'name')
      .populate('projectId', 'title')
      .sort({ date: -1 });

    const fixedRows = fixedItems.map((fi) => {
      const fiClient = fi.clientId as unknown as { name: string } | null;
      const fiProject = fi.projectId as unknown as { title: string } | null;
      const cells: Record<ReportCsvColumnId, string> = {
        date: new Date(fi.date).toLocaleDateString(),
        start: '',
        end: '',
        hours: '',
        durationHuman: '',
        member: '',
        client: fiClient?.name || 'Unknown',
        project: fiProject?.title || '',
        billingMode: '',
        projectTask: '',
        taskType: fi.category || 'Fixed Cost',
        description: fi.description,
        baseRate: '',
        discount: '',
        effectiveRate: '',
        billed: money(fi.amount),
        earnedRate: '',
        earned: '',
        margin: '',
        invoiced: fi.invoiceId ? 'Yes' : 'No',
        invoiceNumber: '',
        running: '',
      };
      return columnIds.map((col) => cells[col]);
    });

    const csv = [
      columnIds.map((id) => REPORT_CSV_HEADERS[id]),
      ...rows,
      ...fixedRows,
    ]
      .map((row) => row.map((cell) => csvEscape(cell)).join(','))
      .join('\n');

    const hasDates = Boolean(startDate || endDate);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      hasDates ? 'attachment; filename=timesheet.csv' : 'attachment; filename=timesheet-all-time.csv'
    );
    res.send(csv);
  })
);

export default router;
