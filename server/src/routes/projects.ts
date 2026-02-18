import { Router, Response } from 'express';
import { checkJwt, AuthRequest, extractUserId } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { Project } from '../models';

const router = Router();

// All routes require authentication
router.use(checkJwt);

// GET /api/projects/counts - Get project counts per status
router.get(
  '/counts',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const counts = await Project.aggregate([
      { $match: { userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const result: Record<string, number> = {
      ACTIVE: 0,
      PAUSED: 0,
      COMPLETED: 0,
      ARCHIVED: 0,
      TOTAL: 0,
    };
    for (const c of counts) {
      result[c._id] = c.count;
      result.TOTAL += c.count;
    }

    res.json(result);
  })
);

// GET /api/projects - Get all projects for current user (with filters)
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { status, search, sort, clientId } = req.query;

    const filter: Record<string, unknown> = { userId };

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (clientId) {
      filter.clientId = clientId;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    let sortOption: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort === 'oldest') {
      sortOption = { createdAt: 1 };
    } else if (sort === 'title_asc') {
      sortOption = { title: 1 };
    } else if (sort === 'title_desc') {
      sortOption = { title: -1 };
    } else if (sort === 'budget_desc') {
      sortOption = { budget: -1, createdAt: -1 };
    }

    const projects = await Project.find(filter)
      .populate('clientId')
      .sort(sortOption)
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

// PUT /api/projects/:id/archive - Archive a project
router.put(
  '/:id/archive',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, userId },
      { status: 'ARCHIVED' },
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
