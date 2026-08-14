import { getFrontendBaseUrl } from '../../frontendUrl';
import { loadWorkspaceEmailBrand } from '../brandContext';
import { enqueueEmailNotification } from '../notificationService';
import { getProjectStakeholderEmails } from '../recipients';
import { sendEmail } from '../sendEmail';
import { buildClientMessageToTeamEmail } from '../templates/clientMessageToTeam';

export interface NotifyClientMessageToTeamParams {
  workspaceOwnerId: string;
  projectId: string;
  projectTitle: string;
  assignedMemberIds?: string[];
  authorName: string;
  messageBody: string;
}

export function notifyClientMessageToTeam(params: NotifyClientMessageToTeamParams): void {
  enqueueEmailNotification(async () => {
    const recipients = await getProjectStakeholderEmails({
      workspaceOwnerId: params.workspaceOwnerId,
      assignedMemberIds: params.assignedMemberIds,
      includeAdmin: true,
      includeAssigned: true,
    });

    if (recipients.length === 0) return;

    const brand = await loadWorkspaceEmailBrand(params.workspaceOwnerId);
    const projectUrl = `${getFrontendBaseUrl()}/projects/${params.projectId}#messages`;
    const { subject, html, text } = buildClientMessageToTeamEmail({
      brand,
      projectTitle: params.projectTitle,
      authorName: params.authorName,
      messageBody: params.messageBody,
      projectUrl,
    });

    await sendEmail({
      to: recipients,
      subject,
      html,
      text,
      fromName: brand.companyName,
      replyTo: brand.companyEmail,
    });
  });
}
