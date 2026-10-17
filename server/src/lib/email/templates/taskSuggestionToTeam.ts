import type { WorkspaceEmailBrand } from '../brandContext';
import { buildBrandedEmailHtml, truncateExcerpt } from '../layout';

export function buildTaskSuggestionToTeamEmail(params: {
  brand: WorkspaceEmailBrand;
  projectTitle: string;
  authorName: string;
  taskTitle: string;
  description?: string;
  projectUrl: string;
}): { subject: string; html: string; text: string } {
  const { brand, projectTitle, authorName, taskTitle, description, projectUrl } = params;
  const excerpt = description ? truncateExcerpt(description) : '';
  const subject = `[${brand.companyName}] New task request on ${projectTitle}`;

  const bodyHtml = `
    <p style="margin: 0 0 12px;"><strong>${escapeHtml(authorName)}</strong> suggested a task on <strong>${escapeHtml(projectTitle)}</strong>:</p>
    <p style="margin: 0; padding: 12px 14px; background: #f7f5f2; border-radius: 8px;"><strong>${escapeHtml(taskTitle)}</strong>${
      excerpt
        ? `<br /><span style="white-space: pre-wrap;">${escapeHtml(excerpt)}</span>`
        : ''
    }</p>
  `;

  const html = buildBrandedEmailHtml(brand, {
    subject,
    title: 'New task request',
    bodyHtml,
    ctaLabel: 'Review request',
    ctaUrl: projectUrl,
  });

  const text = [
    `${authorName} suggested a task on ${projectTitle}: ${taskTitle}`,
    excerpt ? `\n${excerpt}` : '',
    '',
    `Review request: ${projectUrl}`,
  ]
    .filter((line) => line !== '')
    .join('\n');

  return { subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
