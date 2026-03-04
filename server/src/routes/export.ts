import { Router, Response } from 'express';
import { checkJwt, AuthRequest, extractUserId, getWorkspaceOwnerId, requireAdmin } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { TimeEntry, Client, LineItem, ITimeEntry, IProject, ITaskType, IProjectTask, Project, TaskType, ProjectTask } from '../models';

const router = Router();

router.use(checkJwt);
router.use(requireAdmin);

// POST /api/export/backup - Export all workspace data as JSON (data protection/backup)
router.post(
  '/backup',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const projectIds = await Project.find({ userId: workspaceOwnerId }).distinct('_id');

    const [clients, projects, taskTypes, entries, lineItems, projectTasks] = await Promise.all([
      Client.find({ userId: workspaceOwnerId }).lean(),
      Project.find({ userId: workspaceOwnerId }).lean(),
      TaskType.find({ userId: workspaceOwnerId }).lean(),
      TimeEntry.find({ projectId: { $in: projectIds } }).lean(),
      LineItem.find({ userId: workspaceOwnerId }).lean(),
      ProjectTask.find({ userId: workspaceOwnerId }).lean(),
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      workspaceOwnerId,
      clients: clients.map((c) => ({
        ...c,
        taskDiscounts: c.taskDiscounts instanceof Map
          ? Object.fromEntries(c.taskDiscounts)
          : c.taskDiscounts,
      })),
      projects,
      taskTypes,
      projectTasks,
      timeEntries: entries,
      lineItems,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=askanddeliver-backup-${new Date().toISOString().split('T')[0]}.json`);
    res.json(backup);
  })
);

// POST /api/export/csv - Export time entries as CSV (all workspace entries)
router.post(
  '/csv',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const { clientId, projectId, projectIds, startDate, endDate } = req.body;

    const workspaceProjectIds = await Project.find({ userId: workspaceOwnerId }).distinct('_id');

    const requestedIds = Array.isArray(projectIds) && projectIds.length > 0
      ? projectIds
      : projectId
        ? [projectId]
        : [];
    const effectiveProjectIds = requestedIds.length > 0
      ? requestedIds.filter((id) => workspaceProjectIds.some((pid) => pid.toString() === id))
      : workspaceProjectIds.map((id) => id.toString());
    const effectiveIds = requestedIds.length > 0 && effectiveProjectIds.length > 0
      ? effectiveProjectIds
      : workspaceProjectIds;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {
      projectId: { $in: effectiveIds },
      isRunning: false,
    };

    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) {
        query.startTime.$gte = new Date(startDate + 'T00:00:00');
      }
      if (endDate) {
        query.startTime.$lte = new Date(endDate + 'T23:59:59.999');
      }
    }

    const entries = await TimeEntry.find(query)
      .populate({
        path: 'projectId',
        populate: { path: 'clientId' },
      })
      .populate('taskTypeId')
      .populate('projectTaskId')
      .sort({ startTime: -1 });

    // Filter by clientId if specified
    let filteredEntries = entries;
    if (clientId) {
      filteredEntries = entries.filter((entry) => {
        const project = entry.projectId as unknown as IProject & { clientId: { _id: string; name: string } };
        return project?.clientId?._id?.toString() === clientId;
      });
    }

    // Get client for discount info
    let client = null;
    if (clientId) {
      client = await Client.findOne({ _id: clientId, userId: workspaceOwnerId });
    }

    const rows = filteredEntries.map((entry) => {
      const project = entry.projectId as unknown as IProject & { clientId: { name: string } };
      const taskType = entry.taskTypeId as unknown as ITaskType;
      const projectTask = entry.projectTaskId as unknown as IProjectTask | null;
      const hours = ((entry as ITimeEntry).duration / 3600).toFixed(2);
      const clientName = project?.clientId?.name || 'Unknown';

      // Calculate effective rate with discount
      let effectiveRate = taskType?.rate || 0;
      if (client && taskType) {
        const discount = client.taskDiscounts?.get(taskType._id.toString()) || 0;
        effectiveRate = taskType.rate * (1 - Math.min(100, Math.max(0, discount)) / 100);
      }

      const amount = (parseFloat(hours) * effectiveRate).toFixed(2);

      return [
        new Date((entry as ITimeEntry).startTime).toLocaleDateString(),
        clientName,
        project?.title || 'Unknown',
        projectTask?.title || '',
        taskType?.name || 'Unknown',
        hours,
        `$${taskType?.rate || 0}`,
        `$${effectiveRate.toFixed(2)}`,
        `$${amount}`,
        (entry as ITimeEntry).description || '',
      ];
    });

    // Query fixed-cost line items for the same period
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lineItemQuery: any = { userId: workspaceOwnerId };
    if (clientId) lineItemQuery.clientId = clientId;
    if (requestedIds.length > 0) {
      lineItemQuery.$or = [
        { projectId: { $in: requestedIds } },
        { projectId: { $exists: false } },
        { projectId: null },
      ];
    }
    if (startDate || endDate) {
      lineItemQuery.date = {};
      if (startDate) lineItemQuery.date.$gte = new Date(startDate + 'T00:00:00');
      if (endDate) lineItemQuery.date.$lte = new Date(endDate + 'T23:59:59.999');
    }

    const fixedItems = await LineItem.find(lineItemQuery)
      .populate('clientId', 'name')
      .populate('projectId', 'title')
      .sort({ date: -1 });

    const fixedRows = fixedItems.map((fi) => {
      const fiClient = fi.clientId as unknown as { name: string } | null;
      const fiProject = fi.projectId as unknown as { title: string } | null;
      return [
        new Date(fi.date).toLocaleDateString(),
        fiClient?.name || 'Unknown',
        fiProject?.title || '',
        '',
        fi.category || 'Fixed Cost',
        '',
        '',
        '',
        `$${fi.amount.toFixed(2)}`,
        fi.description,
      ];
    });

    const csv = [
      ['Date', 'Client', 'Project', 'Project Task', 'Task Type', 'Hours', 'Base Rate', 'Effective Rate', 'Amount', 'Description'],
      ...rows,
      ...fixedRows,
    ]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=timesheet.csv');
    res.send(csv);
  })
);

export default router;
