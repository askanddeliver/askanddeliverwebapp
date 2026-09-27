import { loadWorkspaceEmailBrand } from '../brandContext';
import { enqueueEmailNotification } from '../notificationService';
import { sendBrandedEmailToProjectStakeholders } from '../sendToStakeholders';
import { buildTeamMessageToTeamEmail } from '../templates/teamMessageToTeam';

export interface NotifyTeamMessageToTeamParams {
  workspaceOwnerId: string;
  projectId: string;
  projectTitle: string;
  assignedMemberIds?: string[];
  authorAuth0Id: string;
  authorName: string;
  messageBody: string;
}

/** Email admin + assigned members (except the author) when a teammate posts. */
export function notifyTeamMessageToTeam(params: NotifyTeamMessageToTeamParams): void {
  enqueueEmailNotification(async () => {
    const brand = await loadWorkspaceEmailBrand(params.workspaceOwnerId);
    await sendBrandedEmailToProjectStakeholders({
      stakeholder: {
        workspaceOwnerId: params.workspaceOwnerId,
        assignedMemberIds: params.assignedMemberIds,
        includeAdmin: true,
        includeAssigned: true,
        excludeAuth0Ids: [params.authorAuth0Id],
        preferenceKey: 'teamMessages',
      },
      brand,
      projectId: params.projectId,
      hash: '#messages',
      build: (projectUrl) =>
        buildTeamMessageToTeamEmail({
          brand,
          projectTitle: params.projectTitle,
          authorName: params.authorName,
          messageBody: params.messageBody,
          projectUrl,
        }),
    });
  });
}
