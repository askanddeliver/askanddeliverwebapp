import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { checkJwt, AuthRequest, extractUserId, requireAdmin } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { PortfolioPitch, PortfolioProject } from '../models';
import { resolvePublicWorkspace } from '../lib/workspaceResolver';

const router = Router();

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizePitchSlug(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function rethrowPitchWriteError(err: unknown): never {
  if (err && typeof err === 'object' && 'code' in err && (err as { code?: number }).code === 11000) {
    throw createError('That URL path is already in use', 400);
  }
  throw err;
}

function assertSlug(slug: string): void {
  if (!slug || slug.length < 2 || !SLUG_PATTERN.test(slug)) {
    throw createError(
      'URL path must be at least 2 characters and use letters, numbers, and hyphens',
      400
    );
  }
}

async function resolveOwnedProjectIds(
  userId: string,
  rawIds: unknown
): Promise<mongoose.Types.ObjectId[]> {
  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    throw createError('Select at least one published portfolio project', 400);
  }
  if (rawIds.length > 24) {
    throw createError('A pitch page can include at most 24 projects', 400);
  }

  const ordered: mongoose.Types.ObjectId[] = [];
  const seen = new Set<string>();
  for (const value of rawIds) {
    const id = String(value);
    if (!mongoose.Types.ObjectId.isValid(id) || seen.has(id)) continue;
    seen.add(id);
    ordered.push(new mongoose.Types.ObjectId(id));
  }

  if (ordered.length === 0) {
    throw createError('Select at least one published portfolio project', 400);
  }

  const projects = await PortfolioProject.find({
    userId,
    published: true,
    _id: { $in: ordered },
  })
    .select('_id')
    .lean();

  const allowed = new Set(projects.map((project) => String(project._id)));
  const filtered = ordered.filter((id) => allowed.has(String(id)));
  if (filtered.length === 0) {
    throw createError('Select at least one published portfolio project', 400);
  }
  return filtered;
}

// GET /api/portfolio-pitches/public/:slug
router.get(
  '/public/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const workspaceOwnerId = await resolvePublicWorkspace(req);
    if (!workspaceOwnerId) {
      throw createError('Pitch page not found', 404);
    }

    const slug = normalizePitchSlug(req.params.slug);
    const pitch = await PortfolioPitch.findOne({
      userId: workspaceOwnerId,
      slug,
      published: true,
    }).lean();

    if (!pitch) {
      throw createError('Pitch page not found', 404);
    }

    const projects = await PortfolioProject.find({
      userId: workspaceOwnerId,
      published: true,
      _id: { $in: pitch.projectIds },
    })
      .select('-userId')
      .lean();

    const byId = new Map(projects.map((project) => [String(project._id), project]));
    const ordered = pitch.projectIds
      .map((id) => byId.get(String(id)))
      .filter((project): project is (typeof projects)[number] => Boolean(project));

    res.json({
      title: pitch.title,
      slug: pitch.slug,
      summary: pitch.summary,
      projects: ordered,
    });
  })
);

router.use(checkJwt);
router.use(requireAdmin);

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const pitches = await PortfolioPitch.find({ userId })
      .sort({ updatedAt: -1 })
      .lean();

    res.json(pitches);
  })
);

router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    if (!title) throw createError('A title is required', 400);

    const slug = normalizePitchSlug(req.body.slug || title);
    assertSlug(slug);

    const summary = typeof req.body.summary === 'string' ? req.body.summary.trim() : '';
    const projectIds = await resolveOwnedProjectIds(userId, req.body.projectIds);
    const published = Boolean(req.body.published);

    try {
      const pitch = await PortfolioPitch.create({
        userId,
        slug,
        title,
        summary,
        projectIds,
        published,
      });
      res.status(201).json(pitch);
    } catch (err) {
      rethrowPitchWriteError(err);
    }
  })
);

router.put(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const pitch = await PortfolioPitch.findOne({ _id: req.params.id, userId });
    if (!pitch) throw createError('Pitch page not found', 404);

    if (req.body.title !== undefined) {
      const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
      if (!title) throw createError('A title is required', 400);
      pitch.title = title;
    }

    if (req.body.slug !== undefined) {
      const slug = normalizePitchSlug(req.body.slug);
      assertSlug(slug);
      pitch.slug = slug;
    }

    if (req.body.summary !== undefined) {
      pitch.summary = typeof req.body.summary === 'string' ? req.body.summary.trim() : '';
    }

    if (req.body.projectIds !== undefined) {
      pitch.projectIds = await resolveOwnedProjectIds(userId, req.body.projectIds);
    }

    if (req.body.published !== undefined) {
      pitch.published = Boolean(req.body.published);
    }

    try {
      await pitch.save();
    } catch (err) {
      rethrowPitchWriteError(err);
    }
    res.json(pitch);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const pitch = await PortfolioPitch.findOneAndDelete({
      _id: req.params.id,
      userId,
    });

    if (!pitch) throw createError('Pitch page not found', 404);
    res.json({ message: 'Pitch page deleted' });
  })
);

export default router;
