import { getFrontendBaseUrl } from '../frontendUrl';
import type { WorkspaceEmailBrand } from './brandContext';
import {
  getProjectStakeholderRecipients,
  type ProjectStakeholderEmailOptions,
} from './recipients';
import { sendEmail } from './sendEmail';

/** Admin hub vs member hub deep link for the same project section. */
export function projectHubUrl(role: string, projectId: string, hash: string): string {
  const path = role === 'member' ? `/member/projects/${projectId}` : `/projects/${projectId}`;
  const fragment = hash.startsWith('#') ? hash : `#${hash}`;
  return `${getFrontendBaseUrl()}${path}${fragment}`;
}

export async function sendBrandedEmailToProjectStakeholders(opts: {
  stakeholder: ProjectStakeholderEmailOptions;
  brand: WorkspaceEmailBrand;
  projectId: string;
  hash: string;
  build: (projectUrl: string) => { subject: string; html: string; text: string };
}): Promise<void> {
  const recipients = await getProjectStakeholderRecipients(opts.stakeholder);
  if (recipients.length === 0) return;

  const buckets = new Map<string, string[]>();
  for (const r of recipients) {
    const url = projectHubUrl(r.role, opts.projectId, opts.hash);
    const emails = buckets.get(url) ?? [];
    emails.push(r.email);
    buckets.set(url, emails);
  }

  for (const [projectUrl, to] of buckets) {
    const { subject, html, text } = opts.build(projectUrl);
    await sendEmail({
      to,
      subject,
      html,
      text,
      fromName: opts.brand.companyName,
      replyTo: opts.brand.companyEmail,
    });
  }
}
