import { getFrontendBaseUrl } from '../../frontendUrl';
import { loadWorkspaceEmailBrand } from '../brandContext';
import { enqueueEmailNotification } from '../notificationService';
import { getClientPortalEmails } from '../recipients';
import { sendEmail } from '../sendEmail';
import { buildClientTaskCompletedEmail } from '../templates/clientTaskCompleted';

export interface NotifyClientTaskCompletedParams {
  workspaceOwnerId: string;
  clientId: string;
  projectId: string;
  projectTitle: string;
  taskTitle: string;
}

export function notifyClientTaskCompleted(params: NotifyClientTaskCompletedParams): void {
  enqueueEmailNotification(async () => {
    const recipients = await getClientPortalEmails(
      params.workspaceOwnerId,
      params.clientId,
      'taskCompleted'
    );

    if (recipients.length === 0) return;

    const brand = await loadWorkspaceEmailBrand(params.workspaceOwnerId);
    const projectUrl = `${getFrontendBaseUrl()}/portal/projects/${params.projectId}#tasks`;
    const { subject, html, text } = buildClientTaskCompletedEmail({
      brand,
      projectTitle: params.projectTitle,
      taskTitle: params.taskTitle,
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
