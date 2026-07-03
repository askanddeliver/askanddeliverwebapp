import type { Request } from 'express';
import { User } from '../models/User';

const PUBLIC_WORKSPACE_HEADER = 'x-public-workspace';

/**
 * Resolves the workspace owner Auth0 sub for public routes (intake, portfolio, site-config).
 *
 * Resolution order:
 * 1. DEFAULT_PUBLIC_WORKSPACE_OWNER_ID env (explicit — required for multi-tenant)
 * 2. First admin user in DB (single-tenant fallback for Ask And Deliver)
 *
 * Future: subdomain / Tenant lookup from Host header.
 */
export async function resolvePublicWorkspace(_req: Request): Promise<string | null> {
  const fromEnv = process.env.DEFAULT_PUBLIC_WORKSPACE_OWNER_ID?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const primaryEmail = process.env.PRIMARY_ADMIN_EMAIL?.trim().toLowerCase();
  if (primaryEmail) {
    const user = await User.findOne({ email: primaryEmail }).lean();
    if (user?.auth0Id) {
      return user.auth0Id;
    }
  }

  const admin = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 }).lean();
  if (admin?.auth0Id) {
    return admin.auth0Id;
  }

  return null;
}

export function getPublicWorkspaceHeaderName(): string {
  return PUBLIC_WORKSPACE_HEADER;
}
