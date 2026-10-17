import { loadWorkspaceEmailBrand } from '../brandContext';
import { enqueueEmailNotification } from '../notificationService';
import { receivesProjectMessageEmail } from '../notificationPreferences';
import { sendBrandedEmailToProjectStakeholders } from '../sendToStakeholders';
import { buildTeamMessageToTeamEmail } from '../templates/teamMessageToTeam';
import type { ProjectMessageNotifyMode } from '../../../models/ProjectMessage';

export interface NotifyTeamMessageToTeamParams {
  workspaceOwnerId: string;
  projectId: string;
  projectTitle: string;
  assignedMemberIds?: string[];
  authorAuth0Id: string;
  authorName: string;
  messageBody: string;
  notifyMode?: ProjectMessageNotifyMode;
  mentionedAuth0Ids?: string[];
}

function notifyKind(
  mode: ProjectMessageNotifyMode
): 'silent' | 'team' | 'mention' {
  if (mode === 'team') return 'team';
  if (mode === 'mentions') return 'mention';
  return 'silent';
}

/** Email teammates based on notify mode + their all / team / @ prefs. */
export function notifyTeamMessageToTeam(params: NotifyTeamMessageToTeamParams): void {
  enqueueEmailNotification(async () => {
    const mode = params.notifyMode ?? 'none';
    const mentioned = (params.mentionedAuth0Ids || []).filter(
      (id) => id && id !== params.authorAuth0Id
    );

    if (mode === 'mentions' && mentioned.length === 0) return;

    const kind = notifyKind(mode);
    const mentionedSet = new Set(mentioned);
    const assignedMemberIds =
      mode === 'mentions' ? mentioned : params.assignedMemberIds;
    const includeAdmin =
      mode === 'mentions' ? mentionedSet.has(params.workspaceOwnerId) : true;

    const brand = await loadWorkspaceEmailBrand(params.workspaceOwnerId);
    await sendBrandedEmailToProjectStakeholders({
      stakeholder: {
        workspaceOwnerId: params.workspaceOwnerId,
        assignedMemberIds,
        includeAdmin,
        includeAssigned: true,
        excludeAuth0Ids: [params.authorAuth0Id],
        receiveEmail: (prefs) => receivesProjectMessageEmail(prefs, kind),
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
          mentioned: mode === 'mentions',
        }),
    });
  });
}
