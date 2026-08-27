import { Router, Response } from 'express';
import {
  checkJwt,
  AuthRequest,
  extractUserId,
  getWorkspaceOwnerId,
  requireMemberOrAdmin,
} from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { ProjectTask, SiteConfig, TimeEntry } from '../models';
import { dashboardPeriodBoundsFromQuery } from '../utils/calculations';
import {
  findMemberProjects,
  stripProjectFinancials,
} from '../lib/memberProjects';
import memberTimeBlockRoutes from './memberTimeBlocks';

const router = Router();

router.use(checkJwt);
router.use(requireMemberOrAdmin);

router.use('/time-blocks', memberTimeBlockRoutes);

// GET /api/member/dashboard — stats for member hub (no financial data)
router.get(
  '/dashboard',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const auth0Id = extractUserId(req);
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!auth0Id || !workspaceOwnerId) {
      throw createError('Workspace access required', 403);
    }

    const { todayStart, todayEnd, weekStart, weekEnd } = dashboardPeriodBoundsFromQuery(
      req.query as Record<string, unknown>
    );

    const [todayEntries, weekEntries, projects] = await Promise.all([
      TimeEntry.find({
        userId: auth0Id,
        isRunning: false,
        startTime: { $gte: todayStart, $lt: todayEnd },
      })
        .select('duration')
        .lean(),
      TimeEntry.find({
        userId: auth0Id,
        isRunning: false,
        startTime: { $gte: weekStart, $lt: weekEnd },
      })
        .select('duration')
        .lean(),
      findMemberProjects(workspaceOwnerId, auth0Id),
    ]);

    const projectIds = projects.map((p) => p._id);
    const openTaskCount = await ProjectTask.countDocuments({
      projectId: { $in: projectIds },
      status: { $in: ['TODO', 'IN_PROGRESS'] },
    });

    const todaySeconds = todayEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
    const weekSeconds = weekEntries.reduce((sum, e) => sum + (e.duration || 0), 0);

    res.json({
      stats: {
        todaySeconds,
        weekSeconds,
        myProjectCount: projects.length,
        openTaskCount,
      },
    });
  })
);

// GET /api/member/projects — member-scoped project list (no financial fields)
router.get(
  '/projects',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const auth0Id = extractUserId(req);
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!auth0Id || !workspaceOwnerId) {
      throw createError('Workspace access required', 403);
    }

    const projects = await findMemberProjects(workspaceOwnerId, auth0Id);
    res.json(projects.map((p) => stripProjectFinancials(p as Record<string, unknown>)));
  })
);

// GET /api/member/disciplines — assignable taxonomy for profile editor
router.get(
  '/disciplines',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const config = await SiteConfig.findOne({ userId: workspaceOwnerId })
      .select('disciplines')
      .lean();

    const disciplines = (config?.disciplines || [])
      .filter((d) => d.assignableToMember)
      .map((d) => ({
        ...d,
        tasks: (d.tasks || []).filter((t) => t.assignableToMember),
      }))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    res.json(disciplines);
  })
);

export default router;
