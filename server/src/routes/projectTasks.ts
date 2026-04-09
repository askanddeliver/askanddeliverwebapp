import { Router, Response } from 'express';
import { checkJwt, AuthRequest, extractUserId, getWorkspaceOwnerId, requireAdmin } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { ProjectTask } from '../models';

const router = Router();

// All routes require authentication
router.use(checkJwt);

// GET /api/project-tasks?projectId=xxx - Get tasks for a project (admin + member)
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const { projectId } = req.query;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { userId: workspaceOwnerId };
    if (projectId) {
      query.projectId = projectId;
    }

    const tasks = await ProjectTask.find(query)
      .populate('projectId')
      .sort({ order: 1, createdAt: 1 })
      .lean();

    res.json(tasks);
  })
);

// GET /api/project-tasks/:id - Get a single project task (admin + member)
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const task = await ProjectTask.findOne({
      _id: req.params.id,
      userId: workspaceOwnerId,
    })
      .populate('projectId')
      .lean();

    if (!task) {
      throw createError('Project task not found', 404);
    }

    res.json(task);
  })
);

// POST /api/project-tasks - Create a project task (admin only)
router.post(
  '/',
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { projectId, title, description, status, estimatedHours } = req.body;

    if (!projectId) {
      throw createError('Project is required', 400);
    }
    if (!title || !title.trim()) {
      throw createError('Task title is required', 400);
    }

    // Place new task at the top: shift existing orders so reorder (0,1,2,…) stays consistent
    await ProjectTask.updateMany({ userId, projectId }, { $inc: { order: 1 } });

    const task = await ProjectTask.create({
      userId,
      projectId,
      title: title.trim(),
      description: description?.trim(),
      status: status || 'TODO',
      order: 0,
      estimatedHours,
    });

    await task.populate('projectId');
    res.status(201).json(task);
  })
);

// PUT /api/project-tasks/reorder - Reorder tasks (admin only)
// NOTE: Must be defined BEFORE /:id to avoid "reorder" being treated as an ID
router.put(
  '/reorder',
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { projectId, taskIds } = req.body;

    if (!projectId || !Array.isArray(taskIds)) {
      throw createError('projectId and taskIds array are required', 400);
    }

    // Update order for each task
    const updates = taskIds.map((taskId: string, index: number) =>
      ProjectTask.findOneAndUpdate(
        { _id: taskId, userId, projectId },
        { order: index },
        { new: true }
      )
    );

    await Promise.all(updates);

    // Return updated list
    const tasks = await ProjectTask.find({ userId, projectId })
      .sort({ order: 1 })
      .lean();

    res.json(tasks);
  })
);

// PUT /api/project-tasks/:id - Update a project task (admin only)
router.put(
  '/:id',
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { title, description, status, order, estimatedHours } = req.body;

    const update: Record<string, unknown> = {};
    if (title !== undefined) update.title = title.trim();
    if (description !== undefined) update.description = description?.trim();
    if (status !== undefined) update.status = status;
    if (order !== undefined) update.order = order;
    if (estimatedHours !== undefined) update.estimatedHours = estimatedHours;

    const task = await ProjectTask.findOneAndUpdate(
      { _id: req.params.id, userId },
      update,
      { new: true, runValidators: true }
    ).populate('projectId');

    if (!task) {
      throw createError('Project task not found', 404);
    }

    res.json(task);
  })
);

// PATCH /api/project-tasks/:id/status - Toggle task status (admin only)
router.patch(
  '/:id/status',
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { status } = req.body;

    if (!status || !['TODO', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
      throw createError('Valid status is required (TODO, IN_PROGRESS, COMPLETED)', 400);
    }

    const task = await ProjectTask.findOneAndUpdate(
      { _id: req.params.id, userId },
      { status },
      { new: true, runValidators: true }
    ).populate('projectId');

    if (!task) {
      throw createError('Project task not found', 404);
    }

    res.json(task);
  })
);

// DELETE /api/project-tasks/:id - Delete a project task (admin only)
router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const task = await ProjectTask.findOneAndDelete({
      _id: req.params.id,
      userId,
    });

    if (!task) {
      throw createError('Project task not found', 404);
    }

    res.json({ message: 'Project task deleted successfully' });
  })
);

export default router;
