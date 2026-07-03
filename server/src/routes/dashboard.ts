import { Router, Response } from 'express';
import {
  checkJwt,
  AuthRequest,
  getWorkspaceOwnerId,
  requireAdmin,
} from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { Lead } from '../models';
import {
  computeTimeTotals,
  computeUnbilledWip,
  computeProjectCounts,
  computeOpenTaskCount,
  computeInvoiceSummary,
  computeLeadStats,
  computeCapacity,
} from '../lib/dashboardAggregates';

const router = Router();

router.use(checkJwt);
router.use(requireAdmin);

// GET /api/dashboard/admin-summary
router.get(
  '/admin-summary',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const [
      timeTotals,
      unbilledWip,
      projectCounts,
      openTasks,
      invoices,
      leadStats,
    ] = await Promise.all([
      computeTimeTotals(workspaceOwnerId),
      computeUnbilledWip(workspaceOwnerId),
      computeProjectCounts(workspaceOwnerId),
      computeOpenTaskCount(workspaceOwnerId),
      computeInvoiceSummary(workspaceOwnerId),
      computeLeadStats(workspaceOwnerId),
    ]);

    const openLeads =
      (leadStats.NEW || 0) +
      (leadStats.CONTACTED || 0) +
      (leadStats.QUALIFIED || 0);

    let weekTrendPercent: number | null = null;
    if (timeTotals.lastWeekSeconds > 0) {
      weekTrendPercent = Math.round(
        ((timeTotals.weekSeconds - timeTotals.lastWeekSeconds) /
          timeTotals.lastWeekSeconds) *
          100
      );
    }

    res.json({
      todaySeconds: timeTotals.todaySeconds,
      weekSeconds: timeTotals.weekSeconds,
      lastWeekSeconds: timeTotals.lastWeekSeconds,
      weekTrendPercent,
      activeProjects: projectCounts.ACTIVE,
      pausedProjects: projectCounts.PAUSED,
      openTasks,
      openLeads,
      unbilledWip,
      outstanding: {
        count: invoices.sentCount,
        total: invoices.sentTotal,
      },
      invoiceAging: {
        oldestSentDays: invoices.oldestSentDays,
        sentCount: invoices.sentCount,
      },
    });
  })
);

// GET /api/dashboard/pipeline
router.get(
  '/pipeline',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const [stats, recent] = await Promise.all([
      computeLeadStats(workspaceOwnerId),
      Lead.find({
        userId: workspaceOwnerId,
        status: { $in: ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL'] },
      })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('name company status priority updatedAt createdAt')
        .lean(),
    ]);

    const total = Object.values(stats).reduce((sum, n) => sum + n, 0);

    res.json({
      stats: { ...stats, TOTAL: total },
      recent: recent.map((l) => ({
        _id: String(l._id),
        name: l.name,
        company: l.company,
        status: l.status,
        priority: l.priority,
        updatedAt: l.updatedAt,
        createdAt: l.createdAt,
      })),
    });
  })
);

// GET /api/dashboard/capacity — team availability vs. assignments and logged time
router.get(
  '/capacity',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const capacity = await computeCapacity(workspaceOwnerId);
    res.json(capacity);
  })
);

export default router;
