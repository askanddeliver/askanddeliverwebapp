import { Project, TimeEntry } from '../models';

/**
 * Projects visible to a member: explicit assignment + time-entry fallback.
 * When no project in the workspace uses assignments yet, falls back to all active/paused.
 */
export async function getMemberProjectFilter(
  workspaceOwnerId: string,
  memberAuth0Id: string
): Promise<Record<string, unknown>> {
  const entryProjectIds = await TimeEntry.distinct('projectId', {
    userId: memberAuth0Id,
  });

  const hasAnyAssignments = await Project.exists({
    userId: workspaceOwnerId,
    assignedMemberIds: { $exists: true, $not: { $size: 0 } },
  });

  if (!hasAnyAssignments) {
    const orConditions: Record<string, unknown>[] = [
      { status: { $in: ['ACTIVE', 'PAUSED'] } },
    ];
    if (entryProjectIds.length > 0) {
      orConditions.push({ _id: { $in: entryProjectIds } });
    }
    return {
      userId: workspaceOwnerId,
      status: { $ne: 'ARCHIVED' },
      $or: orConditions,
    };
  }

  const orConditions: Record<string, unknown>[] = [
    { assignedMemberIds: memberAuth0Id },
  ];
  if (entryProjectIds.length > 0) {
    orConditions.push({ _id: { $in: entryProjectIds } });
  }

  return {
    userId: workspaceOwnerId,
    status: { $in: ['ACTIVE', 'PAUSED'] },
    $or: orConditions,
  };
}

export async function findMemberProjects(
  workspaceOwnerId: string,
  memberAuth0Id: string
) {
  const filter = await getMemberProjectFilter(workspaceOwnerId, memberAuth0Id);
  return Project.find(filter)
    .populate('clientId', 'name company')
    .sort({ updatedAt: -1 })
    .lean();
}

/** Remove billing fields before returning projects to member routes. */
export function stripProjectFinancials<T extends Record<string, unknown>>(project: T) {
  const {
    budget,
    billingMode,
    agreedAmount,
    retainerHoursTotal,
    retainerHoursAdjustment,
    fixedPriceInvoiceLabel,
    ...rest
  } = project;
  void budget;
  void billingMode;
  void agreedAmount;
  void retainerHoursTotal;
  void retainerHoursAdjustment;
  void fixedPriceInvoiceLabel;
  return rest;
}
