import { Project } from '../../models';
import { notifyClientTaskCompleted } from './notifications/clientTaskCompleted';

interface TaskCompletionCandidate {
  userId: string;
  projectId: { toString(): string } | string;
  title: string;
  clientVisible?: boolean;
  status: string;
}

/** Fire client task-completed email when a client-visible task newly reaches COMPLETED. */
export async function maybeNotifyClientTaskCompleted(
  before: TaskCompletionCandidate,
  after: TaskCompletionCandidate
): Promise<void> {
  if (after.status !== 'COMPLETED' || before.status === 'COMPLETED') return;
  if (!after.clientVisible) return;

  const project = await Project.findOne({
    _id: after.projectId,
    userId: after.userId,
  })
    .select('title clientId')
    .lean();

  if (!project?.clientId) return;

  notifyClientTaskCompleted({
    workspaceOwnerId: after.userId,
    clientId: String(project.clientId),
    projectId: String(after.projectId),
    projectTitle: project.title,
    taskTitle: after.title,
  });
}
