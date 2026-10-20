import { Router, Response } from 'express';
import mongoose from 'mongoose';
import {
  checkJwt,
  AuthRequest,
  extractUserId,
  getWorkspaceOwnerId,
  requireAdmin,
  requireClient,
  requireMemberOrAdmin,
} from '../middleware/auth';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { Project, ProjectDocument, User } from '../models';
import { PROJECT_DOCUMENT_MIME } from '../models/ProjectDocument';
import { findClientProject, requirePortalContext } from '../lib/portalScope';
import { memberHasProjectAccess } from '../lib/memberProjects';
import {
  createGoogleDoc,
  ensureProjectFolder,
  googleDocWebViewLink,
  googleErrorMessage,
  isGoogleDriveConfigured,
} from '../lib/googleDrive';
import {
  listFolderGrantViews,
  retryProjectFolderAccess,
  syncProjectFolderAccess,
} from '../lib/projectDocumentAccess';

const router = Router({ mergeParams: true });

router.use(checkJwt);
router.use(requireMemberOrAdmin);

async function loadWorkspaceProject(req: AuthRequest, projectId: string) {
  const auth0Id = extractUserId(req);
  const workspaceOwnerId = await getWorkspaceOwnerId(req);
  if (!auth0Id || !workspaceOwnerId) {
    throw createError('Workspace access required', 403);
  }
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw createError('Project not found', 404);
  }

  const project = await Project.findOne({
    _id: projectId,
    userId: workspaceOwnerId,
  });
  if (!project) throw createError('Project not found', 404);

  const user = await User.findOne({ auth0Id });
  if (!user) throw createError('User not found', 404);

  if (user.role === 'member') {
    const allowed = await memberHasProjectAccess(workspaceOwnerId, auth0Id, projectId);
    if (!allowed) throw createError('Project not found', 404);
  }

  return { auth0Id, workspaceOwnerId, user, project };
}

function serializeDocument(doc: {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  googleFileId: string;
  title: string;
  mimeType: string;
  createdByAuth0Id: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    _id: String(doc._id),
    projectId: String(doc.projectId),
    googleFileId: doc.googleFileId,
    title: doc.title,
    mimeType: doc.mimeType,
    createdByAuth0Id: doc.createdByAuth0Id,
    createdByName: doc.createdByName,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    webViewLink: googleDocWebViewLink(doc.googleFileId),
  };
}

async function listDocuments(workspaceOwnerId: string, projectId: string) {
  const docs = await ProjectDocument.find({
    userId: workspaceOwnerId,
    projectId,
  })
    .sort({ createdAt: -1 })
    .lean();
  return docs.map((doc) =>
    serializeDocument({
      ...doc,
      _id: doc._id as mongoose.Types.ObjectId,
      projectId: doc.projectId as mongoose.Types.ObjectId,
    })
  );
}

async function createDocument(opts: {
  project: InstanceType<typeof Project>;
  auth0Id: string;
  createdByName: string;
  title: string;
  allowWhenClosed: boolean;
}) {
  if (!isGoogleDriveConfigured()) {
    throw createError('Google Docs is not set up for this workspace', 503);
  }
  const title = opts.title.trim();
  if (!title) throw createError('Title is required', 400);
  if (title.length > 200) throw createError('Title must be 200 characters or fewer', 400);

  const closed =
    opts.project.status === 'COMPLETED' || opts.project.status === 'ARCHIVED';
  if (closed && !opts.allowWhenClosed) {
    throw createError('Documents can only be created on active or paused projects', 403);
  }

  let folderId: string;
  try {
    folderId = await ensureProjectFolder({
      existingFolderId: opts.project.googleFolderId,
      title: opts.project.title,
    });
  } catch (err) {
    throw createError(googleErrorMessage(err), 502);
  }

  if (opts.project.googleFolderId !== folderId) {
    opts.project.googleFolderId = folderId;
    await opts.project.save();
  }

  let file: { id: string };
  try {
    file = await createGoogleDoc({ folderId, title });
  } catch (err) {
    throw createError(googleErrorMessage(err), 502);
  }

  const doc = await ProjectDocument.create({
    userId: opts.project.userId,
    projectId: opts.project._id,
    googleFileId: file.id,
    title,
    mimeType: PROJECT_DOCUMENT_MIME,
    createdByAuth0Id: opts.auth0Id,
    createdByName: opts.createdByName.trim() || 'Someone',
  });

  await syncProjectFolderAccess(opts.project);
  return serializeDocument(doc);
}

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = req.params.projectId;
    const { workspaceOwnerId, user } = await loadWorkspaceProject(req, projectId);
    const documents = await listDocuments(workspaceOwnerId, projectId);
    const body: {
      configured: boolean;
      documents: Awaited<ReturnType<typeof listDocuments>>;
      grants?: Awaited<ReturnType<typeof listFolderGrantViews>>;
    } = {
      configured: isGoogleDriveConfigured(),
      documents,
    };
    if (user.role === 'admin') {
      body.grants = await listFolderGrantViews(workspaceOwnerId, projectId);
    }
    res.json(body);
  })
);

router.post(
  '/access/retry',
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = req.params.projectId;
    const { workspaceOwnerId } = await loadWorkspaceProject(req, projectId);
    if (!isGoogleDriveConfigured()) {
      throw createError('Google Docs is not set up for this workspace', 503);
    }
    try {
      const grants = await retryProjectFolderAccess(workspaceOwnerId, projectId);
      res.json({ grants });
    } catch (err) {
      throw createError(googleErrorMessage(err), 502);
    }
  })
);

router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const projectId = req.params.projectId;
    const { auth0Id, user, project } = await loadWorkspaceProject(req, projectId);
    const title = typeof req.body?.title === 'string' ? req.body.title : '';
    const doc = await createDocument({
      project,
      auth0Id,
      createdByName: user.name,
      title,
      allowWhenClosed: user.role === 'admin',
    });
    res.status(201).json(doc);
  })
);

export default router;

export const portalProjectDocumentsRouter = Router({ mergeParams: true });

portalProjectDocumentsRouter.use(checkJwt);
portalProjectDocumentsRouter.use(requireClient);

portalProjectDocumentsRouter.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = await requirePortalContext(req);
    const projectId = req.params.projectId;
    await findClientProject(projectId, ctx.workspaceOwnerId, ctx.clientId);
    const documents = await listDocuments(ctx.workspaceOwnerId, projectId);
    res.json({
      configured: isGoogleDriveConfigured(),
      documents,
    });
  })
);

portalProjectDocumentsRouter.post(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const ctx = await requirePortalContext(req);
    const projectId = req.params.projectId;
    await findClientProject(projectId, ctx.workspaceOwnerId, ctx.clientId);
    const project = await Project.findOne({
      _id: projectId,
      userId: ctx.workspaceOwnerId,
      clientId: ctx.clientId,
    });
    if (!project) throw createError('Project not found', 404);
    const user = await User.findOne({ auth0Id: ctx.auth0Id });
    if (!user) throw createError('User not found', 404);
    const title = typeof req.body?.title === 'string' ? req.body.title : '';
    const doc = await createDocument({
      project,
      auth0Id: ctx.auth0Id,
      createdByName: user.name,
      title,
      allowWhenClosed: false,
    });
    res.status(201).json(doc);
  })
);
