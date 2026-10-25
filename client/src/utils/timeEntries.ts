import type { TimeEntry, User } from '../types';

export function populatedRefId(
  value: string | { _id: string } | undefined | null
): string | undefined {
  if (!value) return undefined;
  return typeof value === 'object' ? value._id : value;
}

export function isOwnTimeEntry(entry: TimeEntry, auth0Id?: string | null): boolean {
  if (!auth0Id) return !entry.userId;
  return !entry.userId || entry.userId === auth0Id;
}

export function startPayloadFromEntry(entry: TimeEntry): {
  projectId: string;
  taskTypeId: string;
  projectTaskId?: string;
  description?: string;
} | null {
  const projectId = populatedRefId(entry.projectId);
  const taskTypeId = populatedRefId(entry.taskTypeId);
  if (!projectId || !taskTypeId) return null;
  return {
    projectId,
    taskTypeId,
    projectTaskId: populatedRefId(entry.projectTaskId),
    description: entry.description,
  };
}

export function assignableWorkspaceUsers(users: User[]): User[] {
  return users.filter(
    (u) => (u.role === 'admin' || u.role === 'member') && u.status === 'active'
  );
}
