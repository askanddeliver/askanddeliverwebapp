import { Router, Response } from 'express';
import { checkJwt, AuthRequest, extractUserId, requireAdmin } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { FilterPreset } from '../models';
import { sanitizeReportCsvColumns } from '../utils/reportColumns';
import type { FilterPresetDatePreset, FilterPresetKind } from '../models/FilterPreset';

const router = Router();
router.use(checkJwt);
router.use(requireAdmin);

const DATE_PRESETS: FilterPresetDatePreset[] = [
  'all_time',
  'this_month',
  'last_month',
  'this_week',
  'last_week',
  'last_7',
  'last_30',
];

const BILLING_MODES = ['HOURLY', 'FIXED_PRICE', 'HOUR_RETAINER'] as const;

function isDuplicateKeyError(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && 'code' in err && (err as { code?: number }).code === 11000);
}

function asStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return [...new Set(val.map(String).map((s) => s.trim()).filter(Boolean))];
}

function parseDateField(val: unknown, label: string): string {
  if (val == null || val === '') return '';
  if (typeof val !== 'string') throw createError(`${label} must be a string`, 400);
  const s = val.trim();
  if (!s) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw createError(`${label} must be YYYY-MM-DD or empty`, 400);
  }
  return s;
}

function parsePresetBody(body: Record<string, unknown>, { partial }: { partial: boolean }) {
  const patch: Record<string, unknown> = {};

  if (!partial || body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw createError('Name is required', 400);
    if (name.length > 80) throw createError('Name must be 80 characters or fewer', 400);
    patch.name = name;
  }

  if (!partial || body.kind !== undefined) {
    const kind = (body.kind as string) || 'REPORT';
    if (kind !== 'REPORT' && kind !== 'BACKUP') {
      throw createError('kind must be REPORT or BACKUP', 400);
    }
    patch.kind = kind as FilterPresetKind;
  }

  if (!partial || body.clientIds !== undefined) {
    patch.clientIds = asStringArray(body.clientIds);
  }
  if (!partial || body.projectIds !== undefined) {
    patch.projectIds = asStringArray(body.projectIds);
  }
  if (!partial || body.billingModes !== undefined) {
    patch.billingModes = asStringArray(body.billingModes).filter(
      (m): m is (typeof BILLING_MODES)[number] =>
        m === 'HOURLY' || m === 'FIXED_PRICE' || m === 'HOUR_RETAINER'
    );
  }
  if (!partial || body.memberAuth0Ids !== undefined) {
    patch.memberAuth0Ids = asStringArray(body.memberAuth0Ids);
  }

  if (!partial || body.datePreset !== undefined) {
    const raw = body.datePreset;
    if (raw == null || raw === '') {
      patch.datePreset = null;
    } else if (typeof raw === 'string' && DATE_PRESETS.includes(raw as FilterPresetDatePreset)) {
      patch.datePreset = raw;
    } else {
      throw createError('Invalid datePreset', 400);
    }
  }

  if (!partial || body.startDate !== undefined) {
    patch.startDate = parseDateField(body.startDate, 'startDate');
  }
  if (!partial || body.endDate !== undefined) {
    patch.endDate = parseDateField(body.endDate, 'endDate');
  }

  const startDate = (patch.startDate as string | undefined);
  const endDate = (patch.endDate as string | undefined);
  if (startDate !== undefined || endDate !== undefined) {
    const start = startDate ?? '';
    const end = endDate ?? '';
    if (Boolean(start) !== Boolean(end)) {
      throw createError('Start date and end date are both required, or omit both for all time', 400);
    }
  }

  if (!partial || body.columnIds !== undefined) {
    patch.columnIds = sanitizeReportCsvColumns(body.columnIds);
  }
  if (!partial || body.includeTimeEntries !== undefined) {
    patch.includeTimeEntries = Boolean(body.includeTimeEntries);
  }
  if (!partial || body.includeEntryDescriptions !== undefined) {
    patch.includeEntryDescriptions = Boolean(body.includeEntryDescriptions);
  }

  return patch;
}

async function findOwned(req: AuthRequest, id: string) {
  const userId = extractUserId(req);
  if (!userId) throw createError('Unauthorized', 401);
  const preset = await FilterPreset.findOne({ _id: id, userId });
  if (!preset) throw createError('Preset not found', 404);
  return preset;
}

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('Unauthorized', 401);

    const kind = typeof req.query.kind === 'string' ? req.query.kind : undefined;
    const query: { userId: string; kind?: FilterPresetKind } = { userId };
    if (kind === 'REPORT' || kind === 'BACKUP') query.kind = kind;

    const presets = await FilterPreset.find(query).sort({ name: 1 });
    res.json(presets);
  })
);

router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('Unauthorized', 401);

    const patch = parsePresetBody(req.body || {}, { partial: false });
    try {
      const preset = await FilterPreset.create({ ...patch, userId });
      res.status(201).json(preset);
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw createError('A preset with that name already exists', 409);
      }
      throw err;
    }
  })
);

router.put(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const preset = await findOwned(req, req.params.id);
    const patch = parsePresetBody(req.body || {}, { partial: false });
    Object.assign(preset, patch);
    try {
      await preset.save();
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw createError('A preset with that name already exists', 409);
      }
      throw err;
    }
    res.json(preset);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const preset = await findOwned(req, req.params.id);
    await preset.deleteOne();
    res.json({ message: 'Preset deleted' });
  })
);

export default router;
