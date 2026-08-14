import type { WorkspaceEmailBrand } from '../brandContext';
import { buildBrandedEmailHtml, truncateExcerpt } from '../layout';

export interface TeamMessageToClientTemplateParams {
  brand: WorkspaceEmailBrand;
  projectTitle: string;
  authorName: string;
  messageBody: string;
  projectUrl: string;
}

export function buildTeamMessageToClientEmail(
  params: TeamMessageToClientTemplateParams
): { subject: string; html: string; text: string } {
  const { brand, projectTitle, authorName, messageBody, projectUrl } = params;
  const excerpt = truncateExcerpt(messageBody);
  const subject = `${brand.companyName} sent you an update on ${projectTitle}`;

  const bodyHtml = `
    <p style="margin: 0 0 12px;"><strong>${escapeHtml(authorName)}</strong> from ${escapeHtml(brand.companyName)} sent an update on <strong>${escapeHtml(projectTitle)}</strong>:</p>
    <p style="margin: 0; padding: 12px 14px; background: #f7f5f2; border-radius: 8px; white-space: pre-wrap;">${escapeHtml(excerpt)}</p>
  `;

  const html = buildBrandedEmailHtml(brand, {
    subject,
    title: 'New project update',
    bodyHtml,
    ctaLabel: 'View message',
    ctaUrl: projectUrl,
  });

  const text = [
    `${authorName} from ${brand.companyName} sent an update on ${projectTitle}:`,
    '',
    excerpt,
    '',
    `View message: ${projectUrl}`,
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
