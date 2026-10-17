import { Router, Response } from 'express';
import mongoose from 'mongoose';
import {
  checkJwt,
  AuthRequest,
  extractUserId,
  getWorkspaceOwnerId,
  requireAdmin,
  requireClient,
  requireMemberOrAdmin,
} from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { Project, ProjectTask, ProjectTaskSuggestion, User } from '../models';
import { findClientProject, requirePortalContext } from '../lib/portalScope';
import { memberHasProjectAccess } from '../lib/memberProjects';
import { validateOptionalWorkspaceMemberAuth0Id } from '../lib/memberValidation';
import { notifyTaskSuggestionApproved } from '../lib/email/notifications/taskSuggestionApproved';
import { notifyTaskSuggestionToTeam } from '../lib/email/notifications/taskSuggestionToTeam';

const PENDING_CAP = 10;
const TITLE_MAX = 120;
const DESCRIPTION_MAX = 2000;

const router = Router({ mergeParams: true });
router.use(checkJwt);
router.use(requireMemberOrAdmin);

async function loadWorkspaceProject(req: AuthRequest, projectId: string) {
  const auth0Id = extractUserId(req);
  const workspaceOwnerId = await getWorkspaceOwnerId(req);
  if (!auth0Id || !workspaceOwnerId) {
    throw createError('Workspace access required', 403);
  }

  const project = await Project.findOne({
    _id: projectId,
    userId: workspaceOwnerId,
  }).lean();

  if (!project) {
    throw createError('Project not found', 404);
  }

  const user = await User.findOne({ auth0Id }).lean();
  if (!user) throw createError('User not found', 404);

  if (user.role === 'member') {
    const allowed = await memberHasProjectAccess(workspaceOwnerId, auth0Id, projectId);
    if (!allowed) throw createError('Project not found', 404);
  }

  return { auth0Id, workspaceOwnerId, user, project };
}

function parseTitle(raw: unknown): string {
  const title = typeof raw === 'string' ? raw.trim() : '';
  if (!title) throw createError('Title is required', 400);
  if (title.length > TITLE_MAX) {
    throw createError(`Title must be ${TITLE_MAX} characters or fewer`, 400);
  }
  return title;
}

function parseDescription(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  const description = String(raw).trim();
  if (!description) return undefined;
  if (description.length > DESCRIPTION_MAX) {
    throw createError(`Description must be ${DESCRIPTION_MAX} characters or fewer`, 400);
  }
  return description;
}

async function nextTaskOrder(workspaceOwnerId: string, projectId: string): Promise<number> {
  const last = await ProjectTask.findOne({ userId: workspaceOwnerId, projectId })
    .sort({ order: -1 })
    .select('order')
    .lean();
  return (last?.order ?? -1) + 1;
}

// GET /api/projects/:projectId/task-suggestions
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = req.params.projectId;
    const { workspaceOwnerId } = await loadWorkspaceProject(req, projectId);

    const suggestions = await ProjectTaskSuggestion.find({
      userId: workspaceOwnerId,
      projectId,
    })
      .sort({ createdAt: -1 })
      .lean();

    const statusOrder: Record<string, number> = {
      PENDING: 0,
      APPROVED: 1,
      DECLINED: 2,
    };
    suggestions.sort((a, b) => {
      const byStatus = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
      if (byStatus !== 0) return byStatus;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    res.json(suggestions);
  })
);

// POST /api/projects/:projectId/task-suggestions/:id/approve
router.post(
  '/:id/approve',
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = req.params.projectId;
    const { auth0Id, workspaceOwnerId, project } = await loadWorkspaceProject(req, projectId);

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw createError('Task request not found', 404);
    }

    const suggestion = await ProjectTaskSuggestion.findOne({
      _id: req.params.id,
      userId: workspaceOwnerId,
      projectId,
    });

    if (!suggestion) throw createError('Task request not found', 404);
    if (suggestion.status === 'DECLINED') {
      throw createError('This request was already declined', 409);
    }

    if (suggestion.status === 'APPROVED' && suggestion.createdTaskId) {
      const existing = await ProjectTask.findOne({
        _id: suggestion.createdTaskId,
        userId: workspaceOwnerId,
      });
      if (existing) {
        res.json({ suggestion, task: existing });
        return;
      }
    }

    const title =
      req.body?.title !== undefined ? parseTitle(req.body.title) : suggestion.title;
    const description =
      req.body?.description !== undefined
        ? parseDescription(req.body.description)
        : suggestion.description;
    const clientVisible =
      req.body?.clientVisible === undefined ? true : Boolean(req.body.clientVisible);
    const assigneeAuth0Id =
      req.body?.assigneeAuth0Id !== undefined
        ? await validateOptionalWorkspaceMemberAuth0Id(
            workspaceOwnerId,
            req.body.assigneeAuth0Id
          )
        : undefined;
    const estimatedHours = (() => {
      if (req.body?.estimatedHours === undefined || req.body?.estimatedHours === null) {
        return undefined;
      }
      const n = Number(req.body.estimatedHours);
      if (!Number.isFinite(n) || n < 0) {
        throw createError('estimatedHours must be a non-negative number', 400);
      }
      return n;
    })();

    const task = await ProjectTask.create({
      userId: workspaceOwnerId,
      projectId,
      title,
      description,
      status: 'TODO',
      order: await nextTaskOrder(workspaceOwnerId, projectId),
      clientVisible,
      ...(assigneeAuth0Id ? { assigneeAuth0Id } : {}),
      ...(estimatedHours !== undefined ? { estimatedHours } : {}),
    });

    suggestion.status = 'APPROVED';
    suggestion.createdTaskId = task._id;
    suggestion.reviewedByAuth0Id = auth0Id;
    suggestion.reviewedAt = new Date();
    if (req.body?.title !== undefined) suggestion.title = title;
    if (req.body?.description !== undefined) suggestion.description = description;
    await suggestion.save();

    notifyTaskSuggestionApproved({
      workspaceOwnerId,
      submitterAuth0Id: suggestion.suggestedByAuth0Id,
      projectId,
      projectTitle: project.title,
      taskTitle: title,
    });

    res.json({ suggestion, task });
  })
);

// POST /api/projects/:projectId/task-suggestions/:id/decline
router.post(
  '/:id/decline',
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = req.params.projectId;
    const { auth0Id, workspaceOwnerId } = await loadWorkspaceProject(req, projectId);

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw createError('Task request not found', 404);
    }

    const suggestion = await ProjectTaskSuggestion.findOne({
      _id: req.params.id,
      userId: workspaceOwnerId,
      projectId,
    });

    if (!suggestion) throw createError('Task request not found', 404);
    if (suggestion.status === 'APPROVED') {
      throw createError('This request was already added as a task', 409);
    }

    suggestion.status = 'DECLINED';
    suggestion.reviewedByAuth0Id = auth0Id;
    suggestion.reviewedAt = new Date();
    await suggestion.save();

    res.json(suggestion);
  })
);

export default router;

export const portalProjectTaskSuggestionsRouter = Router({ mergeParams: true });
portalProjectTaskSuggestionsRouter.use(checkJwt);
portalProjectTaskSuggestionsRouter.use(requireClient);

portalProjectTaskSuggestionsRouter.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = await requirePortalContext(req);
    const projectId = req.params.projectId;
    await findClientProject(projectId, ctx.workspaceOwnerId, ctx.clientId);

    const suggestions = await ProjectTaskSuggestion.find({
      userId: ctx.workspaceOwnerId,
      projectId,
      clientId: ctx.clientId,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json(suggestions);
  })
);

portalProjectTaskSuggestionsRouter.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = await requirePortalContext(req);
    const projectId = req.params.projectId;
    const project = await findClientProject(projectId, ctx.workspaceOwnerId, ctx.clientId);

    const title = parseTitle(req.body?.title);
    const description = parseDescription(req.body?.description);

    const pendingCount = await ProjectTaskSuggestion.countDocuments({
      userId: ctx.workspaceOwnerId,
      projectId,
      status: 'PENDING',
    });
    if (pendingCount >= PENDING_CAP) {
      throw createError(
        'This project already has 10 waiting task requests. Wait for the team to review them first.',
        400
      );
    }

    const user = await User.findOne({ auth0Id: ctx.auth0Id }).lean();
    if (!user) throw createError('User not found', 404);

    const suggestion = await ProjectTaskSuggestion.create({
      userId: ctx.workspaceOwnerId,
      projectId,
      clientId: ctx.clientId,
      suggestedByAuth0Id: ctx.auth0Id,
      suggestedByName: user.name?.trim() || 'Client',
      title,
      description,
      status: 'PENDING',
    });

    notifyTaskSuggestionToTeam({
      workspaceOwnerId: ctx.workspaceOwnerId,
      projectId,
      projectTitle: project.title,
      assignedMemberIds: project.assignedMemberIds,
      authorName: user.name,
      taskTitle: title,
      description,
    });

    res.status(201).json(suggestion);
  })
);
