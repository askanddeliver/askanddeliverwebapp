import { Router, Response } from 'express';
import { checkJwt, AuthRequest, extractUserId } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { TimeEntry, Client, ITimeEntry, IProject, ITaskType } from '../models';

const router = Router();

// All routes require authentication
router.use(checkJwt);

// POST /api/reports/generate-invoice - Generate invoice data
router.post(
  '/generate-invoice',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { clientId, projectId, startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      throw createError('Start date and end date are required', 400);
    }

    // Build query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {
      userId,
      isRunning: false,
      startTime: {
        $gte: new Date(startDate),
        $lte: (() => {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          return end;
        })(),
      },
    };

    if (projectId) {
      query.projectId = projectId;
    }

    const entries = await TimeEntry.find(query)
      .populate({
        path: 'projectId',
        populate: { path: 'clientId' },
      })
      .populate('taskTypeId');

    // Filter by clientId if specified (need to check after population)
    let filteredEntries = entries;
    if (clientId) {
      filteredEntries = entries.filter((entry) => {
        const project = entry.projectId as unknown as IProject & { clientId: { _id: string } };
        return project?.clientId?._id?.toString() === clientId;
      });
    }

    // Get the client for discount calculation
    let client = null;
    if (clientId) {
      client = await Client.findOne({ _id: clientId, userId });
    }

    // Group entries by task type
    const lineItems = new Map<
      string,
      {
        taskTypeName: string;
        taskTypeColor: string;
        baseRate: number;
        discount: number;
        effectiveRate: number;
        hours: number;
        amount: number;
        descriptions: string[];
      }
    >();

    for (const entry of filteredEntries) {
      const taskType = entry.taskTypeId as unknown as ITaskType;
      if (!taskType) continue;

      const key = taskType._id.toString();
      const discount = client?.taskDiscounts?.get(key) || 0;
      const clampedDiscount = Math.min(100, Math.max(0, discount));
      const effectiveRate = taskType.rate * (1 - clampedDiscount / 100);
      const hours = (entry as ITimeEntry).duration / 3600;
      const amount = hours * effectiveRate;

      if (!lineItems.has(key)) {
        lineItems.set(key, {
          taskTypeName: taskType.name,
          taskTypeColor: taskType.color,
          baseRate: taskType.rate,
          discount: clampedDiscount,
          effectiveRate,
          hours: 0,
          amount: 0,
          descriptions: [],
        });
      }

      const item = lineItems.get(key)!;
      item.hours += hours;
      item.amount += amount;
      if ((entry as ITimeEntry).description) {
        item.descriptions.push((entry as ITimeEntry).description!);
      }
    }

    // Round values
    const items = Array.from(lineItems.values()).map((item) => ({
      ...item,
      hours: Math.round(item.hours * 100) / 100,
      amount: Math.round(item.amount * 100) / 100,
    }));

    const total = Math.round(
      items.reduce((sum, item) => sum + item.amount, 0) * 100
    ) / 100;

    const totalHours = Math.round(
      items.reduce((sum, item) => sum + item.hours, 0) * 100
    ) / 100;

    res.json({
      client: client || undefined,
      items,
      total,
      totalHours,
      entryCount: filteredEntries.length,
      dateRange: { start: startDate, end: endDate },
    });
  })
);

// GET /api/reports/summary - Get summary stats
router.get(
  '/summary',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { startDate, endDate } = req.query;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { userId, isRunning: false };

    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        query.startTime.$lte = end;
      }
    }

    const entries = await TimeEntry.find(query).lean();

    const totalSeconds = entries.reduce((sum, e) => sum + (e.duration || 0), 0);
    const totalHours = Math.round((totalSeconds / 3600) * 100) / 100;

    res.json({
      totalEntries: entries.length,
      totalHours,
      totalSeconds,
    });
  })
);

export default router;
