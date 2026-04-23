import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { checkJwt, AuthRequest, extractUserId, getWorkspaceOwnerId, requireAdmin } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { TimeBlock, TimeEntry, Project, TaskType, ProjectTask } from '../models';
import { parseDateStart, parseDateEnd } from '../utils/calculations';
import { expandTimeBlocksForRange } from '../lib/expandTimeBlocks';

const router = Router();

router.use(checkJwt);
router.use(requireAdmin);

function normalizeStringArray(q: unknown): string[] {
  if (Array.isArray(q)) return q.map(String).filter(Boolean);
  if (typeof q === 'string') return q.split(',').map((s) => s.trim()).filter(Boolean);
  if (q && typeof q === 'object') return Object.values(q as Record<string, unknown>).map(String).filter(Boolean);
  return [];
}

// GET /api/time-blocks?start=&end=&projectIds[]=&kinds[]=
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const { start, end } = req.query;
    if (!start || !end || typeof start !== 'string' || typeof end !== 'string') {
      throw createError('start and end query parameters are required', 400);
    }

    const rangeStart = parseDateStart(start);
    const rangeEnd = parseDateEnd(end);

    const projectIdsRaw = normalizeStringArray(req.query.projectIds ?? req.query['projectIds[]']);
    const kindsRaw = normalizeStringArray(req.query.kinds ?? req.query['kinds[]']);

    const workspaceProjects = await Project.find({ userId: workspaceOwnerId }).distinct('_id');
    const validProjectFilter =
      projectIdsRaw.length > 0
        ? projectIdsRaw.filter(
            (id) =>
              mongoose.Types.ObjectId.isValid(id) &&
              workspaceProjects.some((p) => p.toString() === id)
          )
        : [];

    if (projectIdsRaw.length > 0 && validProjectFilter.length === 0) {
      res.json([]);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {
      userId: workspaceOwnerId,
      recurrenceParentId: null,
      endTime: { $gte: rangeStart },
      startTime: { $lte: rangeEnd },
    };

    if (validProjectFilter.length > 0) {
      query.projectId = { $in: validProjectFilter };
    }

    if (kindsRaw.length > 0) {
      const allowed = ['WORK', 'PERSONAL', 'DOWNTIME', 'MEETING', 'ADMIN'];
      const kinds = kindsRaw.filter((k) => allowed.includes(k));
      if (kinds.length > 0) query.kind = { $in: kinds };
    }

    const docs = await TimeBlock.find(query)
      .populate({ path: 'projectId', populate: { path: 'clientId' } })
      .populate('taskTypeId')
      .populate('projectTaskId')
      .lean();

    const expanded = expandTimeBlocksForRange(docs, rangeStart, rangeEnd);
    res.json(expanded);
  })
);

// GET /api/time-blocks/:id
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const block = await TimeBlock.findOne({
      _id: req.params.id,
      userId: workspaceOwnerId,
    })
      .populate({ path: 'projectId', populate: { path: 'clientId' } })
      .populate('taskTypeId')
      .populate('projectTaskId')
      .lean();

    if (!block) throw createError('Time block not found', 404);
    res.json(block);
  })
);

// POST /api/time-blocks
router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const {
      title,
      startTime,
      endTime,
      kind,
      projectId,
      taskTypeId,
      projectTaskId,
      colorHint,
      recurrenceRule,
      notes,
    } = req.body;

    if (!title || !String(title).trim()) throw createError('Title is required', 400);
    if (!startTime || !endTime) throw createError('startTime and endTime are required', 400);

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw createError('Invalid start or end time', 400);
    }
    if (end <= start) throw createError('endTime must be after startTime', 400);

    const k = kind && ['WORK', 'PERSONAL', 'DOWNTIME', 'MEETING', 'ADMIN'].includes(kind) ? kind : 'WORK';

    if (projectId) {
      const proj = await Project.findOne({ _id: projectId, userId: workspaceOwnerId });
      if (!proj) throw createError('Project not found', 404);
    }
    if (taskTypeId) {
      const tt = await TaskType.findOne({ _id: taskTypeId, userId: workspaceOwnerId });
      if (!tt) throw createError('Task type not found', 404);
    }
    if (projectTaskId) {
      const pt = await ProjectTask.findOne({ _id: projectTaskId, userId: workspaceOwnerId });
      if (!pt) throw createError('Project task not found', 404);
    }

    const block = await TimeBlock.create({
      userId: workspaceOwnerId,
      title: String(title).trim(),
      startTime: start,
      endTime: end,
      kind: k,
      projectId: projectId || undefined,
      taskTypeId: taskTypeId || undefined,
      projectTaskId: projectTaskId || undefined,
      colorHint: colorHint?.trim() || undefined,
      recurrenceRule: recurrenceRule?.trim() || undefined,
      notes: notes?.trim() || undefined,
      launchedTimeEntryIds: [],
    });

    await block.populate([
      { path: 'projectId', populate: { path: 'clientId' } },
      'taskTypeId',
      'projectTaskId',
    ]);
    res.status(201).json(block);
  })
);

// PATCH /api/time-blocks/:id
router.patch(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const block = await TimeBlock.findOne({
      _id: req.params.id,
      userId: workspaceOwnerId,
    });
    if (!block) throw createError('Time block not found', 404);

    const {
      title,
      startTime,
      endTime,
      kind,
      projectId,
      taskTypeId,
      projectTaskId,
      colorHint,
      recurrenceRule,
      notes,
      exceptionDates,
    } = req.body;

    if (title !== undefined) block.title = String(title).trim();
    if (startTime !== undefined) block.startTime = new Date(startTime);
    if (endTime !== undefined) block.endTime = new Date(endTime);
    if (kind !== undefined) {
      if (!['WORK', 'PERSONAL', 'DOWNTIME', 'MEETING', 'ADMIN'].includes(kind)) {
        throw createError('Invalid kind', 400);
      }
      block.kind = kind;
    }
    if (projectId !== undefined) {
      if (projectId === null || projectId === '') {
        block.projectId = undefined;
      } else {
        const proj = await Project.findOne({ _id: projectId, userId: workspaceOwnerId });
        if (!proj) throw createError('Project not found', 404);
        block.projectId = proj._id;
      }
    }
    if (taskTypeId !== undefined) {
      if (taskTypeId === null || taskTypeId === '') {
        block.taskTypeId = undefined;
      } else {
        const tt = await TaskType.findOne({ _id: taskTypeId, userId: workspaceOwnerId });
        if (!tt) throw createError('Task type not found', 404);
        block.taskTypeId = tt._id;
      }
    }
    if (projectTaskId !== undefined) {
      if (projectTaskId === null || projectTaskId === '') {
        block.projectTaskId = undefined;
      } else {
        const pt = await ProjectTask.findOne({ _id: projectTaskId, userId: workspaceOwnerId });
        if (!pt) throw createError('Project task not found', 404);
        block.projectTaskId = pt._id;
      }
    }
    if (colorHint !== undefined) block.colorHint = colorHint?.trim() || undefined;
    if (recurrenceRule !== undefined) block.recurrenceRule = recurrenceRule?.trim() || undefined;
    if (notes !== undefined) block.notes = notes?.trim() || undefined;
    if (exceptionDates !== undefined && Array.isArray(exceptionDates)) {
      block.exceptionDates = exceptionDates.map((d: string) => new Date(d));
    }

    if (block.endTime <= block.startTime) {
      throw createError('endTime must be after startTime', 400);
    }

    await block.save();
    await block.populate([
      { path: 'projectId', populate: { path: 'clientId' } },
      'taskTypeId',
      'projectTaskId',
    ]);
    res.json(block);
  })
);

// DELETE /api/time-blocks/:id
router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const block = await TimeBlock.findOneAndDelete({
      _id: req.params.id,
      userId: workspaceOwnerId,
    });
    if (!block) throw createError('Time block not found', 404);
    res.json({ message: 'Time block deleted' });
  })
);

// POST /api/time-blocks/:id/launch
router.post(
  '/:id/launch',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const { description } = req.body as { description?: string };

    const block = await TimeBlock.findOne({
      _id: req.params.id,
      userId: workspaceOwnerId,
    });
    if (!block) throw createError('Time block not found', 404);

    const projectId = block.projectId;
    const taskTypeId = block.taskTypeId;
    const projectTaskId = block.projectTaskId;

    if (!projectId || !taskTypeId) {
      throw createError('Block must have a project and task type to start the timer', 400);
    }

    const proj = await Project.findOne({ _id: projectId, userId: workspaceOwnerId });
    if (!proj) throw createError('Project not found', 404);
    const tt = await TaskType.findOne({ _id: taskTypeId, userId: workspaceOwnerId });
    if (!tt) throw createError('Task type not found', 404);

    const titleOrNotes = [block.title, block.notes].filter(Boolean).join(' — ');
    const desc = (description?.trim() || titleOrNotes || undefined) as string | undefined;

    const runningTimers = await TimeEntry.find({ userId, isRunning: true });
    for (const timer of runningTimers) {
      const endTime = new Date();
      const sessionDuration = Math.floor((endTime.getTime() - timer.startTime.getTime()) / 1000);
      timer.isRunning = false;
      timer.endTime = endTime;
      timer.duration = timer.duration + sessionDuration;
      await timer.save();
    }

    const timer = await TimeEntry.create({
      userId,
      projectId,
      taskTypeId,
      projectTaskId: projectTaskId || undefined,
      blockId: block._id,
      description: desc,
      startTime: new Date(),
      isRunning: true,
      duration: 0,
    });

    block.launchedTimeEntryIds = block.launchedTimeEntryIds || [];
    block.launchedTimeEntryIds.push(timer._id);
    await block.save();

    await timer.populate([
      { path: 'projectId', populate: { path: 'clientId' } },
      'taskTypeId',
      'projectTaskId',
    ]);

    res.status(201).json({ timeEntry: timer, block });
  })
);

export default router;
