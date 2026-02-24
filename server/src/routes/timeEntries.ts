import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { checkJwt, AuthRequest, extractUserId, getWorkspaceOwnerId } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { TimeEntry, Project } from '../models';
import { User } from '../models';

const router = Router();

// All routes require authentication
router.use(checkJwt);

// Check if user is admin (has full workspace access)
async function isAdmin(auth0Id: string): Promise<boolean> {
  const user = await User.findOne({ auth0Id }).lean();
  return user?.role === 'admin';
}

// Ensure project belongs to workspace (for member create/update)
async function ensureProjectInWorkspace(
  projectId: string,
  workspaceOwnerId: string
): Promise<void> {
  const project = await Project.findOne({
    _id: projectId,
    userId: workspaceOwnerId,
  });
  if (!project) throw createError('Project not found or access denied', 403);
}

// GET /api/time-entries - Admin: all workspace entries. Member: own entries only.
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const auth0Id = extractUserId(req);
    if (!auth0Id) throw createError('User ID not found in token', 401);

    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const { startDate, endDate, projectId, projectIds } = req.query;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};

    const admin = await isAdmin(auth0Id);
    let workspaceProjectIds: mongoose.Types.ObjectId[] = [];
    if (admin) {
      workspaceProjectIds = await Project.find({ userId: workspaceOwnerId }).distinct('_id');
      query.projectId = { $in: workspaceProjectIds };
    } else {
      query.userId = auth0Id;
    }

    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) {
        query.startTime.$gte = new Date((startDate as string) + 'T00:00:00');
      }
      if (endDate) {
        query.startTime.$lte = new Date((endDate as string) + 'T23:59:59.999');
      }
    }

    // Filter by project(s): projectIds array or single projectId
    const ids = Array.isArray(projectIds)
      ? projectIds
      : projectIds
        ? (projectIds as string).split(',').map((s) => s.trim()).filter(Boolean)
        : projectId
          ? [projectId]
          : [];
    if (ids.length > 0 && admin) {
      const valid = ids.filter((id) =>
        typeof id === 'string' && mongoose.Types.ObjectId.isValid(id) &&
        workspaceProjectIds.some((pid) => pid.toString() === id)
      );
      if (valid.length > 0) {
        query.projectId = { $in: valid };
      }
    }

    const entries = await TimeEntry.find(query)
      .populate({ path: 'projectId', populate: { path: 'clientId' } })
      .populate('taskTypeId')
      .populate('projectTaskId')
      .sort({ startTime: -1 })
      .lean();

    res.json(entries);
  })
);

// GET /api/time-entries/active - Get active timer
router.get(
  '/active',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const activeTimer = await TimeEntry.findOne({
      userId,
      isRunning: true,
    })
      .populate({ path: 'projectId', populate: { path: 'clientId' } })
      .populate('taskTypeId')
      .populate('projectTaskId');

    res.json(activeTimer);
  })
);

// POST /api/time-entries/start - Start timer (admin + member)
router.post(
  '/start',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const { projectId, taskTypeId, projectTaskId, description } = req.body;

    if (!projectId) throw createError('Project is required', 400);
    if (!taskTypeId) throw createError('Task type is required', 400);

    await ensureProjectInWorkspace(projectId, workspaceOwnerId);

    // Stop any existing running timers for this user (accumulate duration)
    const runningTimers = await TimeEntry.find({ userId, isRunning: true });
    for (const timer of runningTimers) {
      const endTime = new Date();
      const sessionDuration = Math.floor(
        (endTime.getTime() - timer.startTime.getTime()) / 1000
      );
      timer.isRunning = false;
      timer.endTime = endTime;
      timer.duration = timer.duration + sessionDuration;
      await timer.save();
    }

    // Create new timer
    const timer = await TimeEntry.create({
      userId,
      projectId,
      taskTypeId,
      projectTaskId: projectTaskId || undefined,
      description: description?.trim(),
      startTime: new Date(),
      isRunning: true,
      duration: 0,
    });

    await timer.populate([{ path: 'projectId', populate: { path: 'clientId' } }, 'taskTypeId', 'projectTaskId']);
    res.status(201).json(timer);
  })
);

// POST /api/time-entries/stop - Stop timer
router.post(
  '/stop',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const timer = await TimeEntry.findOne({
      userId,
      isRunning: true,
    });

    if (!timer) {
      throw createError('No active timer found', 404);
    }

    const endTime = new Date();
    const sessionDuration = Math.floor(
      (endTime.getTime() - timer.startTime.getTime()) / 1000
    );

    timer.isRunning = false;
    timer.endTime = endTime;
    timer.duration = timer.duration + sessionDuration;

    await timer.save();
    await timer.populate([{ path: 'projectId', populate: { path: 'clientId' } }, 'taskTypeId', 'projectTaskId']);

    res.json(timer);
  })
);

// POST /api/time-entries/:id/continue - Resume an existing entry
router.post(
  '/:id/continue',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const entry = await TimeEntry.findOne({ _id: req.params.id, userId });
    if (!entry) throw createError('Time entry not found', 404);
    if (entry.isRunning) throw createError('This entry is already running', 400);

    // Stop any existing running timers first (accumulate their duration)
    const runningTimers = await TimeEntry.find({ userId, isRunning: true });
    for (const timer of runningTimers) {
      const endTime = new Date();
      const sessionDuration = Math.floor(
        (endTime.getTime() - timer.startTime.getTime()) / 1000
      );
      timer.isRunning = false;
      timer.endTime = endTime;
      timer.duration = timer.duration + sessionDuration;
      await timer.save();
    }

    // Resume this entry: set running, record new session start, keep accumulated duration
    entry.isRunning = true;
    entry.startTime = new Date();
    entry.endTime = undefined;
    await entry.save();

    await entry.populate([
      { path: 'projectId', populate: { path: 'clientId' } },
      'taskTypeId',
      'projectTaskId',
    ]);

    res.json(entry);
  })
);

// POST /api/time-entries - Create manual entry (admin + member)
router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const { projectId, taskTypeId, projectTaskId, description, startTime, endTime, duration } =
      req.body;

    if (!projectId) throw createError('Project is required', 400);
    if (!taskTypeId) throw createError('Task type is required', 400);
    if (!startTime) throw createError('Start time is required', 400);

    await ensureProjectInWorkspace(projectId, workspaceOwnerId);

    // Calculate duration if not provided
    let entryDuration = duration;
    if (!entryDuration && endTime) {
      entryDuration = Math.floor(
        (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000
      );
    }

    const entry = await TimeEntry.create({
      userId,
      projectId,
      taskTypeId,
      projectTaskId: projectTaskId || undefined,
      description: description?.trim(),
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : undefined,
      duration: entryDuration || 0,
      isRunning: false,
    });

    await entry.populate([{ path: 'projectId', populate: { path: 'clientId' } }, 'taskTypeId', 'projectTaskId']);
    res.status(201).json(entry);
  })
);

// PUT /api/time-entries/:id - Update entry (member: own only, admin: any in workspace)
router.put(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const admin = await isAdmin(userId);
    const entryFilter = admin
      ? { _id: req.params.id, projectId: { $in: await Project.find({ userId: workspaceOwnerId }).distinct('_id') } }
      : { _id: req.params.id, userId };

    const existing = await TimeEntry.findOne(entryFilter);
    if (!existing) throw createError('Time entry not found', 404);

    const { projectId, taskTypeId, projectTaskId, description, startTime, endTime, duration } =
      req.body;

    if (projectId !== undefined) {
      await ensureProjectInWorkspace(projectId, workspaceOwnerId);
    }

    const update: Record<string, unknown> = {};
    if (projectId !== undefined) update.projectId = projectId;
    if (taskTypeId !== undefined) update.taskTypeId = taskTypeId;
    if (projectTaskId !== undefined) update.projectTaskId = projectTaskId || null;
    if (description !== undefined) update.description = description?.trim();
    if (startTime !== undefined) update.startTime = new Date(startTime);
    if (endTime !== undefined) update.endTime = new Date(endTime);
    if (duration !== undefined) update.duration = duration;

    const updateFilter = admin
      ? { _id: req.params.id, projectId: { $in: await Project.find({ userId: workspaceOwnerId }).distinct('_id') } }
      : { _id: req.params.id, userId };
    const entry = await TimeEntry.findOneAndUpdate(
      updateFilter,
      update,
      { new: true, runValidators: true }
    ).populate([{ path: 'projectId', populate: { path: 'clientId' } }, 'taskTypeId', 'projectTaskId']);

    if (!entry) {
      throw createError('Time entry not found', 404);
    }

    res.json(entry);
  })
);

// DELETE /api/time-entries/:id - Delete entry (member: own only, admin: any in workspace)
router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const admin = await isAdmin(userId);
    const deleteFilter = admin
      ? { _id: req.params.id, projectId: { $in: await Project.find({ userId: workspaceOwnerId }).distinct('_id') } }
      : { _id: req.params.id, userId };
    const entry = await TimeEntry.findOneAndDelete(deleteFilter);

    if (!entry) {
      throw createError('Time entry not found', 404);
    }

    res.json({ message: 'Time entry deleted successfully' });
  })
);

export default router;
