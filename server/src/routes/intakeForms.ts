import { Router, Request, Response } from 'express';
import {
  checkJwt,
  AuthRequest,
  requireAdmin,
  getWorkspaceOwnerId,
} from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import {
  buildDefaultIntakeFormPayload,
  DEFAULT_INTAKE_SLUG,
} from '../lib/defaultIntakeFormSeed';
import { resolvePublicWorkspace } from '../lib/workspaceResolver';
import { enrichIntakeFormDisciplines } from '../lib/disciplines';
import { IntakeForm } from '../models/IntakeForm';
import { SiteConfig } from '../models/SiteConfig';
import type { IIntakeForm, IIntakeStep } from '../models/IntakeForm';

const router = Router();

async function requireWorkspaceOwnerId(req: AuthRequest): Promise<string> {
  const workspaceOwnerId = await getWorkspaceOwnerId(req);
  if (!workspaceOwnerId) {
    throw createError('No workspace found', 403);
  }
  return workspaceOwnerId;
}

function validateSteps(steps: IIntakeStep[]): void {
  if (!Array.isArray(steps) || steps.length === 0) {
    throw createError('At least one step is required', 400);
  }

  const stepIds = new Set<string>();
  for (const step of steps) {
    if (!step.id?.trim()) {
      throw createError('Each step must have an id', 400);
    }
    if (!step.title?.trim()) {
      throw createError('Each step must have a title', 400);
    }
    if (stepIds.has(step.id)) {
      throw createError(`Duplicate step id: ${step.id}`, 400);
    }
    stepIds.add(step.id);

    const fieldKeys = new Set<string>();
    for (const field of step.fields || []) {
      if (!field.key?.trim()) {
        throw createError('Each field must have a key', 400);
      }
      if (!field.label?.trim()) {
        throw createError(`Field ${field.key} must have a label`, 400);
      }
      if (fieldKeys.has(field.key)) {
        throw createError(`Duplicate field key in step ${step.id}: ${field.key}`, 400);
      }
      fieldKeys.add(field.key);
    }
  }
}

function toPublicForm(form: {
  _id: unknown;
  slug: string;
  version: number;
  title: string;
  subtitle?: string;
  successMessage?: string;
  successCtaLabel?: string;
  successCtaUrl?: string;
  submitButtonLabel?: string;
  steps: IIntakeStep[];
  publishedAt?: Date;
}) {
  return {
    _id: form._id,
    slug: form.slug,
    version: form.version,
    title: form.title,
    subtitle: form.subtitle,
    successMessage: form.successMessage,
    successCtaLabel: form.successCtaLabel,
    successCtaUrl: form.successCtaUrl,
    submitButtonLabel: form.submitButtonLabel,
    steps: form.steps,
    publishedAt: form.publishedAt,
  };
}

// =============================================
// PUBLIC ROUTES
// =============================================

router.get(
  '/public',
  asyncHandler(async (req: Request, res: Response) => {
    const slug = (req.query.slug as string)?.trim() || DEFAULT_INTAKE_SLUG;
    const workspaceOwnerId = await resolvePublicWorkspace(req);
    if (!workspaceOwnerId) {
      throw createError(
        'Public intake is not configured. Set DEFAULT_PUBLIC_WORKSPACE_OWNER_ID on the server.',
        503
      );
    }

    const form = await IntakeForm.findOne({
      userId: workspaceOwnerId,
      slug: slug.toLowerCase(),
      status: 'PUBLISHED',
    }).lean();

    if (!form) {
      throw createError('Published intake form not found', 404);
    }

    const siteConfig = await SiteConfig.findOne({ userId: workspaceOwnerId })
      .select('disciplines')
      .lean();

    const enriched = enrichIntakeFormDisciplines(form, siteConfig);

    res.json(toPublicForm(enriched));
  })
);

// =============================================
// ADMIN ROUTES
// =============================================

router.use(checkJwt);
router.use(requireAdmin);

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await requireWorkspaceOwnerId(req);
    const forms = await IntakeForm.find({ userId: workspaceOwnerId })
      .sort({ slug: 1 })
      .lean();
    res.json(forms);
  })
);

router.get(
  '/default',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await requireWorkspaceOwnerId(req);

    let form = await IntakeForm.findOne({
      userId: workspaceOwnerId,
      slug: DEFAULT_INTAKE_SLUG,
    });

    if (!form) {
      form = await IntakeForm.create(
        buildDefaultIntakeFormPayload(workspaceOwnerId, 'PUBLISHED', 1)
      );
    }

    res.json(form);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await requireWorkspaceOwnerId(req);
    const form = await IntakeForm.findOne({
      _id: req.params.id,
      userId: workspaceOwnerId,
    }).lean();

    if (!form) {
      throw createError('Intake form not found', 404);
    }

    res.json(form);
  })
);

router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await requireWorkspaceOwnerId(req);
    const slug = (req.body.slug as string)?.trim()?.toLowerCase() || DEFAULT_INTAKE_SLUG;

    const existing = await IntakeForm.findOne({ userId: workspaceOwnerId, slug });
    if (existing) {
      throw createError(`Intake form with slug "${slug}" already exists`, 409);
    }

    const { title, subtitle, successMessage, successCtaLabel, successCtaUrl, submitButtonLabel, steps } =
      req.body;

    if (!title?.trim()) {
      throw createError('Title is required', 400);
    }

    validateSteps(steps || []);

    const form = await IntakeForm.create({
      userId: workspaceOwnerId,
      slug,
      status: 'DRAFT',
      version: 0,
      title: title.trim(),
      subtitle: subtitle?.trim(),
      successMessage: successMessage?.trim(),
      successCtaLabel: successCtaLabel?.trim(),
      successCtaUrl: successCtaUrl?.trim(),
      submitButtonLabel: submitButtonLabel?.trim(),
      steps: steps || [],
    });

    res.status(201).json(form);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await requireWorkspaceOwnerId(req);
    const form = await IntakeForm.findOne({
      _id: req.params.id,
      userId: workspaceOwnerId,
    });

    if (!form) {
      throw createError('Intake form not found', 404);
    }

    const {
      title,
      subtitle,
      successMessage,
      successCtaLabel,
      successCtaUrl,
      submitButtonLabel,
      steps,
    } = req.body;

    if (title !== undefined) {
      if (!title?.trim()) throw createError('Title is required', 400);
      form.title = title.trim();
    }
    if (subtitle !== undefined) form.subtitle = subtitle?.trim() || '';
    if (successMessage !== undefined) form.successMessage = successMessage?.trim() || '';
    if (successCtaLabel !== undefined) form.successCtaLabel = successCtaLabel?.trim() || '';
    if (successCtaUrl !== undefined) form.successCtaUrl = successCtaUrl?.trim() || '';
    if (submitButtonLabel !== undefined) {
      form.submitButtonLabel = submitButtonLabel?.trim() || '';
    }
    if (steps !== undefined) {
      validateSteps(steps);
      form.steps = steps;
    }

    await form.save();
    res.json(form);
  })
);

router.post(
  '/:id/publish',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await requireWorkspaceOwnerId(req);
    const form = await IntakeForm.findOne({
      _id: req.params.id,
      userId: workspaceOwnerId,
    });

    if (!form) {
      throw createError('Intake form not found', 404);
    }

    validateSteps(form.steps);

    form.status = 'PUBLISHED';
    form.version = (form.version || 0) + 1;
    form.publishedAt = new Date();
    await form.save();

    res.json(form);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await requireWorkspaceOwnerId(req);
    const form = await IntakeForm.findOneAndDelete({
      _id: req.params.id,
      userId: workspaceOwnerId,
    });

    if (!form) {
      throw createError('Intake form not found', 404);
    }

    res.json({ message: 'Intake form deleted' });
  })
);

export default router;
