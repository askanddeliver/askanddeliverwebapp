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
import { Project, User, ProjectMessage, ProjectTask } from '../models';
import { findClientProject, requirePortalContext } from '../lib/portalScope';
import { memberHasProjectAccess } from '../lib/memberProjects';
import {
  notifyClientMessageToTeam,
  notifyTeamMessageToClient,
  notifyTeamMessageToTeam,
} from '../lib/email';
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

async function resolveTaskSnapshot(
  workspaceOwnerId: string,
  projectId: string,
  projectTaskId: unknown,
  opts?: { requireClientVisible?: boolean }
): Promise<{ projectTaskId: string; taskTitle: string } | undefined> {
  if (typeof projectTaskId !== 'string' || !projectTaskId.trim()) {
    return undefined;
  }

  const task = await ProjectTask.findOne({
    _id: projectTaskId,
    userId: workspaceOwnerId,
    projectId,
    ...(opts?.requireClientVisible ? { clientVisible: true } : {}),
  })
    .select('title')
    .lean();

  if (!task) throw createError('Task not found on this project', 400);

  return { projectTaskId: String(task._id), taskTitle: task.title };
}

async function resolveReplyParent(
  workspaceOwnerId: string,
  projectId: string,
  replyToMessageId: unknown,
  opts?: { requireClientVisible?: boolean }
): Promise<{ replyToMessageId: string } | undefined> {
  if (typeof replyToMessageId !== 'string' || !replyToMessageId.trim()) {
    return undefined;
  }

  const parent = await ProjectMessage.findOne({
    _id: replyToMessageId,
    userId: workspaceOwnerId,
    projectId,
    ...(opts?.requireClientVisible ? { clientVisible: true } : {}),
  })
    .select('_id')
    .lean();

  if (!parent) throw createError('Message to reply to was not found', 400);

  return { replyToMessageId: String(parent._id) };
}

function maybeNotifyClient(opts: {
  clientVisible: boolean;
  workspaceOwnerId: string;
  clientId?: unknown;
  projectId: string;
  projectTitle: string;
  authorName: string;
  messageBody: string;
}): void {
  if (!opts.clientVisible || !opts.clientId) return;
  notifyTeamMessageToClient({
    workspaceOwnerId: opts.workspaceOwnerId,
    clientId: String(opts.clientId),
    projectId: opts.projectId,
    projectTitle: opts.projectTitle,
    authorName: opts.authorName,
    messageBody: opts.messageBody,
  });
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
    const { auth0Id, workspaceOwnerId, user, project } = await loadWorkspaceProject(
      req,
      projectId
    );

    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
    if (!body) throw createError('Message body is required', 400);

    const clientVisible = Boolean(req.body?.clientVisible);
    const authorRole: ProjectMessageAuthorRole =
      user.role === 'admin' ? 'admin' : 'member';
    const taskSnap = await resolveTaskSnapshot(
      workspaceOwnerId,
      projectId,
      req.body?.projectTaskId
    );
    const replyParent = await resolveReplyParent(
      workspaceOwnerId,
      projectId,
      req.body?.replyToMessageId
    );

    const message = await ProjectMessage.create({
      userId: workspaceOwnerId,
      projectId,
      authorAuth0Id: auth0Id,
      authorName: user.name,
      authorRole,
      body,
      clientVisible,
      ...(taskSnap
        ? { projectTaskId: taskSnap.projectTaskId, taskTitle: taskSnap.taskTitle }
        : {}),
      ...(replyParent ? { replyToMessageId: replyParent.replyToMessageId } : {}),
    });

    notifyTeamMessageToTeam({
      workspaceOwnerId,
      projectId,
      projectTitle: project.title,
      assignedMemberIds: project.assignedMemberIds,
      authorAuth0Id: auth0Id,
      authorName: user.name,
      messageBody: body,
    });

    maybeNotifyClient({
      clientVisible,
      workspaceOwnerId,
      clientId: project.clientId,
      projectId,
      projectTitle: project.title,
      authorName: user.name,
      messageBody: body,
    });

    res.status(201).json(message);
  })
);

// PATCH /api/projects/:projectId/messages/:messageId
router.patch(
  '/:messageId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = req.params.projectId;
    const messageId = req.params.messageId;
    const { workspaceOwnerId, user, project } = await loadWorkspaceProject(
      req,
      projectId
    );

    if (typeof req.body?.clientVisible !== 'boolean') {
      throw createError('clientVisible is required', 400);
    }

    const message = await ProjectMessage.findOne({
      _id: messageId,
      userId: workspaceOwnerId,
      projectId,
    });

    if (!message) throw createError('Message not found', 404);

    if (message.authorRole === 'client' && !req.body.clientVisible) {
      throw createError('Client messages stay visible to the client', 400);
    }

    const wasVisible = message.clientVisible;
    const nextVisible = req.body.clientVisible;

    message.clientVisible = nextVisible;
    await message.save();

    if (!wasVisible && nextVisible) {
      maybeNotifyClient({
        clientVisible: true,
        workspaceOwnerId,
        clientId: project.clientId,
        projectId,
        projectTitle: project.title,
        authorName: user.name,
        messageBody: message.body,
      });
    }

    res.json(message);
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
    const project = await findClientProject(projectId, ctx.workspaceOwnerId, ctx.clientId);

    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
    if (!body) throw createError('Message body is required', 400);

    const user = await User.findOne({ auth0Id: ctx.auth0Id }).lean();
    if (!user) throw createError('User not found', 404);

    const taskSnap = await resolveTaskSnapshot(
      ctx.workspaceOwnerId,
      projectId,
      req.body?.projectTaskId,
      { requireClientVisible: true }
    );
    const replyParent = await resolveReplyParent(
      ctx.workspaceOwnerId,
      projectId,
      req.body?.replyToMessageId,
      { requireClientVisible: true }
    );

    const message = await ProjectMessage.create({
      userId: ctx.workspaceOwnerId,
      projectId,
      authorAuth0Id: ctx.auth0Id,
      authorName: user.name,
      authorRole: 'client',
      body,
      clientVisible: true,
      ...(taskSnap
        ? { projectTaskId: taskSnap.projectTaskId, taskTitle: taskSnap.taskTitle }
        : {}),
      ...(replyParent ? { replyToMessageId: replyParent.replyToMessageId } : {}),
    });

    notifyClientMessageToTeam({
      workspaceOwnerId: ctx.workspaceOwnerId,
      projectId,
      projectTitle: project.title,
      assignedMemberIds: project.assignedMemberIds,
      authorName: user.name,
      messageBody: body,
    });

    res.status(201).json(message);
  })
);
