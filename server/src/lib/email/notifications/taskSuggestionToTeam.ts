import { loadWorkspaceEmailBrand } from '../brandContext';
import { enqueueEmailNotification } from '../notificationService';
import { sendBrandedEmailToProjectStakeholders } from '../sendToStakeholders';
import { buildTaskSuggestionToTeamEmail } from '../templates/taskSuggestionToTeam';

export function notifyTaskSuggestionToTeam(params: {
  workspaceOwnerId: string;
  projectId: string;
  projectTitle: string;
  assignedMemberIds?: string[];
  authorName: string;
  taskTitle: string;
  description?: string;
}): void {
  enqueueEmailNotification(async () => {
    const brand = await loadWorkspaceEmailBrand(params.workspaceOwnerId);
    await sendBrandedEmailToProjectStakeholders({
      stakeholder: {
        workspaceOwnerId: params.workspaceOwnerId,
        assignedMemberIds: params.assignedMemberIds,
        includeAdmin: true,
        includeAssigned: true,
        preferenceKey: 'taskSuggestions',
      },
      brand,
      projectId: params.projectId,
      hash: '#requests',
      build: (projectUrl) =>
        buildTaskSuggestionToTeamEmail({
          brand,
          projectTitle: params.projectTitle,
          authorName: params.authorName,
          taskTitle: params.taskTitle,
          description: params.description,
          projectUrl,
        }),
    });
  });
}
