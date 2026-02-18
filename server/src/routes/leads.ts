import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { checkJwt, AuthRequest, extractUserId } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { Lead, Client, Project } from '../models';
import type { CreateLeadDto, ConvertLeadDto } from '../types';

const router = Router();

// =============================================
// PUBLIC ROUTES (no auth required)
// =============================================

// POST /api/leads/public - Submit intake form
router.post(
  '/public',
  asyncHandler(async (req: Request, res: Response) => {
    const {
      confidence,
      projectType,
      description,
      budget,
      timeline,
      name,
      email,
      company,
      message,
    } = req.body as CreateLeadDto;

    // Validate required fields
    if (!confidence || !['YES', 'MAYBE', 'UNSURE'].includes(confidence)) {
      throw createError('Valid confidence level is required', 400);
    }
    if (!name || !name.trim()) {
      throw createError('Name is required', 400);
    }
    if (!email || !email.trim()) {
      throw createError('Email is required', 400);
    }

    const lead = await Lead.create({
      confidence,
      projectType: projectType?.trim() || '',
      description: description?.trim() || '',
      budget: budget?.trim() || '',
      timeline: timeline?.trim() || '',
      name: name.trim(),
      email: email.trim(),
      company: company?.trim() || '',
      message: message?.trim() || '',
      status: 'NEW',
      priority: 'MEDIUM',
    });

    res.status(201).json({
      message: 'Thank you! Your inquiry has been received.',
      leadId: lead._id,
    });
  })
);

// =============================================
// PROTECTED ROUTES (auth required)
// =============================================

// Apply auth middleware to all routes below
router.use(checkJwt);

// GET /api/leads/stats - Get lead counts by status
router.get(
  '/stats',
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const pipeline = await Lead.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const stats: Record<string, number> = {
      NEW: 0,
      CONTACTED: 0,
      QUALIFIED: 0,
      PROPOSAL: 0,
      WON: 0,
      LOST: 0,
    };

    pipeline.forEach((item: { _id: string; count: number }) => {
      stats[item._id] = item.count;
    });

    const total = Object.values(stats).reduce((sum, count) => sum + count, 0);

    res.json({ ...stats, TOTAL: total });
  })
);

// GET /api/leads - List all leads with optional filters
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, priority, search, sort } = req.query;

    // Build query filter
    const filter: Record<string, unknown> = {};

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { company: searchRegex },
        { description: searchRegex },
      ];
    }

    // Build sort
    let sortOption: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort === 'oldest') {
      sortOption = { createdAt: 1 };
    } else if (sort === 'priority') {
      // HIGH first, then MEDIUM, then LOW
      sortOption = { priority: -1, createdAt: -1 };
    }

    const leads = await Lead.find(filter).sort(sortOption).lean();

    res.json(leads);
  })
);

// GET /api/leads/:id - Get single lead
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const lead = await Lead.findById(req.params.id)
      .populate('convertedClientId')
      .populate('convertedProjectId')
      .lean();

    if (!lead) {
      throw createError('Lead not found', 404);
    }

    res.json(lead);
  })
);

// PUT /api/leads/:id - Update lead fields
router.put(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      status,
      priority,
      projectType,
      description,
      budget,
      timeline,
      name,
      email,
      company,
      message,
    } = req.body;

    const update: Record<string, unknown> = {};
    if (status !== undefined) update.status = status;
    if (priority !== undefined) update.priority = priority;
    if (projectType !== undefined) update.projectType = projectType?.trim();
    if (description !== undefined) update.description = description?.trim();
    if (budget !== undefined) update.budget = budget?.trim();
    if (timeline !== undefined) update.timeline = timeline?.trim();
    if (name !== undefined) update.name = name?.trim();
    if (email !== undefined) update.email = email?.trim();
    if (company !== undefined) update.company = company?.trim();
    if (message !== undefined) update.message = message?.trim();

    const lead = await Lead.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!lead) {
      throw createError('Lead not found', 404);
    }

    res.json(lead);
  })
);

// POST /api/leads/:id/notes - Add a note to a lead
router.post(
  '/:id/notes',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { text } = req.body;

    if (!text || !text.trim()) {
      throw createError('Note text is required', 400);
    }

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          notes: {
            text: text.trim(),
            createdAt: new Date(),
            createdBy: userId,
          },
        },
      },
      { new: true, runValidators: true }
    );

    if (!lead) {
      throw createError('Lead not found', 404);
    }

    res.json(lead);
  })
);

// POST /api/leads/:id/convert - Convert lead to Client + Project
router.post(
  '/:id/convert',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      throw createError('Lead not found', 404);
    }

    if (lead.convertedClientId) {
      throw createError('Lead has already been converted', 400);
    }

    const {
      clientName,
      clientCompany,
      clientEmail,
      projectTitle,
      projectDescription,
      projectBudget,
    } = req.body as ConvertLeadDto;

    // Validate required fields
    if (!clientName || !clientName.trim()) {
      throw createError('Client name is required', 400);
    }
    if (!projectTitle || !projectTitle.trim()) {
      throw createError('Project title is required', 400);
    }

    // Create the Client
    const client = await Client.create({
      userId,
      name: clientName.trim(),
      company: clientCompany?.trim() || '',
      email: clientEmail?.trim() || '',
      taskDiscounts: {},
    });

    // Create the Project
    const project = await Project.create({
      userId,
      clientId: client._id,
      title: projectTitle.trim(),
      description: projectDescription?.trim() || '',
      status: 'ACTIVE',
      budget: projectBudget || undefined,
    });

    // Update the lead with conversion references
    lead.status = 'WON';
    lead.convertedClientId = client._id as mongoose.Types.ObjectId;
    lead.convertedProjectId = project._id as mongoose.Types.ObjectId;
    await lead.save();

    res.status(201).json({
      message: 'Lead converted successfully',
      lead,
      client,
      project,
    });
  })
);

// DELETE /api/leads/:id - Delete a lead
router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const lead = await Lead.findByIdAndDelete(req.params.id);

    if (!lead) {
      throw createError('Lead not found', 404);
    }

    res.json({ message: 'Lead deleted successfully' });
  })
);

export default router;
