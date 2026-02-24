import { Router, Response } from 'express';
import { checkJwt, AuthRequest, extractUserId, requireAdmin } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { Client } from '../models';

const router = Router();

// All routes require authentication + admin
router.use(checkJwt);
router.use(requireAdmin);

// GET /api/clients - Get all clients for current user
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const clients = await Client.find({ userId }).sort({ createdAt: -1 }).lean();
    res.json(clients);
  })
);

// GET /api/clients/:id - Get single client
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const client = await Client.findOne({
      _id: req.params.id,
      userId,
    });

    if (!client) {
      throw createError('Client not found', 404);
    }

    res.json(client);
  })
);

// POST /api/clients - Create client
router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { name, company, email, taskDiscounts } = req.body;

    if (!name || !name.trim()) {
      throw createError('Client name is required', 400);
    }

    const client = await Client.create({
      userId,
      name: name.trim(),
      company: company?.trim(),
      email: email?.trim(),
      taskDiscounts: taskDiscounts || {},
    });

    res.status(201).json(client);
  })
);

// PUT /api/clients/:id - Update client
router.put(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { name, company, email, taskDiscounts } = req.body;

    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name.trim();
    if (company !== undefined) update.company = company?.trim();
    if (email !== undefined) update.email = email?.trim();
    if (taskDiscounts !== undefined) update.taskDiscounts = taskDiscounts;

    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, userId },
      update,
      { new: true, runValidators: true }
    );

    if (!client) {
      throw createError('Client not found', 404);
    }

    res.json(client);
  })
);

// DELETE /api/clients/:id - Delete client
router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const client = await Client.findOneAndDelete({
      _id: req.params.id,
      userId,
    });

    if (!client) {
      throw createError('Client not found', 404);
    }

    res.json({ message: 'Client deleted successfully' });
  })
);

export default router;
