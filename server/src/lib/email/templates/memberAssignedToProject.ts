import type { WorkspaceEmailBrand } from '../brandContext';
import { buildBrandedEmailHtml } from '../layout';

export interface MemberAssignedToProjectTemplateParams {
  brand: WorkspaceEmailBrand;
  projectTitle: string;
  projectUrl: string;
}

export function buildMemberAssignedToProjectEmail(
  params: MemberAssignedToProjectTemplateParams
): { subject: string; html: string; text: string } {
  const { brand, projectTitle, projectUrl } = params;
  const subject = `[${brand.companyName}] You've been assigned to ${projectTitle}`;

  const bodyHtml = `
    <p style="margin: 0;">You've been assigned to <strong>${escapeHtml(projectTitle)}</strong>. Open the project to view the brief, tasks, and messages.</p>
  `;

  const html = buildBrandedEmailHtml(brand, {
    subject,
    title: 'New project assignment',
    bodyHtml,
    ctaLabel: 'Open project',
    ctaUrl: projectUrl,
  });

  const text = [
    `You've been assigned to ${projectTitle}.`,
    '',
    `Open project: ${projectUrl}`,
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
