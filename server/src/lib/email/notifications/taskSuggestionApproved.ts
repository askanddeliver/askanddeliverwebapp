import { getFrontendBaseUrl } from '../../frontendUrl';
import { loadWorkspaceEmailBrand } from '../brandContext';
import { enqueueEmailNotification } from '../notificationService';
import { getMemberEmail } from '../recipients';
import { sendEmail } from '../sendEmail';
import { buildTaskSuggestionApprovedEmail } from '../templates/taskSuggestionApproved';

export function notifyTaskSuggestionApproved(params: {
  workspaceOwnerId: string;
  submitterAuth0Id: string;
  projectId: string;
  projectTitle: string;
  taskTitle: string;
}): void {
  enqueueEmailNotification(async () => {
    const email = await getMemberEmail(params.submitterAuth0Id, 'taskSuggestionApproved');
    if (!email) return;

    const brand = await loadWorkspaceEmailBrand(params.workspaceOwnerId);
    const projectUrl = `${getFrontendBaseUrl()}/portal/projects/${params.projectId}#requests`;
    const { subject, html, text } = buildTaskSuggestionApprovedEmail({
      brand,
      projectTitle: params.projectTitle,
      taskTitle: params.taskTitle,
      projectUrl,
    });

    await sendEmail({
      to: [email],
      subject,
      html,
      text,
      fromName: brand.companyName,
      replyTo: brand.companyEmail,
    });
  });
}
