import { Router, Response } from 'express';
import { checkJwt, AuthRequest, extractUserId, getWorkspaceOwnerId, requireAdmin } from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { SiteConfig } from '../models';

const router = Router();

// Default colors matching the original tailwind config
const DEFAULT_COLORS = {
  brandSage: '#5B7765',
  brandSageLight: '#7A9A87',
  brandSageDark: '#3D5446',
  brandCharcoal: '#2A2A2A',
  brandCream: '#F7F5F2',
  brandCreamDark: '#EDE9E3',
  accentWarm: '#E8A87C',
  accentCool: '#6B9BAE',
};

// ---- PUBLIC (no auth) ----

// GET /api/site-config/public - Get active theme colors (for public site)
router.get(
  '/public',
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    // Find the first site config (single-tenant for now)
    const config = await SiteConfig.findOne().select('colors').lean();
    res.json(config?.colors || DEFAULT_COLORS);
  })
);

// ---- AUTHENTICATED (admin only) ----
router.use(checkJwt);
router.use(requireAdmin);

// GET /api/site-config - Get site config for current user
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    let config = await SiteConfig.findOne({ userId }).lean();

    if (!config) {
      // Return defaults if no config exists yet
      res.json({
        colors: DEFAULT_COLORS,
        palettes: [],
      });
      return;
    }

    res.json(config);
  })
);

// PUT /api/site-config/colors - Update active colors
router.put(
  '/colors',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { colors } = req.body;
    if (!colors) throw createError('Colors object is required', 400);

    const config = await SiteConfig.findOneAndUpdate(
      { userId },
      { $set: { colors } },
      { new: true, upsert: true, runValidators: true }
    );

    res.json(config);
  })
);

// PUT /api/site-config/reset - Reset colors to defaults
router.put(
  '/reset',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const config = await SiteConfig.findOneAndUpdate(
      { userId },
      { $set: { colors: DEFAULT_COLORS } },
      { new: true, upsert: true }
    );

    res.json(config);
  })
);

// PUT /api/site-config/company - Update company info for invoices
router.put(
  '/company',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const workspaceOwnerId = await getWorkspaceOwnerId(req);
    if (!workspaceOwnerId) throw createError('Workspace access required', 403);

    const { companyName, companyAddress, companyPhone, companyEmail } = req.body;

    const config = await SiteConfig.findOneAndUpdate(
      { userId: workspaceOwnerId },
      {
        $set: {
          ...(companyName !== undefined && { companyName: companyName?.trim() || '' }),
          ...(companyAddress !== undefined && { companyAddress: companyAddress?.trim() || '' }),
          ...(companyPhone !== undefined && { companyPhone: companyPhone?.trim() || '' }),
          ...(companyEmail !== undefined && { companyEmail: companyEmail?.trim()?.toLowerCase() || '' }),
        },
      },
      { new: true, upsert: true }
    );

    res.json(config);
  })
);

// ---- PALETTE MANAGEMENT ----

// POST /api/site-config/palettes - Save current colors as a named palette
router.post(
  '/palettes',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { name, colors } = req.body;
    if (!name?.trim()) throw createError('Palette name is required', 400);
    if (!colors) throw createError('Colors object is required', 400);

    const config = await SiteConfig.findOneAndUpdate(
      { userId },
      {
        $push: {
          palettes: { name: name.trim(), colors, createdAt: new Date() },
        },
      },
      { new: true, upsert: true }
    );

    res.status(201).json(config);
  })
);

// PUT /api/site-config/palettes/:paletteId - Rename a palette
router.put(
  '/palettes/:paletteId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const { name } = req.body;
    if (!name?.trim()) throw createError('Palette name is required', 400);

    const config = await SiteConfig.findOneAndUpdate(
      { userId, 'palettes._id': req.params.paletteId },
      { $set: { 'palettes.$.name': name.trim() } },
      { new: true }
    );

    if (!config) throw createError('Palette not found', 404);
    res.json(config);
  })
);

// DELETE /api/site-config/palettes/:paletteId - Delete a palette
router.delete(
  '/palettes/:paletteId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = extractUserId(req);
    if (!userId) throw createError('User ID not found in token', 401);

    const config = await SiteConfig.findOneAndUpdate(
      { userId },
      { $pull: { palettes: { _id: req.params.paletteId } } },
      { new: true }
    );

    if (!config) throw createError('Site config not found', 404);
    res.json(config);
  })
);

export default router;
