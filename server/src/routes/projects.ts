import { Router, Response } from 'express';
import { checkJwt, AuthRequest, extractUserId, getWorkspaceOwnerId, requireAdmin } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { Project, TimeEntry } from '../models';
import type { ITaskType } from '../models/TaskType';
import type { ProjectBillingMode } from '../models';
import { getEffectiveRate, parseDateStart, parseDateEnd } from '../utils/calculations';

const BILLING_MODES: ProjectBillingMode[] = ['HOURLY', 'FIXED_PRICE', 'HOUR_RETAINER'];

function parseOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : undefined;
}

/** Validates billing fields for the effective mode (after create or merge on update). */
function assertProjectBillingValid(
  mode: ProjectBillingMode,
  agreedAmount: number | undefined,
  retainerHoursTotal: number | undefined
) {
  if (mode === 'FIXED_PRICE') {
    if (agreedAmount === undefined || agreedAmount < 0 || Number.isNaN(agreedAmount)) {
      throw createError('Fixed price projects require a non-negative agreed amount', 400);
    }
  }
  if (mode === 'HOUR_RETAINER') {
    if (
      retainerHoursTotal === undefined ||
      retainerHoursTotal <= 0 ||
      Number.isNaN(retainerHoursTotal)
    ) {
      throw createError('Hour retainer projects require retainer hours total greater than zero', 400);
    }
  }
}

const router = Router();

// All routes require authentication
router.use(checkJwt);

// GET /api/projects/counts - Get project counts per status (admin + member see workspace)
router.get(
  '/counts',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const counts = await Project.aggregate([
      { $match: { userId: workspaceOwnerId } },
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

// GET /api/projects - Get all projects for workspace (admin + member)
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const { status, search, sort, clientId } = req.query;

    const filter: Record<string, unknown> = { userId: workspaceOwnerId };

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (clientId) {
      filter.clientId = clientId;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { brief: searchRegex },
        { excerpt: searchRegex },
      ];
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

// GET /api/projects/budget-burn — Billed vs standing budget for HOURLY projects (workspace; admin use for $)
router.get(
  '/budget-burn',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const rawIds = req.query.projectIds;
    const ids: string[] = Array.isArray(rawIds)
      ? (rawIds as string[]).map((s) => String(s).trim()).filter(Boolean)
      : typeof rawIds === 'string'
        ? rawIds
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    if (ids.length === 0) {
      res.json({ periodLabel: 'All time', byProject: {} });
      return;
    }

    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    const projectDocs = await Project.find({
      _id: { $in: ids },
      userId: workspaceOwnerId,
    }).lean();

    const eligibleIds = projectDocs
      .filter(
        (p) =>
          (p.billingMode ?? 'HOURLY') === 'HOURLY' &&
          p.budget != null &&
          Number(p.budget) > 0
      )
      .map((p) => p._id.toString());

    if (eligibleIds.length === 0) {
      res.json({ periodLabel: 'All time', byProject: {} });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entryQuery: any = {
      projectId: { $in: eligibleIds },
      isRunning: false,
    };
    if (startDate || endDate) {
      entryQuery.startTime = {};
      if (startDate) entryQuery.startTime.$gte = parseDateStart(startDate);
      if (endDate) entryQuery.startTime.$lte = parseDateEnd(endDate);
    }

    const entries = await TimeEntry.find(entryQuery)
      .populate({
        path: 'projectId',
        populate: { path: 'clientId' },
      })
      .populate('taskTypeId')
      .lean();

    const billedByProject = new Map<string, number>();

    for (const entry of entries) {
      const taskType = entry.taskTypeId as unknown as ITaskType | null;
      if (!taskType) continue;

      const proj = entry.projectId as unknown as {
        _id: { toString(): string };
        clientId?: unknown;
      } | null;
      if (!proj?._id) continue;

      const pid = proj._id.toString();
      const client = proj.clientId as Parameters<typeof getEffectiveRate>[1];
      const hours = (entry.duration || 0) / 3600;
      const rate = getEffectiveRate(taskType, client);
      const amount = Math.round(hours * rate * 100) / 100;
      billedByProject.set(pid, (billedByProject.get(pid) || 0) + amount);
    }

    const byProject: Record<
      string,
      { budget: number; billed: number; remaining: number; percentUsed: number }
    > = {};

    for (const p of projectDocs) {
      const id = p._id.toString();
      if (!eligibleIds.includes(id)) continue;
      const budget = Number(p.budget);
      const billed = Math.round((billedByProject.get(id) || 0) * 100) / 100;
      const remaining = Math.round((budget - billed) * 100) / 100;
      const percentUsed =
        budget > 0 ? Math.round((billed / budget) * 10000) / 100 : 0;
      byProject[id] = { budget, billed, remaining, percentUsed };
    }

    let periodLabel = 'All time';
    if (startDate && endDate) {
      periodLabel = `${String(startDate).slice(0, 10)} – ${String(endDate).slice(0, 10)}`;
    } else if (startDate) {
      periodLabel = `From ${String(startDate).slice(0, 10)}`;
    } else if (endDate) {
      periodLabel = `Through ${String(endDate).slice(0, 10)}`;
    }

    res.json({ periodLabel, byProject });
  })
);

// GET /api/projects/client/:clientId - Get projects by client (admin only - members don't use clients)
router.get(
  '/client/:clientId',
  requireAdmin,
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

// POST /api/projects - Create project (admin only)
router.post(
  '/',
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const {
      clientId,
      title,
      description,
      brief,
      excerpt,
      year,
      categories,
      disciplines,
      challenge,
      solution,
      results,
      status,
      budget,
      billingMode: rawBillingMode,
      agreedAmount: rawAgreedAmount,
      retainerHoursTotal: rawRetainerHoursTotal,
      retainerHoursAdjustment: rawRetainerAdjustment,
      fixedPriceInvoiceLabel,
    } = req.body;

    if (!title || !title.trim()) {
      throw createError('Project title is required', 400);
    }
    if (!clientId) {
      throw createError('Client is required', 400);
    }

    const billingMode: ProjectBillingMode =
      rawBillingMode && BILLING_MODES.includes(rawBillingMode)
        ? rawBillingMode
        : 'HOURLY';
    const agreedAmount = parseOptionalNumber(rawAgreedAmount);
    const retainerHoursTotal = parseOptionalNumber(rawRetainerHoursTotal);
    const retainerHoursAdjustment = parseOptionalNumber(rawRetainerAdjustment);

    assertProjectBillingValid(billingMode, agreedAmount, retainerHoursTotal);

    const project = await Project.create({
      userId,
      clientId,
      title: title.trim(),
      description: description?.trim(),
      brief: brief?.trim(),
      excerpt: excerpt?.trim(),
      year,
      categories: Array.isArray(categories) ? categories : [],
      disciplines: Array.isArray(disciplines) ? disciplines : [],
      challenge: challenge?.trim(),
      solution: solution?.trim(),
      results: Array.isArray(results) ? results : [],
      status: status || 'ACTIVE',
      budget,
      billingMode,
      agreedAmount,
      retainerHoursTotal,
      retainerHoursAdjustment,
      fixedPriceInvoiceLabel:
        typeof fixedPriceInvoiceLabel === 'string'
          ? fixedPriceInvoiceLabel.trim() || undefined
          : undefined,
    });

    await project.populate('clientId');
    res.status(201).json(project);
  })
);

// PUT /api/projects/:id - Update project (admin only)
router.put(
  '/:id',
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const {
      title,
      description,
      brief,
      excerpt,
      year,
      categories,
      disciplines,
      challenge,
      solution,
      results,
      status,
      budget,
      clientId,
      billingMode: rawBillingMode,
      agreedAmount: rawAgreedAmount,
      retainerHoursTotal: rawRetainerHoursTotal,
      retainerHoursAdjustment: rawRetainerAdjustment,
      fixedPriceInvoiceLabel,
    } = req.body;

    const existing = await Project.findOne({ _id: req.params.id, userId });
    if (!existing) {
      throw createError('Project not found', 404);
    }

    const update: Record<string, unknown> = {};
    if (title !== undefined) update.title = title.trim();
    if (description !== undefined) update.description = description?.trim();
    if (brief !== undefined) update.brief = brief?.trim();
    if (excerpt !== undefined) update.excerpt = excerpt?.trim();
    if (year !== undefined) update.year = year;
    if (categories !== undefined) update.categories = Array.isArray(categories) ? categories : [];
    if (disciplines !== undefined) update.disciplines = Array.isArray(disciplines) ? disciplines : [];
    if (challenge !== undefined) update.challenge = challenge?.trim();
    if (solution !== undefined) update.solution = solution?.trim();
    if (results !== undefined) update.results = Array.isArray(results) ? results : [];
    if (status !== undefined) update.status = status;
    if (budget !== undefined) update.budget = budget;
    if (clientId !== undefined) update.clientId = clientId;

    if (rawBillingMode !== undefined) {
      if (!BILLING_MODES.includes(rawBillingMode)) {
        throw createError('Invalid billing mode', 400);
      }
      update.billingMode = rawBillingMode;
    }
    if (rawAgreedAmount !== undefined) {
      const n = parseOptionalNumber(rawAgreedAmount);
      update.agreedAmount = n;
    }
    if (rawRetainerHoursTotal !== undefined) {
      const n = parseOptionalNumber(rawRetainerHoursTotal);
      update.retainerHoursTotal = n;
    }
    if (rawRetainerAdjustment !== undefined) {
      const n = parseOptionalNumber(rawRetainerAdjustment);
      update.retainerHoursAdjustment = n;
    }
    if (fixedPriceInvoiceLabel !== undefined) {
      update.fixedPriceInvoiceLabel =
        typeof fixedPriceInvoiceLabel === 'string'
          ? fixedPriceInvoiceLabel.trim() || undefined
          : undefined;
    }

    const mergedMode: ProjectBillingMode =
      (update.billingMode as ProjectBillingMode | undefined) ??
      (existing.billingMode as ProjectBillingMode) ??
      'HOURLY';
    const mergedAgreed =
      rawAgreedAmount !== undefined
        ? parseOptionalNumber(rawAgreedAmount)
        : existing.agreedAmount;
    const mergedRetainer =
      rawRetainerHoursTotal !== undefined
        ? parseOptionalNumber(rawRetainerHoursTotal)
        : existing.retainerHoursTotal;

    assertProjectBillingValid(mergedMode, mergedAgreed, mergedRetainer);

    const billingTouched =
      rawBillingMode !== undefined ||
      rawAgreedAmount !== undefined ||
      rawRetainerHoursTotal !== undefined ||
      rawRetainerAdjustment !== undefined ||
      fixedPriceInvoiceLabel !== undefined;

    const unsetPayload: Record<string, 1> = {};
    if (billingTouched) {
      if (mergedMode === 'HOURLY') {
        unsetPayload.agreedAmount = 1;
        unsetPayload.retainerHoursTotal = 1;
        unsetPayload.retainerHoursAdjustment = 1;
        unsetPayload.fixedPriceInvoiceLabel = 1;
      } else if (mergedMode === 'FIXED_PRICE') {
        unsetPayload.retainerHoursTotal = 1;
        unsetPayload.retainerHoursAdjustment = 1;
      } else if (mergedMode === 'HOUR_RETAINER') {
        unsetPayload.agreedAmount = 1;
        unsetPayload.fixedPriceInvoiceLabel = 1;
      }
    }

    const setPayload = { ...update };
    for (const k of Object.keys(unsetPayload)) {
      delete setPayload[k];
    }

    const mongoUpdate: Record<string, unknown> = {};
    if (Object.keys(setPayload).length > 0) {
      mongoUpdate.$set = setPayload;
    }
    if (Object.keys(unsetPayload).length > 0) {
      mongoUpdate.$unset = unsetPayload;
    }

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, userId },
      Object.keys(mongoUpdate).length > 0 ? mongoUpdate : { $set: {} },
      { new: true, runValidators: true }
    ).populate('clientId');

    if (!project) {
      throw createError('Project not found', 404);
    }

    res.json(project);
  })
);

// PUT /api/projects/:id/archive - Archive a project (admin only)
router.put(
  '/:id/archive',
  requireAdmin,
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

// DELETE /api/projects/:id - Delete project (admin only)
router.delete(
  '/:id',
  requireAdmin,
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
