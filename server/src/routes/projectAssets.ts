import { Router, Response } from 'express';
import {
  checkJwt,
  AuthRequest,
  extractUserId,
  getWorkspaceOwnerId,
  requireClient,
  requireMemberOrAdmin,
} from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { Project, User, ProjectAsset } from '../models';
import { findClientProject, requirePortalContext } from '../lib/portalScope';
import { memberHasProjectAccess } from '../lib/memberProjects';
import {
  destroyCloudinaryUpload,
  uploadBufferToCloudinary,
} from '../lib/cloudinaryUpload';
import { projectAssetUpload } from '../lib/projectAssetUpload';
import type { ProjectAssetAuthorRole } from '../models/ProjectAsset';

const router = Router({ mergeParams: true });

router.use(checkJwt);
router.use(requireMemberOrAdmin);

async function loadWorkspaceProject(req: AuthRequest, projectId: string) {
  const auth0Id = extractUserId(req);
  const workspaceOwnerId = await getWorkspaceOwnerId(req);
  if (!auth0Id || !workspaceOwnerId) {
    throw createError('Workspace access required', 403);
  }

  const project = await Project.findOne({
    _id: projectId,
    userId: workspaceOwnerId,
  }).lean();

  if (!project) {
    throw createError('Project not found', 404);
  }

  const user = await User.findOne({ auth0Id }).lean();
  if (!user) throw createError('User not found', 404);

  if (user.role === 'member') {
    const allowed = await memberHasProjectAccess(workspaceOwnerId, auth0Id, projectId);
    if (!allowed) throw createError('Project not found', 404);
  }

  return { auth0Id, workspaceOwnerId, user, project };
}

function sanitizeOriginalName(name: string): string {
  const trimmed = name.trim().slice(0, 255);
  return trimmed || 'file';
}

async function createAssetFromUpload(opts: {
  file: Express.Multer.File;
  workspaceOwnerId: string;
  projectId: string;
  auth0Id: string;
  userName: string;
  authorRole: ProjectAssetAuthorRole;
  clientVisible: boolean;
}): Promise<InstanceType<typeof ProjectAsset>> {
  const originalName = sanitizeOriginalName(opts.file.originalname);
  const uploaded = await uploadBufferToCloudinary(opts.file.buffer, {
    folder: `${opts.workspaceOwnerId}/projects/${opts.projectId}/assets`,
    originalName,
    mimetype: opts.file.mimetype,
  });

  return ProjectAsset.create({
    userId: opts.workspaceOwnerId,
    projectId: opts.projectId,
    uploadedByAuth0Id: opts.auth0Id,
    uploadedByName: opts.userName,
    uploadedByRole: opts.authorRole,
    originalName,
    mimeType: opts.file.mimetype,
    size: uploaded.size,
    cloudinaryPublicId: uploaded.publicId,
    resourceType: uploaded.resourceType,
    url: uploaded.url,
    clientVisible: opts.clientVisible,
  });
}

async function destroyStoredFile(asset: {
  cloudinaryPublicId: string;
  resourceType: 'image' | 'raw' | 'video';
}): Promise<void> {
  try {
    await destroyCloudinaryUpload(asset.cloudinaryPublicId, asset.resourceType);
  } catch (err) {
    console.error('Failed to destroy Cloudinary asset:', err);
  }
}

function canDeleteAsset(
  role: string | undefined,
  auth0Id: string,
  uploadedByAuth0Id: string
): boolean {
  if (role === 'admin') return true;
  return uploadedByAuth0Id === auth0Id;
}

// GET /api/projects/:projectId/assets
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = req.params.projectId;
    const { workspaceOwnerId } = await loadWorkspaceProject(req, projectId);

    const assets = await ProjectAsset.find({
      userId: workspaceOwnerId,
      projectId,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json(assets);
  })
);

// POST /api/projects/:projectId/assets
router.post(
  '/',
  projectAssetUpload,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = req.params.projectId;
    const { auth0Id, workspaceOwnerId, user } = await loadWorkspaceProject(
      req,
      projectId
    );

    if (!req.file) throw createError('File is required', 400);

    const authorRole: ProjectAssetAuthorRole =
      user.role === 'admin' ? 'admin' : 'member';
    const asset = await createAssetFromUpload({
      file: req.file,
      workspaceOwnerId,
      projectId,
      auth0Id,
      userName: user.name,
      authorRole,
      clientVisible: false,
    });

    res.status(201).json(asset);
  })
);

// PATCH /api/projects/:projectId/assets/:assetId
router.patch(
  '/:assetId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = req.params.projectId;
    const { workspaceOwnerId } = await loadWorkspaceProject(req, projectId);

    if (typeof req.body?.clientVisible !== 'boolean') {
      throw createError('clientVisible is required', 400);
    }

    const asset = await ProjectAsset.findOne({
      _id: req.params.assetId,
      userId: workspaceOwnerId,
      projectId,
    });

    if (!asset) throw createError('File not found', 404);

    if (asset.uploadedByRole === 'client' && !req.body.clientVisible) {
      throw createError('Client uploads stay visible to the client', 400);
    }

    asset.clientVisible = req.body.clientVisible;
    await asset.save();
    res.json(asset);
  })
);

// DELETE /api/projects/:projectId/assets/:assetId
router.delete(
  '/:assetId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = req.params.projectId;
    const { auth0Id, workspaceOwnerId, user } = await loadWorkspaceProject(
      req,
      projectId
    );

    const asset = await ProjectAsset.findOne({
      _id: req.params.assetId,
      userId: workspaceOwnerId,
      projectId,
    });

    if (!asset) throw createError('File not found', 404);

    if (!canDeleteAsset(user.role, auth0Id, asset.uploadedByAuth0Id)) {
      throw createError('You can only delete files you uploaded', 403);
    }

    await destroyStoredFile(asset);
    await asset.deleteOne();
    res.json({ message: 'File deleted' });
  })
);

export default router;

export const portalProjectAssetsRouter = Router({ mergeParams: true });

portalProjectAssetsRouter.use(checkJwt);
portalProjectAssetsRouter.use(requireClient);

portalProjectAssetsRouter.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = await requirePortalContext(req);
    const projectId = req.params.projectId;
    await findClientProject(projectId, ctx.workspaceOwnerId, ctx.clientId);

    const assets = await ProjectAsset.find({
      userId: ctx.workspaceOwnerId,
      projectId,
      clientVisible: true,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json(assets);
  })
);

portalProjectAssetsRouter.post(
  '/',
  projectAssetUpload,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = await requirePortalContext(req);
    const projectId = req.params.projectId;
    await findClientProject(projectId, ctx.workspaceOwnerId, ctx.clientId);

    if (!req.file) throw createError('File is required', 400);

    const user = await User.findOne({ auth0Id: ctx.auth0Id }).lean();
    if (!user) throw createError('User not found', 404);

    const asset = await createAssetFromUpload({
      file: req.file,
      workspaceOwnerId: ctx.workspaceOwnerId,
      projectId,
      auth0Id: ctx.auth0Id,
      userName: user.name,
      authorRole: 'client',
      clientVisible: true,
    });

    res.status(201).json(asset);
  })
);

portalProjectAssetsRouter.delete(
  '/:assetId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = await requirePortalContext(req);
    const projectId = req.params.projectId;
    await findClientProject(projectId, ctx.workspaceOwnerId, ctx.clientId);

    const asset = await ProjectAsset.findOne({
      _id: req.params.assetId,
      userId: ctx.workspaceOwnerId,
      projectId,
      clientVisible: true,
    });

    if (!asset) throw createError('File not found', 404);

    if (asset.uploadedByAuth0Id !== ctx.auth0Id) {
      throw createError('You can only delete files you uploaded', 403);
    }

    await destroyStoredFile(asset);
    await asset.deleteOne();
    res.json({ message: 'File deleted' });
  })
);
