import { Router, Response } from 'express';
import { checkJwt, AuthRequest, extractUserId } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { TimeEntry } from '../models';

const router = Router();

// All routes require authentication
router.use(checkJwt);

// GET /api/time-entries - Get all time entries for current user (with filters)
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { startDate, endDate, projectId } = req.query;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { userId };

    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) {
        query.startTime.$gte = new Date((startDate as string) + 'T00:00:00');
      }
      if (endDate) {
        query.startTime.$lte = new Date((endDate as string) + 'T23:59:59.999');
      }
    }

    if (projectId) {
      query.projectId = projectId;
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

// POST /api/time-entries/start - Start timer
router.post(
  '/start',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { projectId, taskTypeId, projectTaskId, description } = req.body;

    if (!projectId) throw createError('Project is required', 400);
    if (!taskTypeId) throw createError('Task type is required', 400);

    // Stop any existing running timers for this user
    const runningTimers = await TimeEntry.find({ userId, isRunning: true });
    for (const timer of runningTimers) {
      const endTime = new Date();
      const duration = Math.floor(
        (endTime.getTime() - timer.startTime.getTime()) / 1000
      );
      timer.isRunning = false;
      timer.endTime = endTime;
      timer.duration = duration;
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
    const duration = Math.floor(
      (endTime.getTime() - timer.startTime.getTime()) / 1000
    );

    timer.isRunning = false;
    timer.endTime = endTime;
    timer.duration = duration;

    await timer.save();
    await timer.populate([{ path: 'projectId', populate: { path: 'clientId' } }, 'taskTypeId', 'projectTaskId']);

    res.json(timer);
  })
);

// POST /api/time-entries - Create manual entry
router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { projectId, taskTypeId, projectTaskId, description, startTime, endTime, duration } =
      req.body;

    if (!projectId) throw createError('Project is required', 400);
    if (!taskTypeId) throw createError('Task type is required', 400);
    if (!startTime) throw createError('Start time is required', 400);

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

// PUT /api/time-entries/:id - Update entry
router.put(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { projectId, taskTypeId, projectTaskId, description, startTime, endTime, duration } =
      req.body;

    const update: Record<string, unknown> = {};
    if (projectId !== undefined) update.projectId = projectId;
    if (taskTypeId !== undefined) update.taskTypeId = taskTypeId;
    if (projectTaskId !== undefined) update.projectTaskId = projectTaskId || null;
    if (description !== undefined) update.description = description?.trim();
    if (startTime !== undefined) update.startTime = new Date(startTime);
    if (endTime !== undefined) update.endTime = new Date(endTime);
    if (duration !== undefined) update.duration = duration;

    const entry = await TimeEntry.findOneAndUpdate(
      { _id: req.params.id, userId },
      update,
      { new: true, runValidators: true }
    ).populate([{ path: 'projectId', populate: { path: 'clientId' } }, 'taskTypeId', 'projectTaskId']);

    if (!entry) {
      throw createError('Time entry not found', 404);
    }

    res.json(entry);
  })
);

// DELETE /api/time-entries/:id - Delete entry
router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const entry = await TimeEntry.findOneAndDelete({
      _id: req.params.id,
      userId,
    });

    if (!entry) {
      throw createError('Time entry not found', 404);
    }

    res.json({ message: 'Time entry deleted successfully' });
  })
);

export default router;
