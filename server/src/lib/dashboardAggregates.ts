import { Invoice, Lead, Project, ProjectTask, TimeBlock, TimeEntry, User } from '../models';
import type { IClient } from '../models/Client';
import type { IProject } from '../models/Project';
import type { ITaskType } from '../models/TaskType';
import { calculateAmount, getEffectiveRate } from '../utils/calculations';
import { expandTimeBlocksForRange } from './expandTimeBlocks';

export async function computeTimeTotals(workspaceOwnerId: string, auth0Id?: string) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const projectIds = await Project.find({ userId: workspaceOwnerId }).distinct('_id');
  const baseFilter: Record<string, unknown> = {
    projectId: { $in: projectIds },
    isRunning: false,
  };
  if (auth0Id) baseFilter.userId = auth0Id;

  const [todayEntries, weekEntries, lastWeekEntries] = await Promise.all([
    TimeEntry.find({ ...baseFilter, startTime: { $gte: todayStart } })
      .select('duration')
      .lean(),
    TimeEntry.find({ ...baseFilter, startTime: { $gte: weekStart } })
      .select('duration')
      .lean(),
    TimeEntry.find({
      ...baseFilter,
      startTime: { $gte: lastWeekStart, $lt: weekStart },
    })
      .select('duration')
      .lean(),
  ]);

  const sum = (entries: { duration?: number }[]) =>
    entries.reduce((s, e) => s + (e.duration || 0), 0);

  return {
    todaySeconds: sum(todayEntries),
    weekSeconds: sum(weekEntries),
    lastWeekSeconds: sum(lastWeekEntries),
  };
}

export async function computeUnbilledWip(workspaceOwnerId: string) {
  const paidInvoiceIds = await Invoice.find({
    userId: workspaceOwnerId,
    status: 'PAID',
  }).distinct('_id');

  const projectIds = await Project.find({ userId: workspaceOwnerId }).distinct('_id');

  const entries = await TimeEntry.find({
    projectId: { $in: projectIds },
    isRunning: false,
    invoiceId: { $nin: paidInvoiceIds },
  })
    .populate({ path: 'projectId', populate: { path: 'clientId' } })
    .populate('taskTypeId')
    .lean();

  let amount = 0;
  for (const entry of entries) {
    const taskType = entry.taskTypeId as unknown as ITaskType | null;
    if (!taskType) continue;
    const project = entry.projectId as unknown as IProject & { clientId?: IClient };
    const client = project?.clientId;
    amount += calculateAmount(entry.duration || 0, getEffectiveRate(taskType, client));
  }

  return {
    amount: Math.round(amount * 100) / 100,
    entryCount: entries.length,
  };
}

export async function computeProjectCounts(workspaceOwnerId: string) {
  const counts = await Project.aggregate([
    { $match: { userId: workspaceOwnerId } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const result = { ACTIVE: 0, PAUSED: 0, COMPLETED: 0, ARCHIVED: 0 };
  for (const c of counts) {
    if (c._id in result) {
      result[c._id as keyof typeof result] = c.count;
    }
  }
  return result;
}

export async function computeOpenTaskCount(workspaceOwnerId: string) {
  return ProjectTask.countDocuments({
    userId: workspaceOwnerId,
    status: { $in: ['TODO', 'IN_PROGRESS'] },
  });
}

export async function computeInvoiceSummary(workspaceOwnerId: string) {
  const [sentAgg, oldestSent] = await Promise.all([
    Invoice.aggregate([
      { $match: { userId: workspaceOwnerId, status: 'SENT' } },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$total' } } },
    ]),
    Invoice.findOne({ userId: workspaceOwnerId, status: 'SENT' })
      .sort({ createdAt: 1 })
      .select('createdAt')
      .lean(),
  ]);

  const sentCount = sentAgg[0]?.count || 0;
  const sentTotal = sentAgg[0]?.total || 0;
  const oldestSentDays = oldestSent
    ? Math.floor((Date.now() - new Date(oldestSent.createdAt).getTime()) / 86400000)
    : null;

  return { sentCount, sentTotal, oldestSentDays };
}

export async function computeLeadStats(workspaceOwnerId: string) {
  const pipeline = await Lead.aggregate([
    { $match: { userId: workspaceOwnerId } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const stats: Record<string, number> = {
    NEW: 0,
    CONTACTED: 0,
    QUALIFIED: 0,
    PROPOSAL: 0,
    WON: 0,
    LOST: 0,
  };

  for (const item of pipeline) {
    stats[item._id] = item.count;
  }

  return stats;
}

export async function listTeamMembers(workspaceOwnerId: string) {
  return User.find({
    $or: [{ auth0Id: workspaceOwnerId }, { workspaceOwnerId }],
    role: 'member',
    status: 'active',
  })
    .select('auth0Id name disciplines availability')
    .sort({ name: 1 })
    .lean();
}

export async function computeCapacity(workspaceOwnerId: string) {
  const members = await listTeamMembers(workspaceOwnerId);
  const memberAuth0Ids = members.map((m) => m.auth0Id);

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const projectIds = await Project.find({ userId: workspaceOwnerId }).distinct('_id');

  const [weekEntries, activeProjects, openTasks, timeBlockDocs] = await Promise.all([
    TimeEntry.find({
      projectId: { $in: projectIds },
      userId: { $in: memberAuth0Ids },
      isRunning: false,
      startTime: { $gte: weekStart, $lt: weekEnd },
    })
      .select('userId duration')
      .lean(),
    Project.find({
      userId: workspaceOwnerId,
      status: { $in: ['ACTIVE', 'PAUSED'] },
      assignedMemberIds: { $exists: true, $not: { $size: 0 } },
    })
      .select('assignedMemberIds')
      .lean(),
    ProjectTask.find({
      userId: workspaceOwnerId,
      assigneeAuth0Id: { $in: memberAuth0Ids },
      status: { $in: ['TODO', 'IN_PROGRESS'] },
    })
      .select('assigneeAuth0Id estimatedHours')
      .lean(),
    TimeBlock.find({
      userId: { $in: memberAuth0Ids },
      startTime: { $lt: weekEnd },
      endTime: { $gt: weekStart },
    }).lean(),
  ]);

  const loggedByMember = new Map<string, number>();
  for (const entry of weekEntries) {
    loggedByMember.set(
      entry.userId,
      (loggedByMember.get(entry.userId) || 0) + (entry.duration || 0)
    );
  }

  const assignedProjectsByMember = new Map<string, number>();
  for (const project of activeProjects) {
    for (const id of project.assignedMemberIds || []) {
      assignedProjectsByMember.set(id, (assignedProjectsByMember.get(id) || 0) + 1);
    }
  }

  const openTasksByMember = new Map<string, { count: number; estimatedHours: number }>();
  for (const task of openTasks) {
    const id = task.assigneeAuth0Id!;
    const current = openTasksByMember.get(id) || { count: 0, estimatedHours: 0 };
    current.count += 1;
    current.estimatedHours += task.estimatedHours || 0;
    openTasksByMember.set(id, current);
  }

  const scheduledByMember = new Map<string, number>();
  for (const block of timeBlockDocs) {
    const expanded = expandTimeBlocksForRange([block], weekStart, weekEnd);
    for (const inst of expanded) {
      const hours = (inst.endTime.getTime() - inst.startTime.getTime()) / 3600000;
      scheduledByMember.set(
        block.userId,
        (scheduledByMember.get(block.userId) || 0) + hours
      );
    }
  }

  const memberRows = members.map((m) => {
    const hoursPerWeek = m.availability?.hoursPerWeek ?? 0;
    const loggedSeconds = loggedByMember.get(m.auth0Id) || 0;
    const loggedHoursThisWeek = Math.round((loggedSeconds / 3600) * 10) / 10;
    const assignedProjectCount = assignedProjectsByMember.get(m.auth0Id) || 0;
    const taskStats = openTasksByMember.get(m.auth0Id) || { count: 0, estimatedHours: 0 };
    const scheduledBlockHoursThisWeek =
      Math.round((scheduledByMember.get(m.auth0Id) || 0) * 10) / 10;
    const assignedEstimatedHours = Math.round(taskStats.estimatedHours * 10) / 10;
    const utilizationPercent =
      hoursPerWeek > 0
        ? Math.min(100, Math.round((loggedHoursThisWeek / hoursPerWeek) * 100))
        : null;

    return {
      auth0Id: m.auth0Id,
      name: m.name,
      disciplines: m.disciplines || [],
      hoursPerWeek,
      preferredDays: m.availability?.preferredDays,
      assignedProjectCount,
      openTaskCount: taskStats.count,
      assignedEstimatedHours,
      loggedHoursThisWeek,
      scheduledBlockHoursThisWeek,
      utilizationPercent,
      outOfOffice: m.availability?.outOfOffice,
    };
  });

  return {
    stub: false,
    members: memberRows,
    totals: {
      memberCount: members.length,
      declaredHoursPerWeek: memberRows.reduce((sum, m) => sum + (m.hoursPerWeek || 0), 0),
      loggedHoursThisWeek: memberRows.reduce((sum, m) => sum + m.loggedHoursThisWeek, 0),
      assignedOpenTasks: memberRows.reduce((sum, m) => sum + m.openTaskCount, 0),
    },
  };
}
