import mongoose from 'mongoose';
import { Client, Project, ProjectFolderGrant, User } from '../models';
import type { IProject } from '../models/Project';
import type {
  IProjectFolderGrant,
  ProjectFolderGrantSubject,
} from '../models/ProjectFolderGrant';
import {
  googleErrorMessage,
  grantFolderWriter,
  isGoogleDriveConfigured,
  revokeFolderPermission,
} from './googleDrive';

export interface FolderGrantView {
  _id: string;
  email: string;
  subject: ProjectFolderGrantSubject;
  role: 'writer';
  status: 'granted' | 'pending' | 'failed';
  error?: string;
  auth0Id?: string;
  clientId?: string;
}

interface DesiredGrant {
  email: string;
  subject: ProjectFolderGrantSubject;
  auth0Id?: string;
  clientId?: string;
}

function normalizeEmail(email: string | undefined | null): string | null {
  const trimmed = email?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

export function clientIdOf(clientId: unknown): string | undefined {
  if (!clientId) return undefined;
  if (typeof clientId === 'string') return clientId;
  if (clientId instanceof mongoose.Types.ObjectId) return String(clientId);
  if (typeof clientId === 'object' && '_id' in clientId) {
    const id = (clientId as { _id?: unknown })._id;
    return id ? String(id) : undefined;
  }
  return undefined;
}

function accessClosed(status: string | undefined): boolean {
  return status === 'COMPLETED' || status === 'ARCHIVED';
}

async function desiredGrants(
  workspaceOwnerId: string,
  project: {
    clientId: unknown;
    assignedMemberIds?: string[];
    status?: string;
  }
): Promise<DesiredGrant[]> {
  const byEmail = new Map<string, DesiredGrant>();

  const admins = await User.find({
    role: 'admin',
    status: { $ne: 'disabled' },
    $or: [{ auth0Id: workspaceOwnerId }, { workspaceOwnerId }],
  })
    .select('auth0Id email')
    .lean();

  for (const admin of admins) {
    const email = normalizeEmail(admin.email);
    if (!email) continue;
    byEmail.set(email, { email, subject: 'admin', auth0Id: admin.auth0Id });
  }

  if (accessClosed(project.status)) {
    return [...byEmail.values()];
  }

  const memberIds = project.assignedMemberIds || [];
  if (memberIds.length > 0) {
    const members = await User.find({
      auth0Id: { $in: memberIds },
      status: { $ne: 'disabled' },
    })
      .select('auth0Id email')
      .lean();
    for (const member of members) {
      const email = normalizeEmail(member.email);
      if (!email || byEmail.has(email)) continue;
      byEmail.set(email, { email, subject: 'member', auth0Id: member.auth0Id });
    }
  }

  const clientId = clientIdOf(project.clientId);
  if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
    const portalUsers = await User.find({
      role: 'client',
      clientId,
      workspaceOwnerId,
      status: { $ne: 'disabled' },
    })
      .select('auth0Id email clientId')
      .lean();
    for (const portalUser of portalUsers) {
      const email = normalizeEmail(portalUser.email);
      if (!email || byEmail.has(email)) continue;
      byEmail.set(email, {
        email,
        subject: 'client',
        auth0Id: portalUser.auth0Id,
        clientId,
      });
    }

    const client = await Client.findOne({ _id: clientId, userId: workspaceOwnerId })
      .select('email')
      .lean();
    const clientEmail = normalizeEmail(client?.email);
    if (clientEmail && !byEmail.has(clientEmail)) {
      byEmail.set(clientEmail, { email: clientEmail, subject: 'client', clientId });
    }
  }

  return [...byEmail.values()];
}

async function upsertFailed(
  workspaceOwnerId: string,
  projectId: mongoose.Types.ObjectId | string,
  want: DesiredGrant,
  error: string
): Promise<void> {
  await ProjectFolderGrant.findOneAndUpdate(
    { projectId, email: want.email },
    {
      $set: {
        userId: workspaceOwnerId,
        subject: want.subject,
        auth0Id: want.auth0Id,
        clientId: want.clientId,
        role: 'writer',
        status: 'failed',
        error,
      },
      $unset: { googlePermissionId: 1 },
    },
    { upsert: true, new: true }
  );
}

async function applyFolderGrants(project: {
  _id: mongoose.Types.ObjectId | string;
  userId: string;
  clientId: unknown;
  status?: string;
  assignedMemberIds?: string[];
  googleFolderId?: string;
}): Promise<void> {
  if (!project.googleFolderId || !isGoogleDriveConfigured()) return;

  const desired = await desiredGrants(project.userId, project);
  const desiredByEmail = new Map(desired.map((d) => [d.email, d]));
  const existing = await ProjectFolderGrant.find({
    userId: project.userId,
    projectId: project._id,
  });

  for (const grant of existing) {
    const want = desiredByEmail.get(grant.email);
    if (!want) {
      await dropGrant(project.googleFolderId, grant);
      continue;
    }
    desiredByEmail.delete(grant.email);
    grant.subject = want.subject;
    grant.auth0Id = want.auth0Id;
    grant.clientId = want.clientId
      ? new mongoose.Types.ObjectId(want.clientId)
      : undefined;
    grant.role = 'writer';
    if (grant.status === 'granted' && grant.googlePermissionId) {
      grant.error = undefined;
      await grant.save();
      continue;
    }
    try {
      const permissionId = await grantFolderWriter({
        folderId: project.googleFolderId,
        email: want.email,
      });
      grant.googlePermissionId = permissionId;
      grant.status = 'granted';
      grant.error = undefined;
      await grant.save();
    } catch (err) {
      grant.status = 'failed';
      grant.error = googleErrorMessage(err);
      grant.googlePermissionId = undefined;
      await grant.save();
    }
  }

  for (const want of desiredByEmail.values()) {
    try {
      const permissionId = await grantFolderWriter({
        folderId: project.googleFolderId,
        email: want.email,
      });
      await ProjectFolderGrant.findOneAndUpdate(
        { projectId: project._id, email: want.email },
        {
          $set: {
            userId: project.userId,
            subject: want.subject,
            auth0Id: want.auth0Id,
            clientId: want.clientId,
            role: 'writer',
            googlePermissionId: permissionId,
            status: 'granted',
          },
          $unset: { error: 1 },
        },
        { upsert: true }
      );
    } catch (err) {
      await upsertFailed(project.userId, project._id, want, googleErrorMessage(err));
    }
  }
}

async function dropGrant(folderId: string, grant: IProjectFolderGrant): Promise<void> {
  if (!grant.googlePermissionId) {
    await grant.deleteOne();
    return;
  }
  try {
    await revokeFolderPermission({
      folderId,
      permissionId: grant.googlePermissionId,
    });
    await grant.deleteOne();
  } catch (err) {
    grant.status = 'failed';
    grant.error = googleErrorMessage(err);
    await grant.save();
  }
}

/** Best-effort. Never throws — project save must succeed when Drive is down. */
export async function syncProjectFolderAccess(project: {
  _id: mongoose.Types.ObjectId | string;
  userId: string;
  clientId: unknown;
  status?: string;
  assignedMemberIds?: string[];
  googleFolderId?: string;
}): Promise<void> {
  try {
    await applyFolderGrants(project);
  } catch (err) {
    console.error('Google Drive access sync failed:', googleErrorMessage(err));
  }
}

export async function syncProjectFolderAccessById(
  workspaceOwnerId: string,
  projectId: string
): Promise<void> {
  const project = await Project.findOne({ _id: projectId, userId: workspaceOwnerId });
  if (!project) return;
  await syncProjectFolderAccess(project);
}

export function toFolderGrantView(grant: {
  _id: mongoose.Types.ObjectId;
  email: string;
  subject: ProjectFolderGrantSubject;
  role: 'writer';
  status: 'granted' | 'pending' | 'failed';
  error?: string;
  auth0Id?: string;
  clientId?: mongoose.Types.ObjectId;
}): FolderGrantView {
  return {
    _id: String(grant._id),
    email: grant.email,
    subject: grant.subject,
    role: grant.role,
    status: grant.status,
    error: grant.error || undefined,
    auth0Id: grant.auth0Id,
    clientId: grant.clientId ? String(grant.clientId) : undefined,
  };
}

export async function listFolderGrantViews(
  workspaceOwnerId: string,
  projectId: string
): Promise<FolderGrantView[]> {
  const grants = await ProjectFolderGrant.find({
    userId: workspaceOwnerId,
    projectId,
  })
    .sort({ subject: 1, email: 1 })
    .lean();
  return grants.map((g) =>
    toFolderGrantView({
      ...g,
      _id: g._id as mongoose.Types.ObjectId,
      clientId: g.clientId as mongoose.Types.ObjectId | undefined,
    })
  );
}

export async function retryProjectFolderAccess(
  workspaceOwnerId: string,
  projectId: string
): Promise<FolderGrantView[]> {
  const project = await Project.findOne({ _id: projectId, userId: workspaceOwnerId });
  if (!project) return [];
  if (!project.googleFolderId || !isGoogleDriveConfigured()) {
    return listFolderGrantViews(workspaceOwnerId, projectId);
  }
  await applyFolderGrants(project);
  return listFolderGrantViews(workspaceOwnerId, projectId);
}

export type ProjectAccessSnapshot = Pick<
  IProject,
  '_id' | 'userId' | 'clientId' | 'status' | 'assignedMemberIds' | 'googleFolderId'
>;
