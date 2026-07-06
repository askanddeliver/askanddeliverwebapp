import { Router, Response } from 'express';
import mongoose from 'mongoose';
import {
  checkJwt,
  AuthRequest,
  extractUserId,
  getWorkspaceOwnerId,
  requireMemberOrAdmin,
} from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { TimeBlock, TimeEntry, Project, TaskType, ProjectTask } from '../models';
import { parseDateStart, parseDateEnd } from '../utils/calculations';
import { expandTimeBlocksForRange } from '../lib/expandTimeBlocks';
import { memberHasProjectAccess } from '../lib/memberProjects';
import { memberTimeBlockOwnerFilter } from '../lib/timeBlockScope';

const router = Router();

router.use(checkJwt);
router.use(requireMemberOrAdmin);

function normalizeStringArray(q: unknown): string[] {
  if (Array.isArray(q)) return q.map(String).filter(Boolean);
  if (typeof q === 'string') return q.split(',').map((s) => s.trim()).filter(Boolean);
  if (q && typeof q === 'object') return Object.values(q as Record<string, unknown>).map(String).filter(Boolean);
  return [];
}

async function validateMemberBlockRefs(
  workspaceOwnerId: string,
  memberAuth0Id: string,
  projectId?: string | null,
  taskTypeId?: string | null,
  projectTaskId?: string | null
) {
  if (projectId) {
    const allowed = await memberHasProjectAccess(workspaceOwnerId, memberAuth0Id, projectId);
    if (!allowed) throw createError('Project not found or not assigned to you', 404);
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
    const taskProjectId = pt.projectId.toString();
    if (projectId && taskProjectId !== projectId) {
      throw createError('Task does not belong to selected project', 400);
    }
    const allowed = await memberHasProjectAccess(workspaceOwnerId, memberAuth0Id, taskProjectId);
    if (!allowed) throw createError('Project task not found', 404);
  }
}

async function loadMemberBlock(
  workspaceOwnerId: string,
  memberAuth0Id: string,
  blockId: string
) {
  const block = await TimeBlock.findOne({
    _id: blockId,
    userId: workspaceOwnerId,
    ...memberTimeBlockOwnerFilter(memberAuth0Id),
  });
  if (!block) throw createError('Time block not found', 404);
  return block;
}

// GET /api/member/time-blocks?start=&end=&projectIds[]=&kinds[]=
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const auth0Id = extractUserId(req);
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!auth0Id || !workspaceOwnerId) throw createError('Workspace access required', 403);

    const { start, end } = req.query;
    if (!start || !end || typeof start !== 'string' || typeof end !== 'string') {
      throw createError('start and end query parameters are required', 400);
    }

    const rangeStart = parseDateStart(start);
    const rangeEnd = parseDateEnd(end);

    const projectIdsRaw = normalizeStringArray(req.query.projectIds ?? req.query['projectIds[]']);
    const kindsRaw = normalizeStringArray(req.query.kinds ?? req.query['kinds[]']);

    let validProjectFilter: string[] = [];
    if (projectIdsRaw.length > 0) {
      for (const id of projectIdsRaw) {
        if (!mongoose.Types.ObjectId.isValid(id)) continue;
        const allowed = await memberHasProjectAccess(workspaceOwnerId, auth0Id, id);
        if (allowed) validProjectFilter.push(id);
      }
      if (validProjectFilter.length === 0) {
        res.json([]);
        return;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {
      userId: workspaceOwnerId,
      ...memberTimeBlockOwnerFilter(auth0Id),
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

// POST /api/member/time-blocks
router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const auth0Id = extractUserId(req);
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!auth0Id || !workspaceOwnerId) throw createError('Workspace access required', 403);

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

    const k =
      kind && ['WORK', 'PERSONAL', 'DOWNTIME', 'MEETING', 'ADMIN'].includes(kind) ? kind : 'WORK';

    await validateMemberBlockRefs(
      workspaceOwnerId,
      auth0Id,
      projectId || undefined,
      taskTypeId || undefined,
      projectTaskId || undefined
    );

    const block = await TimeBlock.create({
      userId: workspaceOwnerId,
      ownerAuth0Id: auth0Id,
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

// PATCH /api/member/time-blocks/:id
router.patch(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const auth0Id = extractUserId(req);
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!auth0Id || !workspaceOwnerId) throw createError('Workspace access required', 403);

    const block = await loadMemberBlock(workspaceOwnerId, auth0Id, req.params.id);

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

    const nextProjectId =
      projectId !== undefined
        ? projectId === null || projectId === ''
          ? undefined
          : String(projectId)
        : block.projectId?.toString();
    const nextTaskTypeId =
      taskTypeId !== undefined
        ? taskTypeId === null || taskTypeId === ''
          ? undefined
          : String(taskTypeId)
        : block.taskTypeId?.toString();
    const nextProjectTaskId =
      projectTaskId !== undefined
        ? projectTaskId === null || projectTaskId === ''
          ? undefined
          : String(projectTaskId)
        : block.projectTaskId?.toString();

    await validateMemberBlockRefs(
      workspaceOwnerId,
      auth0Id,
      nextProjectId,
      nextTaskTypeId,
      nextProjectTaskId
    );

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
      block.projectId = projectId ? new mongoose.Types.ObjectId(String(projectId)) : undefined;
    }
    if (taskTypeId !== undefined) {
      block.taskTypeId = taskTypeId ? new mongoose.Types.ObjectId(String(taskTypeId)) : undefined;
    }
    if (projectTaskId !== undefined) {
      block.projectTaskId = projectTaskId
        ? new mongoose.Types.ObjectId(String(projectTaskId))
        : undefined;
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

// DELETE /api/member/time-blocks/:id
router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const auth0Id = extractUserId(req);
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!auth0Id || !workspaceOwnerId) throw createError('Workspace access required', 403);

    const block = await TimeBlock.findOneAndDelete({
      _id: req.params.id,
      userId: workspaceOwnerId,
      ...memberTimeBlockOwnerFilter(auth0Id),
    });
    if (!block) throw createError('Time block not found', 404);
    res.json({ message: 'Time block deleted' });
  })
);

// POST /api/member/time-blocks/:id/launch
router.post(
  '/:id/launch',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const auth0Id = extractUserId(req);
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!auth0Id || !workspaceOwnerId) throw createError('Workspace access required', 403);

    const { description } = req.body as { description?: string };

    const block = await loadMemberBlock(workspaceOwnerId, auth0Id, req.params.id);

    const projectId = block.projectId;
    const taskTypeId = block.taskTypeId;
    const projectTaskId = block.projectTaskId;

    if (!projectId || !taskTypeId) {
      throw createError('Block must have a project and task type to start the timer', 400);
    }

    await validateMemberBlockRefs(
      workspaceOwnerId,
      auth0Id,
      projectId.toString(),
      taskTypeId.toString(),
      projectTaskId?.toString()
    );

    const titleOrNotes = [block.title, block.notes].filter(Boolean).join(' — ');
    const desc = (description?.trim() || titleOrNotes || undefined) as string | undefined;

    const runningTimers = await TimeEntry.find({ userId: auth0Id, isRunning: true });
    for (const timer of runningTimers) {
      const endTime = new Date();
      const sessionDuration = Math.floor((endTime.getTime() - timer.startTime.getTime()) / 1000);
      timer.isRunning = false;
      timer.endTime = endTime;
      timer.duration = timer.duration + sessionDuration;
      await timer.save();
    }

    const timer = await TimeEntry.create({
      userId: auth0Id,
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
