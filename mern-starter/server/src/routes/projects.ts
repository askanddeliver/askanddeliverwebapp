import { Router, Response } from 'express';
import { checkJwt, AuthRequest, extractUserId } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { Project } from '../models';

const router = Router();

// All routes require authentication
router.use(checkJwt);

// GET /api/projects - Get all projects for current user
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const projects = await Project.find({ userId })
      .populate('clientId')
      .sort({ createdAt: -1 })
      .lean();

    res.json(projects);
  })
);

// GET /api/projects/client/:clientId - Get projects by client
router.get(
  '/client/:clientId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const projects = await Project.find({
      userId,
      clientId: req.params.clientId,
    })
      .populate('clientId')
      .sort({ createdAt: -1 })
      .lean();

    res.json(projects);
  })
);

// POST /api/projects - Create project
router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { clientId, title, description, status, budget } = req.body;

    if (!title || !title.trim()) {
      throw createError('Project title is required', 400);
    }
    if (!clientId) {
      throw createError('Client is required', 400);
    }

    const project = await Project.create({
      userId,
      clientId,
      title: title.trim(),
      description: description?.trim(),
      status: status || 'ACTIVE',
      budget,
    });

    await project.populate('clientId');
    res.status(201).json(project);
  })
);

// PUT /api/projects/:id - Update project
router.put(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { title, description, status, budget, clientId } = req.body;

    const update: Record<string, unknown> = {};
    if (title !== undefined) update.title = title.trim();
    if (description !== undefined) update.description = description?.trim();
    if (status !== undefined) update.status = status;
    if (budget !== undefined) update.budget = budget;
    if (clientId !== undefined) update.clientId = clientId;

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, userId },
      update,
      { new: true, runValidators: true }
    ).populate('clientId');

    if (!project) {
      throw createError('Project not found', 404);
    }

    res.json(project);
  })
);

// DELETE /api/projects/:id - Delete project
router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      userId,
    });

    if (!project) {
      throw createError('Project not found', 404);
    }

    res.json({ message: 'Project deleted successfully' });
  })
);

export default router;
