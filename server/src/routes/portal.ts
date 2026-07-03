import { Router, Response } from 'express';
import mongoose from 'mongoose';
import {
  checkJwt,
  AuthRequest,
  requireClient,
} from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { Project, ProjectTask, ProjectMessage, SiteConfig } from '../models';
import {
  findClientProject,
  requirePortalContext,
  toPortalProjectSummary,
} from '../lib/portalScope';
import { portalProjectMessagesRouter } from './projectMessages';

const router = Router();

router.use(checkJwt);
router.use(requireClient);

async function openTaskCount(
  workspaceOwnerId: string,
  projectId: mongoose.Types.ObjectId
): Promise<number> {
  return ProjectTask.countDocuments({
    userId: workspaceOwnerId,
    projectId,
    clientVisible: true,
    status: { $ne: 'COMPLETED' },
  });
}

// GET /api/portal/dashboard
router.get(
  '/dashboard',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = await requirePortalContext(req);

    const clientProjectIds = await Project.find({
      userId: ctx.workspaceOwnerId,
      clientId: ctx.clientId,
      status: { $ne: 'ARCHIVED' },
    }).distinct('_id');

    const [config, projects, recentMessages] = await Promise.all([
      SiteConfig.findOne({ userId: ctx.workspaceOwnerId })
        .select('companyName companyEmail')
        .lean(),
      Project.find({
        userId: ctx.workspaceOwnerId,
        clientId: ctx.clientId,
        status: { $ne: 'ARCHIVED' },
      })
        .select('title excerpt status updatedAt')
        .sort({ updatedAt: -1 })
        .lean(),
      clientProjectIds.length > 0
        ? ProjectMessage.find({
            userId: ctx.workspaceOwnerId,
            projectId: { $in: clientProjectIds },
            clientVisible: true,
          })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('projectId', 'title')
            .lean()
        : Promise.resolve([]),
    ]);

    const activeProjects = projects.filter((p) =>
      ['ACTIVE', 'PAUSED'].includes(p.status)
    );

    const projectsWithCounts = await Promise.all(
      activeProjects.slice(0, 6).map(async (p) => ({
        ...toPortalProjectSummary(p),
        openTaskCount: await openTaskCount(ctx.workspaceOwnerId, p._id),
      }))
    );

    res.json({
      companyName: config?.companyName,
      companyEmail: config?.companyEmail,
      activeProjects: projectsWithCounts,
      recentUpdates: recentMessages.map((m) => ({
        _id: String(m._id),
        body: m.body,
        authorName: m.authorName,
        authorRole: m.authorRole,
        createdAt: m.createdAt,
        projectId: String(m.projectId),
        projectTitle:
          typeof m.projectId === 'object' && m.projectId && 'title' in m.projectId
            ? (m.projectId as { title: string }).title
            : undefined,
      })),
    });
  })
);

// GET /api/portal/projects
router.get(
  '/projects',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = await requirePortalContext(req);
    const statusFilter = req.query.status as string | undefined;

    const filter: Record<string, unknown> = {
      userId: ctx.workspaceOwnerId,
      clientId: ctx.clientId,
    };

    if (
      statusFilter &&
      statusFilter !== 'ALL' &&
      ['ACTIVE', 'PAUSED', 'COMPLETED'].includes(statusFilter)
    ) {
      filter.status = statusFilter;
    } else {
      filter.status = { $in: ['ACTIVE', 'PAUSED', 'COMPLETED'] };
    }

    const projects = await Project.find(filter)
      .select('title excerpt status updatedAt')
      .sort({ updatedAt: -1 })
      .lean();

    const projectsWithCounts = await Promise.all(
      projects.map(async (p) => ({
        ...toPortalProjectSummary(p),
        openTaskCount: await openTaskCount(ctx.workspaceOwnerId, p._id),
      }))
    );

    res.json({ projects: projectsWithCounts });
  })
);

// GET /api/portal/projects/:id
router.get(
  '/projects/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = await requirePortalContext(req);
    const project = await findClientProject(
      req.params.id,
      ctx.workspaceOwnerId,
      ctx.clientId
    );

    const tasks = await ProjectTask.find({
      userId: ctx.workspaceOwnerId,
      projectId: project._id,
      clientVisible: true,
    })
      .select('title description status order')
      .sort({ order: 1, createdAt: 1 })
      .lean();

    res.json({
      project: {
        _id: String(project._id),
        title: project.title,
        excerpt: project.excerpt,
        status: project.status,
        brief: project.brief,
        description: project.description,
        updatedAt: project.updatedAt,
      },
      tasks: tasks.map((t) => ({
        _id: String(t._id),
        title: t.title,
        description: t.description,
        status: t.status,
      })),
    });
  })
);

router.use('/projects/:projectId/messages', portalProjectMessagesRouter);

export default router;
