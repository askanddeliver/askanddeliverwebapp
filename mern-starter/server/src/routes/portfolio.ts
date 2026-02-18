import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { checkJwt, AuthRequest, extractUserId } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { PortfolioProject } from '../models';

const router = Router();

// ============================================================
// PUBLIC ROUTES (no authentication required)
// These serve the public-facing portfolio pages
// ============================================================

// GET /api/portfolio/public - Get all published portfolio projects
router.get(
  '/public',
  asyncHandler(async (_req: Request, res: Response) => {
    const projects = await PortfolioProject.find({ published: true })
      .sort({ featured: -1, order: 1, year: -1 })
      .select('-userId')
      .lean();

    res.json(projects);
  })
);

// GET /api/portfolio/public/featured - Get featured published projects
router.get(
  '/public/featured',
  asyncHandler(async (_req: Request, res: Response) => {
    const projects = await PortfolioProject.find({ published: true, featured: true })
      .sort({ order: 1, year: -1 })
      .select('-userId')
      .lean();

    res.json(projects);
  })
);

// GET /api/portfolio/public/:slug - Get single published project by slug
router.get(
  '/public/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const project = await PortfolioProject.findOne({
      slug: req.params.slug,
      published: true,
    })
      .select('-userId')
      .lean();

    if (!project) {
      throw createError('Project not found', 404);
    }

    res.json(project);
  })
);

// ============================================================
// PROTECTED ROUTES (authentication required)
// These serve the admin portfolio management interface
// ============================================================

// All remaining routes require authentication
router.use(checkJwt);

// GET /api/portfolio - Get all portfolio projects for current user (admin)
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const projects = await PortfolioProject.find({ userId })
      .sort({ order: 1, createdAt: -1 })
      .lean();

    res.json(projects);
  })
);

// GET /api/portfolio/:id - Get single portfolio project (admin)
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const project = await PortfolioProject.findOne({
      _id: req.params.id,
      userId,
    });

    if (!project) {
      throw createError('Portfolio project not found', 404);
    }

    res.json(project);
  })
);

// POST /api/portfolio - Create portfolio project
router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const {
      slug,
      title,
      client,
      excerpt,
      description,
      categories,
      disciplines,
      year,
      featuredImage,
      images,
      challenge,
      solution,
      results,
      testimonial,
      liveUrl,
      featured,
      published,
      color,
      order,
    } = req.body;

    if (!title || !title.trim()) {
      throw createError('Project title is required', 400);
    }
    if (!client || !client.trim()) {
      throw createError('Client name is required', 400);
    }

    // Auto-generate slug from title if not provided
    const projectSlug =
      slug?.trim() ||
      title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    // Check for duplicate slug
    const existing = await PortfolioProject.findOne({ userId, slug: projectSlug });
    if (existing) {
      throw createError('A project with this slug already exists', 400);
    }

    // Get next order number if not provided
    let projectOrder = order;
    if (projectOrder === undefined || projectOrder === null) {
      const lastProject = await PortfolioProject.findOne({ userId })
        .sort({ order: -1 })
        .select('order');
      projectOrder = lastProject ? lastProject.order + 1 : 0;
    }

    const project = await PortfolioProject.create({
      userId,
      slug: projectSlug,
      title: title.trim(),
      client: client.trim(),
      excerpt: excerpt?.trim() || '',
      description: description?.trim() || '',
      categories: categories || [],
      disciplines: disciplines || [],
      year: year || new Date().getFullYear(),
      featuredImage: featuredImage || '',
      images: images || [],
      challenge: challenge?.trim(),
      solution: solution?.trim(),
      results: results || [],
      testimonial,
      liveUrl: liveUrl?.trim(),
      featured: featured || false,
      published: published || false,
      color: color || '#5B7765',
      order: projectOrder,
    });

    res.status(201).json(project);
  })
);

// PUT /api/portfolio/reorder - Reorder portfolio projects
// (must be registered before /:id to avoid matching "reorder" as a param)
router.put(
  '/reorder',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { projectIds } = req.body;
    if (!Array.isArray(projectIds)) {
      throw createError('projectIds must be an array', 400);
    }

    const bulkOps = projectIds.map((id: string, index: number) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(id), userId },
        update: { $set: { order: index } },
      },
    }));

    await PortfolioProject.bulkWrite(bulkOps);

    const projects = await PortfolioProject.find({ userId })
      .sort({ order: 1 })
      .lean();

    res.json(projects);
  })
);

// PUT /api/portfolio/:id - Update portfolio project
router.put(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const {
      slug,
      title,
      client,
      excerpt,
      description,
      categories,
      disciplines,
      year,
      featuredImage,
      images,
      challenge,
      solution,
      results,
      testimonial,
      liveUrl,
      featured,
      published,
      color,
      order,
    } = req.body;

    const update: Record<string, unknown> = {};
    if (title !== undefined) update.title = title.trim();
    if (client !== undefined) update.client = client.trim();
    if (slug !== undefined) update.slug = slug.trim().toLowerCase();
    if (excerpt !== undefined) update.excerpt = excerpt.trim();
    if (description !== undefined) update.description = description.trim();
    if (categories !== undefined) update.categories = categories;
    if (disciplines !== undefined) update.disciplines = disciplines;
    if (year !== undefined) update.year = year;
    if (featuredImage !== undefined) update.featuredImage = featuredImage;
    if (images !== undefined) update.images = images;
    if (challenge !== undefined) update.challenge = challenge?.trim();
    if (solution !== undefined) update.solution = solution?.trim();
    if (results !== undefined) update.results = results;
    if (testimonial !== undefined) update.testimonial = testimonial;
    if (liveUrl !== undefined) update.liveUrl = liveUrl?.trim();
    if (featured !== undefined) update.featured = featured;
    if (published !== undefined) update.published = published;
    if (color !== undefined) update.color = color;
    if (order !== undefined) update.order = order;

    // If slug is being changed, check for duplicates
    if (update.slug) {
      const existing = await PortfolioProject.findOne({
        userId,
        slug: update.slug,
        _id: { $ne: req.params.id },
      });
      if (existing) {
        throw createError('A project with this slug already exists', 400);
      }
    }

    const project = await PortfolioProject.findOneAndUpdate(
      { _id: req.params.id, userId },
      update,
      { new: true, runValidators: true }
    );

    if (!project) {
      throw createError('Portfolio project not found', 404);
    }

    res.json(project);
  })
);

// PATCH /api/portfolio/:id/publish - Toggle published status
router.patch(
  '/:id/publish',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const project = await PortfolioProject.findOne({
      _id: req.params.id,
      userId,
    });

    if (!project) {
      throw createError('Portfolio project not found', 404);
    }

    project.published = !project.published;
    await project.save();

    res.json(project);
  })
);

// PATCH /api/portfolio/:id/feature - Toggle featured status
router.patch(
  '/:id/feature',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const project = await PortfolioProject.findOne({
      _id: req.params.id,
      userId,
    });

    if (!project) {
      throw createError('Portfolio project not found', 404);
    }

    project.featured = !project.featured;
    await project.save();

    res.json(project);
  })
);

// POST /api/portfolio/seed - Seed initial portfolio data from static data
router.post(
  '/seed',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const existingCount = await PortfolioProject.countDocuments({ userId });
    if (existingCount > 0) {
      throw createError(
        'Portfolio already has projects. Delete existing projects before seeding.',
        400
      );
    }

    const { projects } = req.body;
    if (!Array.isArray(projects) || projects.length === 0) {
      throw createError('projects array is required', 400);
    }

    const seeded = await PortfolioProject.insertMany(
      projects.map((p: Record<string, unknown>, index: number) => ({
        ...p,
        userId,
        published: true,
        order: index,
      }))
    );

    res.status(201).json(seeded);
  })
);

// DELETE /api/portfolio/:id - Delete portfolio project
router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const project = await PortfolioProject.findOneAndDelete({
      _id: req.params.id,
      userId,
    });

    if (!project) {
      throw createError('Portfolio project not found', 404);
    }

    res.json({ message: 'Portfolio project deleted successfully' });
  })
);

export default router;
