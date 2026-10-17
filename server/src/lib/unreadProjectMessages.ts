import mongoose from 'mongoose';
import { ProjectMessage, User } from '../models';

export function parseProjectMessageReads(raw: unknown): Map<string, Date> {
  const out = new Map<string, Date>();
  if (!raw) return out;

  const entries: Array<[string, unknown]> =
    raw instanceof Map
      ? [...raw.entries()]
      : typeof raw === 'object'
        ? Object.entries(raw as Record<string, unknown>)
        : [];

  for (const [key, val] of entries) {
    const date = val instanceof Date ? val : new Date(String(val));
    if (!Number.isNaN(date.getTime())) {
      out.set(String(key), date);
    }
  }
  return out;
}

export async function countUnreadProjectMessages(opts: {
  workspaceOwnerId: string;
  projectIds: Array<string | mongoose.Types.ObjectId>;
  viewerAuth0Id: string;
  lastReadByProject: Map<string, Date>;
  clientVisibleOnly?: boolean;
}): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const id of opts.projectIds) {
    counts[String(id)] = 0;
  }

  const readableIds = opts.projectIds
    .map((id) => String(id))
    .filter(
      (id) =>
        mongoose.Types.ObjectId.isValid(id) && opts.lastReadByProject.has(id)
    );

  if (readableIds.length === 0) return counts;

  const or = readableIds.map((id) => ({
    projectId: new mongoose.Types.ObjectId(id),
    createdAt: { $gt: opts.lastReadByProject.get(id) },
  }));

  const match: Record<string, unknown> = {
    userId: opts.workspaceOwnerId,
    authorAuth0Id: { $ne: opts.viewerAuth0Id },
    $or: or,
  };
  if (opts.clientVisibleOnly) {
    match.clientVisible = true;
  }

  const rows = await ProjectMessage.aggregate<{
    _id: mongoose.Types.ObjectId;
    count: number;
  }>([{ $match: match }, { $group: { _id: '$projectId', count: { $sum: 1 } } }]);

  for (const row of rows) {
    counts[String(row._id)] = row.count;
  }
  return counts;
}

export async function attachUnreadMessageCounts<T extends { _id: unknown }>(
  items: T[],
  opts: {
    workspaceOwnerId: string;
    viewerAuth0Id: string;
    clientVisibleOnly?: boolean;
  }
): Promise<(T & { unreadMessageCount: number })[]> {
  if (items.length === 0) return [];

  const user = await User.findOne({ auth0Id: opts.viewerAuth0Id })
    .select('projectMessageReads')
    .lean();
  const lastReadByProject = parseProjectMessageReads(user?.projectMessageReads);
  const counts = await countUnreadProjectMessages({
    workspaceOwnerId: opts.workspaceOwnerId,
    projectIds: items.map((item) => item._id as string | mongoose.Types.ObjectId),
    viewerAuth0Id: opts.viewerAuth0Id,
    lastReadByProject,
    clientVisibleOnly: opts.clientVisibleOnly,
  });

  return items.map((item) => ({
    ...item,
    unreadMessageCount: counts[String(item._id)] ?? 0,
  }));
}

export async function markProjectMessagesRead(
  viewerAuth0Id: string,
  projectId: string
): Promise<Date | null> {
  const lastReadAt = new Date();
  const result = await User.updateOne(
    { auth0Id: viewerAuth0Id },
    { $set: { [`projectMessageReads.${projectId}`]: lastReadAt } }
  );
  if (result.matchedCount === 0) return null;
  return lastReadAt;
}
