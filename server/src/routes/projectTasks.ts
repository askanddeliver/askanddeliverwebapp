import { Router, Response } from 'express';
import { checkJwt, AuthRequest, extractUserId, getWorkspaceOwnerId, requireAdmin } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import mongoose from 'mongoose';
import { ProjectTask, Client, Project, User } from '../models';
import { validateOptionalWorkspaceMemberAuth0Id } from '../lib/memberValidation';
import { memberHasProjectAccess, getMemberProjectFilter } from '../lib/memberProjects';

const router = Router();

router.use(checkJwt);

async function loadActiveUser(auth0Id: string) {
  return User.findOne({ auth0Id, status: 'active' }).lean();
}

// GET /api/project-tasks?projectId=xxx - Get tasks for a project (admin + member)
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const auth0Id = extractUserId(req);
    const user = auth0Id ? await loadActiveUser(auth0Id) : null;

    const { projectId, scope } = req.query;
    const scopeVal =
      scope === 'client-only' || scope === 'internal-only' ? scope : 'all';

    let scopedProjectIds: mongoose.Types.ObjectId[] | undefined;
    if (scopeVal === 'client-only') {
      const externalClientIds = await Client.find({
        userId: workspaceOwnerId,
        isInternal: { $ne: true },
      }).distinct('_id');
      scopedProjectIds = await Project.find({
        userId: workspaceOwnerId,
        clientId: { $in: externalClientIds },
      }).distinct('_id');
    } else if (scopeVal === 'internal-only') {
      const internalClientIds = await Client.find({
        userId: workspaceOwnerId,
        isInternal: true,
      }).distinct('_id');
      scopedProjectIds = await Project.find({
        userId: workspaceOwnerId,
        clientId: { $in: internalClientIds },
      }).distinct('_id');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { userId: workspaceOwnerId };
    if (projectId) {
      const pid = projectId as string;
      if (user?.role === 'member' && auth0Id) {
        const allowed = await memberHasProjectAccess(workspaceOwnerId, auth0Id, pid);
        if (!allowed) {
          res.json([]);
          return;
        }
      }
      if (scopedProjectIds !== undefined) {
        const allowed = scopedProjectIds.some((id) => id.toString() === pid);
        if (!allowed) {
          res.json([]);
          return;
        }
      }
      query.projectId = projectId;
    } else if (scopedProjectIds !== undefined) {
      if (scopedProjectIds.length === 0) {
        res.json([]);
        return;
      }
      query.projectId = { $in: scopedProjectIds };
    } else if (user?.role === 'member' && auth0Id) {
      const memberFilter = await getMemberProjectFilter(workspaceOwnerId, auth0Id);
      const memberProjectIds = await Project.find(memberFilter).distinct('_id');
      query.projectId = { $in: memberProjectIds };
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

    const auth0Id = extractUserId(req);
    const user = auth0Id ? await loadActiveUser(auth0Id) : null;
    if (user?.role === 'member' && auth0Id) {
      const pid =
        typeof task.projectId === 'object' && task.projectId && '_id' in task.projectId
          ? String(task.projectId._id)
          : String(task.projectId);
      const allowed = await memberHasProjectAccess(workspaceOwnerId, auth0Id, pid);
      if (!allowed) throw createError('Project task not found', 404);
    }

    res.json(task);
  })
);

// POST /api/project-tasks - Create task (admin, or member on assigned project)
router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const auth0Id = extractUserId(req);
    if (!auth0Id) throw createError('User ID not found in token', 401);

    const user = await loadActiveUser(auth0Id);
    if (!user) throw createError('User not found', 404);

    const isAdmin = user.role === 'admin';
    const isMember = user.role === 'member';

    if (!isAdmin && !isMember) {
      throw createError('Admin or member access required', 403);
    }

    const { projectId, title, description, status, estimatedHours, clientVisible, assigneeAuth0Id } =
      req.body;

    if (!projectId) {
      throw createError('Project is required', 400);
    }
    if (!title || !title.trim()) {
      throw createError('Task title is required', 400);
    }

    if (isMember) {
      const allowed = await memberHasProjectAccess(workspaceOwnerId, auth0Id, projectId);
      if (!allowed) {
        throw createError('You are not assigned to this project', 403);
      }
    }

    await ProjectTask.updateMany(
      { userId: workspaceOwnerId, projectId },
      { $inc: { order: 1 } }
    );

    let validatedAssignee: string | undefined;
    let taskClientVisible = false;

    if (isAdmin) {
      validatedAssignee = await validateOptionalWorkspaceMemberAuth0Id(
        workspaceOwnerId,
        assigneeAuth0Id
      );
      taskClientVisible = Boolean(clientVisible);
    } else {
      validatedAssignee = auth0Id;
    }

    const task = await ProjectTask.create({
      userId: workspaceOwnerId,
      projectId,
      title: title.trim(),
      description: description?.trim(),
      status: status || 'TODO',
      order: 0,
      estimatedHours,
      clientVisible: taskClientVisible,
      assigneeAuth0Id: validatedAssignee,
    });

    await task.populate('projectId');
    res.status(201).json(task);
  })
);

// PUT /api/project-tasks/reorder - Reorder tasks (admin only)
router.put(
  '/reorder',
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const { projectId, taskIds } = req.body;

    if (!projectId || !Array.isArray(taskIds)) {
      throw createError('projectId and taskIds array are required', 400);
    }

    const updates = taskIds.map((taskId: string, index: number) =>
      ProjectTask.findOneAndUpdate(
        { _id: taskId, userId: workspaceOwnerId, projectId },
        { order: index },
        { new: true }
      )
    );

    await Promise.all(updates);

    const tasks = await ProjectTask.find({ userId: workspaceOwnerId, projectId })
      .sort({ order: 1 })
      .lean();

    res.json(tasks);
  })
);

// PUT /api/project-tasks/:id - Update task (admin, or member on own assigned task)
router.put(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const auth0Id = extractUserId(req);
    if (!auth0Id) throw createError('User ID not found in token', 401);

    const user = await loadActiveUser(auth0Id);
    if (!user) throw createError('User not found', 404);

    const isAdmin = user.role === 'admin';
    const isMember = user.role === 'member';

    if (!isAdmin && !isMember) {
      throw createError('Admin or member access required', 403);
    }

    const existing = await ProjectTask.findOne({
      _id: req.params.id,
      userId: workspaceOwnerId,
    });

    if (!existing) {
      throw createError('Project task not found', 404);
    }

    if (isMember) {
      const allowed = await memberHasProjectAccess(
        workspaceOwnerId,
        auth0Id,
        existing.projectId.toString()
      );
      if (!allowed) {
        throw createError('Project task not found', 404);
      }
      if (existing.assigneeAuth0Id && existing.assigneeAuth0Id !== auth0Id) {
        throw createError('You can only edit tasks assigned to you', 403);
      }
    }

    const { title, description, status, order, estimatedHours, clientVisible, assigneeAuth0Id } =
      req.body;

    const update: Record<string, unknown> = {};
    if (title !== undefined) update.title = title.trim();
    if (description !== undefined) update.description = description?.trim();
    if (status !== undefined) update.status = status;
    if (estimatedHours !== undefined) update.estimatedHours = estimatedHours;

    if (isAdmin) {
      if (order !== undefined) update.order = order;
      if (clientVisible !== undefined) update.clientVisible = Boolean(clientVisible);
      if (assigneeAuth0Id !== undefined) {
        update.assigneeAuth0Id = await validateOptionalWorkspaceMemberAuth0Id(
          workspaceOwnerId,
          assigneeAuth0Id
        );
      }
    }

    const task = await ProjectTask.findOneAndUpdate(
      { _id: req.params.id, userId: workspaceOwnerId },
      update,
      { new: true, runValidators: true }
    ).populate('projectId');

    if (!task) {
      throw createError('Project task not found', 404);
    }

    res.json(task);
  })
);

// PATCH /api/project-tasks/:id/status - Toggle task status
router.patch(
  '/:id/status',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const auth0Id = extractUserId(req);
    if (!auth0Id) throw createError('User ID not found in token', 401);

    const user = await loadActiveUser(auth0Id);
    if (!user) throw createError('User not found', 404);

    const isAdmin = user.role === 'admin';
    const isMember = user.role === 'member';

    if (!isAdmin && !isMember) {
      throw createError('Admin or member access required', 403);
    }

    const { status } = req.body;

    if (!status || !['TODO', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
      throw createError('Valid status is required (TODO, IN_PROGRESS, COMPLETED)', 400);
    }

    const existing = await ProjectTask.findOne({
      _id: req.params.id,
      userId: workspaceOwnerId,
    });

    if (!existing) {
      throw createError('Project task not found', 404);
    }

    if (isMember) {
      const allowed = await memberHasProjectAccess(
        workspaceOwnerId,
        auth0Id,
        existing.projectId.toString()
      );
      if (!allowed) {
        throw createError('Project task not found', 404);
      }
    }

    const task = await ProjectTask.findOneAndUpdate(
      { _id: req.params.id, userId: workspaceOwnerId },
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
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const task = await ProjectTask.findOneAndDelete({
      _id: req.params.id,
      userId: workspaceOwnerId,
    });

    if (!task) {
      throw createError('Project task not found', 404);
    }

    res.json({ message: 'Project task deleted successfully' });
  })
);

export default router;
