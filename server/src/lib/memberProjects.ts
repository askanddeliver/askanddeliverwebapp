import { Project, TimeEntry } from '../models';

/** Projects visible to a member: active/paused workspace projects + any they have logged time on. */
export async function getMemberProjectFilter(
  workspaceOwnerId: string,
  memberAuth0Id: string
): Promise<Record<string, unknown>> {
  const entryProjectIds = await TimeEntry.distinct('projectId', {
    userId: memberAuth0Id,
  });

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
