import type { WorkspaceEmailBrand } from '../brandContext';
import { buildBrandedEmailHtml } from '../layout';

export function buildTaskSuggestionApprovedEmail(params: {
  brand: WorkspaceEmailBrand;
  projectTitle: string;
  taskTitle: string;
  projectUrl: string;
}): { subject: string; html: string; text: string } {
  const { brand, projectTitle, taskTitle, projectUrl } = params;
  const subject = `${brand.companyName}: "${taskTitle}" was added to ${projectTitle}`;

  const bodyHtml = `
    <p style="margin: 0;">Your team added a task you requested on <strong>${escapeHtml(projectTitle)}</strong>:</p>
    <p style="margin: 12px 0 0; padding: 12px 14px; background: #f7f5f2; border-radius: 8px;"><strong>${escapeHtml(taskTitle)}</strong></p>
  `;

  const html = buildBrandedEmailHtml(brand, {
    subject,
    title: 'Task request added',
    bodyHtml,
    ctaLabel: 'View project',
    ctaUrl: projectUrl,
  });

  const text = [
    `Your team added a task you requested on ${projectTitle}: ${taskTitle}`,
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
