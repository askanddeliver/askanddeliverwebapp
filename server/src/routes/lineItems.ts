import { Router, Response } from 'express';
import { checkJwt, AuthRequest, extractUserId, requireAdmin } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { LineItem } from '../models';

const router = Router();

router.use(checkJwt);
router.use(requireAdmin);

// GET /api/line-items - List line items with optional filters
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { clientId, projectId, startDate, endDate } = req.query;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { userId };

    if (clientId) query.clientId = clientId;
    if (projectId) query.projectId = projectId;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date((startDate as string) + 'T00:00:00');
      if (endDate) query.date.$lte = new Date((endDate as string) + 'T23:59:59.999');
    }

    const items = await LineItem.find(query)
      .populate('clientId', 'name company')
      .populate('projectId', 'title')
      .sort({ date: -1 });

    res.json(items);
  })
);

// POST /api/line-items - Create a line item
router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { clientId, projectId, description, amount, category, date } = req.body;

    if (!clientId || !description || amount == null || !date) {
      throw createError('clientId, description, amount, and date are required', 400);
    }

    const item = await LineItem.create({
      userId,
      clientId,
      projectId: projectId || undefined,
      description,
      amount,
      category: category || undefined,
      date: new Date(date + 'T00:00:00'),
    });

    const populated = await LineItem.findById(item._id)
      .populate('clientId', 'name company')
      .populate('projectId', 'title');

    res.status(201).json(populated);
  })
);

// PUT /api/line-items/:id - Update a line item
router.put(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const item = await LineItem.findOne({ _id: req.params.id, userId });
    if (!item) throw createError('Line item not found', 404);

    const { clientId, projectId, description, amount, category, date } = req.body;

    if (clientId !== undefined) item.clientId = clientId;
    if (projectId !== undefined) item.projectId = projectId || undefined;
    if (description !== undefined) item.description = description;
    if (amount !== undefined) item.amount = amount;
    if (category !== undefined) item.category = category || undefined;
    if (date !== undefined) item.date = new Date(date + 'T00:00:00');

    await item.save();

    const populated = await LineItem.findById(item._id)
      .populate('clientId', 'name company')
      .populate('projectId', 'title');

    res.json(populated);
  })
);

// DELETE /api/line-items/:id - Delete a line item
router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const item = await LineItem.findOneAndDelete({ _id: req.params.id, userId });
    if (!item) throw createError('Line item not found', 404);

    res.json({ message: 'Line item deleted' });
  })
);

export default router;
