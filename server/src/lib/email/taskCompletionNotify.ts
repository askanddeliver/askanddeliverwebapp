import { Project } from '../../models';
import { notifyClientTaskCompleted } from './notifications/clientTaskCompleted';
import { notifyTeamTaskCompleted } from './notifications/teamTaskCompleted';

interface TaskCompletionCandidate {
  userId: string;
  projectId: { toString(): string } | string;
  title: string;
  clientVisible?: boolean;
  status: string;
}

/** Fire task-completed emails when a task newly reaches COMPLETED. */
export async function maybeNotifyTaskCompleted(
  before: TaskCompletionCandidate,
  after: TaskCompletionCandidate,
  actorAuth0Id?: string
): Promise<void> {
  if (after.status !== 'COMPLETED' || before.status === 'COMPLETED') return;

  const project = await Project.findOne({
    _id: after.projectId,
    userId: after.userId,
  })
    .select('title clientId assignedMemberIds')
    .lean();

  if (!project) return;

  const projectId = String(project._id);
  notifyTeamTaskCompleted({
    workspaceOwnerId: after.userId,
    projectId,
    projectTitle: project.title,
    taskTitle: after.title,
    assignedMemberIds: project.assignedMemberIds,
    excludeAuth0Ids: actorAuth0Id ? [actorAuth0Id] : [],
  });

  if (!after.clientVisible || !project.clientId) return;

  notifyClientTaskCompleted({
    workspaceOwnerId: after.userId,
    clientId: String(project.clientId),
    projectId,
    projectTitle: project.title,
    taskTitle: after.title,
  });
}

/** @deprecated Use maybeNotifyTaskCompleted */
export const maybeNotifyClientTaskCompleted = maybeNotifyTaskCompleted;
