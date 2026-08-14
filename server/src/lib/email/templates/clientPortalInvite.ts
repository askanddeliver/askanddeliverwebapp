import type { WorkspaceEmailBrand } from '../brandContext';
import { buildBrandedEmailHtml } from '../layout';

export interface ClientPortalInviteTemplateParams {
  brand: WorkspaceEmailBrand;
  clientName: string;
  portalUrl: string;
}

export function buildClientPortalInviteEmail(
  params: ClientPortalInviteTemplateParams
): { subject: string; html: string; text: string } {
  const { brand, clientName, portalUrl } = params;
  const subject = `${brand.companyName} invited you to the client portal`;

  const bodyHtml = `
    <p style="margin: 0 0 12px;">You've been invited to the <strong>${escapeHtml(brand.companyName)}</strong> client portal${clientName ? ` for <strong>${escapeHtml(clientName)}</strong>` : ''}.</p>
    <p style="margin: 0;">Sign in to view your projects, briefs, task updates, and messages from your team.</p>
  `;

  const html = buildBrandedEmailHtml(brand, {
    subject,
    title: 'Welcome to your client portal',
    bodyHtml,
    ctaLabel: 'Open client portal',
    ctaUrl: portalUrl,
  });

  const text = [
    `You've been invited to the ${brand.companyName} client portal${clientName ? ` for ${clientName}` : ''}.`,
    '',
    'Sign in to view your projects, briefs, task updates, and messages from your team.',
    '',
    `Open client portal: ${portalUrl}`,
  ].join('\n');

  return { subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
