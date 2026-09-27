import { loadWorkspaceEmailBrand } from '../brandContext';
import { enqueueEmailNotification } from '../notificationService';
import { sendBrandedEmailToProjectStakeholders } from '../sendToStakeholders';
import { buildClientTaskCompletedEmail } from '../templates/clientTaskCompleted';

export interface NotifyTeamTaskCompletedParams {
  workspaceOwnerId: string;
  projectId: string;
  projectTitle: string;
  taskTitle: string;
  assignedMemberIds?: string[];
  excludeAuth0Ids?: string[];
}

/** Email admin + assigned members when a task is marked complete. */
export function notifyTeamTaskCompleted(params: NotifyTeamTaskCompletedParams): void {
  enqueueEmailNotification(async () => {
    const brand = await loadWorkspaceEmailBrand(params.workspaceOwnerId);
    await sendBrandedEmailToProjectStakeholders({
      stakeholder: {
        workspaceOwnerId: params.workspaceOwnerId,
        assignedMemberIds: params.assignedMemberIds,
        includeAdmin: true,
        includeAssigned: true,
        excludeAuth0Ids: params.excludeAuth0Ids,
        preferenceKey: 'taskCompleted',
      },
      brand,
      projectId: params.projectId,
      hash: '#tasks',
      build: (projectUrl) =>
        buildClientTaskCompletedEmail({
          brand,
          projectTitle: params.projectTitle,
          taskTitle: params.taskTitle,
          projectUrl,
        }),
    });
  });
}
