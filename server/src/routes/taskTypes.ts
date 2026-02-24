import { Router, Response } from 'express';
import { checkJwt, AuthRequest, extractUserId, getWorkspaceOwnerId, requireAdmin } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { TaskType } from '../models';

const router = Router();

// All routes require authentication
router.use(checkJwt);

// GET /api/task-types - Get task types for workspace (admin + member need for time logging)
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const taskTypes = await TaskType.find({ userId: workspaceOwnerId }).sort({ name: 1 }).lean();
    res.json(taskTypes);
  })
);

// POST /api/task-types - Create task type (admin only)
router.post(
  '/',
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { name, rate, color } = req.body;

    if (!name || !name.trim()) {
      throw createError('Task type name is required', 400);
    }
    if (rate === undefined || rate === null) {
      throw createError('Hourly rate is required', 400);
    }

    const taskType = await TaskType.create({
      userId,
      name: name.trim(),
      rate,
      color: color || '#3B82F6',
    });

    res.status(201).json(taskType);
  })
);

// PUT /api/task-types/:id - Update task type (admin only)
router.put(
  '/:id',
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { name, rate, color } = req.body;

    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name.trim();
    if (rate !== undefined) update.rate = rate;
    if (color !== undefined) update.color = color;

    const taskType = await TaskType.findOneAndUpdate(
      { _id: req.params.id, userId },
      update,
      { new: true, runValidators: true }
    );

    if (!taskType) {
      throw createError('Task type not found', 404);
    }

    res.json(taskType);
  })
);

// DELETE /api/task-types/:id - Delete task type (admin only)
router.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const taskType = await TaskType.findOneAndDelete({
      _id: req.params.id,
      userId,
    });

    if (!taskType) {
      throw createError('Task type not found', 404);
    }

    res.json({ message: 'Task type deleted successfully' });
  })
);

// POST /api/task-types/seed - Seed default task types (admin only)
router.post(
  '/seed',
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const existing = await TaskType.countDocuments({ userId });

    if (existing > 0) {
      throw createError('Task types already exist. Delete existing ones first or use create endpoint.', 400);
    }

    const defaults = [
      { name: 'Design', rate: 75, color: '#3B82F6' },
      { name: 'Development', rate: 100, color: '#10B981' },
      { name: 'Strategy', rate: 125, color: '#8B5CF6' },
      { name: 'Meeting', rate: 50, color: '#F59E0B' },
      { name: 'Admin', rate: 0, color: '#6B7280' },
    ];

    const taskTypes = await TaskType.insertMany(
      defaults.map((tt) => ({ ...tt, userId }))
    );

    res.status(201).json(taskTypes);
  })
);

export default router;
