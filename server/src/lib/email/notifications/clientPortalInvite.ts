import { getFrontendBaseUrl } from '../../frontendUrl';
import { loadWorkspaceEmailBrand } from '../brandContext';
import { enqueueEmailNotification } from '../notificationService';
import { sendEmail } from '../sendEmail';
import { buildClientPortalInviteEmail } from '../templates/clientPortalInvite';

export interface NotifyClientPortalInviteParams {
  workspaceOwnerId: string;
  inviteeEmail: string;
  clientName: string;
}

export function notifyClientPortalInvite(params: NotifyClientPortalInviteParams): void {
  enqueueEmailNotification(async () => {
    const email = params.inviteeEmail.trim().toLowerCase();
    if (!email) return;

    const brand = await loadWorkspaceEmailBrand(params.workspaceOwnerId);
    const portalUrl = `${getFrontendBaseUrl()}/portal`;
    const { subject, html, text } = buildClientPortalInviteEmail({
      brand,
      clientName: params.clientName,
      portalUrl,
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
