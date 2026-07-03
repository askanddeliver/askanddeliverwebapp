import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import {
  checkJwt,
  AuthRequest,
  extractUserId,
  requireAdmin,
  getWorkspaceOwnerId,
} from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { buildLeadResponsesFromSubmit } from '../lib/leadResponses';
import { validateIntakeSubmission } from '../lib/intakeValidation';
import { resolvePublicWorkspace } from '../lib/workspaceResolver';
import { uploadBufferToCloudinary } from '../lib/cloudinaryUpload';
import { Lead, Client, Project } from '../models';
import type { CreateLeadDto, ConvertLeadDto } from '../types';

const router = Router();

const INTAKE_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;
const INTAKE_ATTACHMENT_MAX_FILES = 5;
const INTAKE_UPLOAD_WINDOW_MS = 60 * 60 * 1000;

const INTAKE_ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/zip',
  'application/x-zip-compressed',
]);

const intakeAttachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: INTAKE_ATTACHMENT_MAX_BYTES,
    files: INTAKE_ATTACHMENT_MAX_FILES,
  },
  fileFilter: (_req, file, cb) => {
    if (INTAKE_ALLOWED_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed for intake attachments'));
    }
  },
});

async function requireWorkspaceOwnerId(req: AuthRequest): Promise<string> {
  const workspaceOwnerId = await getWorkspaceOwnerId(req);
  if (!workspaceOwnerId) {
    throw createError('No workspace found', 403);
  }
  return workspaceOwnerId;
}

// =============================================
// PUBLIC ROUTES (no auth required)
// =============================================

// POST /api/leads/public - Submit intake form
router.post(
  '/public',
  asyncHandler(async (req: Request, res: Response) => {
    const workspaceOwnerId = await resolvePublicWorkspace(req);
    if (!workspaceOwnerId) {
      throw createError(
        'Public intake is not configured. Set DEFAULT_PUBLIC_WORKSPACE_OWNER_ID on the server.',
        503
      );
    }

    const body = req.body as CreateLeadDto & {
      responses?: Record<string, unknown>;
      intakeFormId?: string;
      intakeFormVersion?: number;
    };

    if (body.intakeFormId) {
      const validated = await validateIntakeSubmission(workspaceOwnerId, body);
      const responses = buildLeadResponsesFromSubmit({
        ...body,
        confidence: validated.confidence,
        projectType: validated.projectType,
        description: validated.description,
        budget: validated.budget,
        timeline: validated.timeline,
        name: validated.name,
        email: validated.email,
        company: validated.company,
        message: validated.message,
        responses: validated.responses,
      });

      const lead = await Lead.create({
        userId: workspaceOwnerId,
        confidence: validated.confidence,
        projectType: validated.projectType,
        description: validated.description,
        budget: validated.budget,
        timeline: validated.timeline,
        name: validated.name,
        email: validated.email,
        company: validated.company,
        message: validated.message,
        responses,
        source: 'public',
        intakeFormId: new mongoose.Types.ObjectId(validated.intakeFormId),
        intakeFormVersion: validated.intakeFormVersion,
        status: 'NEW',
        priority: 'MEDIUM',
      });

      res.status(201).json({
        message: 'Thank you! Your inquiry has been received.',
        leadId: lead._id,
      });
      return;
    }

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
      intakeFormId,
      intakeFormVersion,
    } = body;

    if (!confidence || !['YES', 'MAYBE', 'UNSURE'].includes(confidence)) {
      throw createError('Valid confidence level is required', 400);
    }
    if (!name || !name.trim()) {
      throw createError('Name is required', 400);
    }
    if (!email || !email.trim()) {
      throw createError('Email is required', 400);
    }

    const responses = buildLeadResponsesFromSubmit(body);

    const lead = await Lead.create({
      userId: workspaceOwnerId,
      confidence,
      projectType: projectType?.trim() || '',
      description: description?.trim() || '',
      budget: budget?.trim() || '',
      timeline: timeline?.trim() || '',
      name: name.trim(),
      email: email.trim(),
      company: company?.trim() || '',
      message: message?.trim() || '',
      responses,
      source: 'public',
      ...(intakeFormId && mongoose.Types.ObjectId.isValid(intakeFormId)
        ? { intakeFormId: new mongoose.Types.ObjectId(intakeFormId) }
        : {}),
      ...(typeof intakeFormVersion === 'number' ? { intakeFormVersion } : {}),
      status: 'NEW',
      priority: 'MEDIUM',
    });

    res.status(201).json({
      message: 'Thank you! Your inquiry has been received.',
      leadId: lead._id,
    });
  })
);

// POST /api/leads/public/:leadId/attachments - Upload intake files after submit
router.post(
  '/public/:leadId/attachments',
  intakeAttachmentUpload.array('files', INTAKE_ATTACHMENT_MAX_FILES),
  asyncHandler(async (req: Request, res: Response) => {
    const workspaceOwnerId = await resolvePublicWorkspace(req);
    if (!workspaceOwnerId) {
      throw createError('Public intake is not configured', 503);
    }

    const { leadId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      throw createError('Invalid lead ID', 400);
    }

    const lead = await Lead.findOne({
      _id: leadId,
      userId: workspaceOwnerId,
      source: 'public',
    });

    if (!lead) {
      throw createError('Lead not found', 404);
    }

    const ageMs = Date.now() - lead.createdAt.getTime();
    if (ageMs > INTAKE_UPLOAD_WINDOW_MS) {
      throw createError('Attachment upload window has expired', 403);
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      throw createError('No files uploaded', 400);
    }

    const folder = `${workspaceOwnerId}/intake/${leadId}`;
    const uploaded = await Promise.all(
      files.map((file) =>
        uploadBufferToCloudinary(file.buffer, {
          folder,
          originalName: file.originalname,
          mimetype: file.mimetype,
        })
      )
    );

    const attachmentRecords = uploaded.map((u) => ({
      url: u.url,
      filename: u.filename,
      mimeType: u.mimeType,
      size: u.size,
    }));

    const existing = Array.isArray(lead.responses?.attachments)
      ? (lead.responses.attachments as unknown[])
      : [];

    lead.responses = {
      ...lead.responses,
      attachments: [...existing, ...attachmentRecords],
    };
    await lead.save();

    res.status(201).json({
      message: `${attachmentRecords.length} file(s) uploaded`,
      attachments: attachmentRecords,
    });
  })
);

// =============================================
// PROTECTED ROUTES (auth + admin required)
// =============================================

router.use(checkJwt);
router.use(requireAdmin);

// GET /api/leads/stats - Get lead counts by status
router.get(
  '/stats',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await requireWorkspaceOwnerId(req);

    const pipeline = await Lead.aggregate([
      { $match: { userId: workspaceOwnerId } },
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
    const workspaceOwnerId = await requireWorkspaceOwnerId(req);
    const { status, priority, search, sort } = req.query;

    const filter: Record<string, unknown> = { userId: workspaceOwnerId };

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

    let sortOption: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort === 'oldest') {
      sortOption = { createdAt: 1 };
    } else if (sort === 'priority') {
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
    const workspaceOwnerId = await requireWorkspaceOwnerId(req);

    const lead = await Lead.findOne({ _id: req.params.id, userId: workspaceOwnerId })
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
    const workspaceOwnerId = await requireWorkspaceOwnerId(req);

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

    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, userId: workspaceOwnerId },
      update,
      {
        new: true,
        runValidators: true,
      }
    );

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
    const workspaceOwnerId = await requireWorkspaceOwnerId(req);
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { text } = req.body;

    if (!text || !text.trim()) {
      throw createError('Note text is required', 400);
    }

    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, userId: workspaceOwnerId },
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
    const workspaceOwnerId = await requireWorkspaceOwnerId(req);

    const lead = await Lead.findOne({ _id: req.params.id, userId: workspaceOwnerId });

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

    if (!clientName || !clientName.trim()) {
      throw createError('Client name is required', 400);
    }
    if (!projectTitle || !projectTitle.trim()) {
      throw createError('Project title is required', 400);
    }

    const client = await Client.create({
      userId: workspaceOwnerId,
      name: clientName.trim(),
      company: clientCompany?.trim() || '',
      email: clientEmail?.trim() || '',
      taskDiscounts: {},
    });

    const project = await Project.create({
      userId: workspaceOwnerId,
      clientId: client._id,
      title: projectTitle.trim(),
      description: projectDescription?.trim() || '',
      status: 'ACTIVE',
      budget: projectBudget || undefined,
    });

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
    const workspaceOwnerId = await requireWorkspaceOwnerId(req);

    const lead = await Lead.findOneAndDelete({
      _id: req.params.id,
      userId: workspaceOwnerId,
    });

    if (!lead) {
      throw createError('Lead not found', 404);
    }

    res.json({ message: 'Lead deleted successfully' });
  })
);

export default router;
