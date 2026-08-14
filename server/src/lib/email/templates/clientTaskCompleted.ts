import type { WorkspaceEmailBrand } from '../brandContext';
import { buildBrandedEmailHtml } from '../layout';

export interface ClientTaskCompletedTemplateParams {
  brand: WorkspaceEmailBrand;
  projectTitle: string;
  taskTitle: string;
  projectUrl: string;
}

export function buildClientTaskCompletedEmail(
  params: ClientTaskCompletedTemplateParams
): { subject: string; html: string; text: string } {
  const { brand, projectTitle, taskTitle, projectUrl } = params;
  const subject = `${brand.companyName}: "${taskTitle}" is complete`;

  const bodyHtml = `
    <p style="margin: 0;">A task on <strong>${escapeHtml(projectTitle)}</strong> was marked complete:</p>
    <p style="margin: 12px 0 0; padding: 12px 14px; background: #f7f5f2; border-radius: 8px;"><strong>${escapeHtml(taskTitle)}</strong></p>
  `;

  const html = buildBrandedEmailHtml(brand, {
    subject,
    title: 'Task completed',
    bodyHtml,
    ctaLabel: 'View project',
    ctaUrl: projectUrl,
  });

  const text = [
    `A task on ${projectTitle} was marked complete: ${taskTitle}`,
    '',
    `View project: ${projectUrl}`,
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
