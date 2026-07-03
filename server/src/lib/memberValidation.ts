import { User } from '../models';
import { createError } from '../middleware/errorHandler';

/** Active workspace members matching auth0Ids (deduped, trimmed). */
export async function validateWorkspaceMemberAuth0Ids(
  workspaceOwnerId: string,
  auth0Ids: unknown
): Promise<string[]> {
  if (auth0Ids === undefined || auth0Ids === null) return [];
  if (!Array.isArray(auth0Ids)) {
    throw createError('assignedMemberIds must be an array', 400);
  }

  const unique = [
    ...new Set(
      auth0Ids
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        .map((id) => id.trim())
    ),
  ];

  if (unique.length === 0) return [];

  const found = await User.find({
    auth0Id: { $in: unique },
    $or: [{ auth0Id: workspaceOwnerId }, { workspaceOwnerId }],
    role: 'member',
    status: 'active',
  }).distinct('auth0Id');

  const missing = unique.filter((id) => !found.includes(id));
  if (missing.length > 0) {
    throw createError(`Unknown or inactive team member: ${missing.join(', ')}`, 400);
  }

  return unique;
}

/** Validate a single optional member auth0Id; empty string clears assignment. */
export async function validateOptionalWorkspaceMemberAuth0Id(
  workspaceOwnerId: string,
  auth0Id: unknown
): Promise<string | undefined> {
  if (auth0Id === undefined) return undefined;
  if (auth0Id === null || auth0Id === '') return undefined;
  if (typeof auth0Id !== 'string') {
    throw createError('Invalid assignee', 400);
  }
  const [valid] = await validateWorkspaceMemberAuth0Ids(workspaceOwnerId, [auth0Id.trim()]);
  return valid;
}
