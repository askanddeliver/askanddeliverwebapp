import { getFrontendBaseUrl } from '../../frontendUrl';
import { loadWorkspaceEmailBrand } from '../brandContext';
import { enqueueEmailNotification } from '../notificationService';
import { getClientPortalEmails } from '../recipients';
import { sendEmail } from '../sendEmail';
import { buildTeamMessageToClientEmail } from '../templates/teamMessageToClient';

export interface NotifyTeamMessageToClientParams {
  workspaceOwnerId: string;
  clientId: string;
  projectId: string;
  projectTitle: string;
  authorName: string;
  messageBody: string;
}

export function notifyTeamMessageToClient(params: NotifyTeamMessageToClientParams): void {
  enqueueEmailNotification(async () => {
    const recipients = await getClientPortalEmails(
      params.workspaceOwnerId,
      params.clientId,
      'clientVisibleReplies'
    );

    if (recipients.length === 0) return;

    const brand = await loadWorkspaceEmailBrand(params.workspaceOwnerId);
    const projectUrl = `${getFrontendBaseUrl()}/portal/projects/${params.projectId}#messages`;
    const { subject, html, text } = buildTeamMessageToClientEmail({
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
