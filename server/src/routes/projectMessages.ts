import { Router, Response } from 'express';
import {
  checkJwt,
  AuthRequest,
  extractUserId,
  getWorkspaceOwnerId,
  requireClient,
  requireMemberOrAdmin,
} from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { Project, User, ProjectMessage } from '../models';
import { findClientProject, requirePortalContext } from '../lib/portalScope';
import { memberHasProjectAccess } from '../lib/memberProjects';
import type { ProjectMessageAuthorRole } from '../models/ProjectMessage';

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

// GET /api/projects/:projectId/messages
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = req.params.projectId;
    const { workspaceOwnerId } = await loadWorkspaceProject(req, projectId);

    const messages = await ProjectMessage.find({
      userId: workspaceOwnerId,
      projectId,
    })
      .sort({ createdAt: 1 })
      .lean();

    res.json(messages);
  })
);

// POST /api/projects/:projectId/messages
router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = req.params.projectId;
    const { auth0Id, workspaceOwnerId, user } = await loadWorkspaceProject(req, projectId);

    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
    if (!body) throw createError('Message body is required', 400);

    const clientVisible = user.role === 'member' ? false : Boolean(req.body?.clientVisible);
    const authorRole: ProjectMessageAuthorRole =
      user.role === 'admin' ? 'admin' : 'member';

    const message = await ProjectMessage.create({
      userId: workspaceOwnerId,
      projectId,
      authorAuth0Id: auth0Id,
      authorName: user.name,
      authorRole,
      body,
      clientVisible,
    });

    res.status(201).json(message);
  })
);

export default router;

// Client portal message routes (mounted at /api/portal/projects/:projectId/messages)
export const portalProjectMessagesRouter = Router({ mergeParams: true });

portalProjectMessagesRouter.use(checkJwt);
portalProjectMessagesRouter.use(requireClient);

portalProjectMessagesRouter.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = await requirePortalContext(req);
    const projectId = req.params.projectId;
    await findClientProject(projectId, ctx.workspaceOwnerId, ctx.clientId);

    const messages = await ProjectMessage.find({
      userId: ctx.workspaceOwnerId,
      projectId,
      clientVisible: true,
    })
      .sort({ createdAt: 1 })
      .lean();

    res.json(messages);
  })
);

portalProjectMessagesRouter.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = await requirePortalContext(req);
    const projectId = req.params.projectId;
    await findClientProject(projectId, ctx.workspaceOwnerId, ctx.clientId);

    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
    if (!body) throw createError('Message body is required', 400);

    const user = await User.findOne({ auth0Id: ctx.auth0Id }).lean();
    if (!user) throw createError('User not found', 404);

    const message = await ProjectMessage.create({
      userId: ctx.workspaceOwnerId,
      projectId,
      authorAuth0Id: ctx.auth0Id,
      authorName: user.name,
      authorRole: 'client',
      body,
      clientVisible: true,
    });

    res.status(201).json(message);
  })
);
