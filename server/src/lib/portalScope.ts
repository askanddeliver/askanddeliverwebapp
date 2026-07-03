import { Request } from 'express';
import mongoose from 'mongoose';
import { createError } from '../middleware/errorHandler';
import { extractUserId, getWorkspaceOwnerId, resolveClientScope } from '../middleware/auth';
import { Project } from '../models';

export interface PortalContext {
  auth0Id: string;
  workspaceOwnerId: string;
  clientId: string;
}

export async function requirePortalContext(req: Request): Promise<PortalContext> {
  const auth0Id = extractUserId(req);
  const workspaceOwnerId = await getWorkspaceOwnerId(req);
  const clientId = await resolveClientScope(req);

  if (!auth0Id || !workspaceOwnerId || !clientId) {
    throw createError('Client portal access required', 403);
  }

  return { auth0Id, workspaceOwnerId, clientId };
}

/** Returns project scoped to client or 404 (no existence leak). */
export async function findClientProject(
  projectId: string,
  workspaceOwnerId: string,
  clientId: string
) {
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw createError('Project not found', 404);
  }

  const project = await Project.findOne({
    _id: projectId,
    userId: workspaceOwnerId,
    clientId,
    status: { $ne: 'ARCHIVED' },
  }).lean();

  if (!project) {
    throw createError('Project not found', 404);
  }

  return project;
}

/** Safe portal project fields — no financial data. */
export function toPortalProjectSummary(project: {
  _id: mongoose.Types.ObjectId;
  title: string;
  excerpt?: string;
  status: string;
  updatedAt: Date;
}) {
  return {
    _id: String(project._id),
    title: project.title,
    excerpt: project.excerpt,
    status: project.status,
    updatedAt: project.updatedAt,
  };
}
