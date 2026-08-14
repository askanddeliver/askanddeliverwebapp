import { getFrontendBaseUrl } from '../../frontendUrl';
import { loadWorkspaceEmailBrand } from '../brandContext';
import { enqueueEmailNotification } from '../notificationService';
import { getMemberEmail } from '../recipients';
import { sendEmail } from '../sendEmail';
import { buildMemberAssignedToProjectEmail } from '../templates/memberAssignedToProject';

export interface NotifyMemberAssignedToProjectParams {
  workspaceOwnerId: string;
  projectId: string;
  projectTitle: string;
  memberAuth0Id: string;
}

export function notifyMemberAssignedToProject(
  params: NotifyMemberAssignedToProjectParams
): void {
  enqueueEmailNotification(async () => {
    const email = await getMemberEmail(params.memberAuth0Id);
    if (!email) return;

    const brand = await loadWorkspaceEmailBrand(params.workspaceOwnerId);
    const projectUrl = `${getFrontendBaseUrl()}/member/projects/${params.projectId}`;
    const { subject, html, text } = buildMemberAssignedToProjectEmail({
      brand,
      projectTitle: params.projectTitle,
      projectUrl,
    });

    await sendEmail({
      to: email,
      subject,
      html,
      text,
      fromName: brand.companyName,
      replyTo: brand.companyEmail,
    });
  });
}

export function notifyMembersAssignedToProject(
  workspaceOwnerId: string,
  projectId: string,
  projectTitle: string,
  memberAuth0Ids: string[]
): void {
  const unique = [...new Set(memberAuth0Ids.filter(Boolean))];
  for (const memberAuth0Id of unique) {
    notifyMemberAssignedToProject({
      workspaceOwnerId,
      projectId,
      projectTitle,
      memberAuth0Id,
    });
  }
}
