/**
 * Async notification dispatch — route handlers call these after the primary action succeeds.
 * Failures are logged only; they never fail the HTTP response.
 */

export type NotificationEventId =
  | 'client.message.posted'
  | 'member.assigned.project'
  | 'member.task.assigned'
  | 'client.portal.invite'
  | 'team.message.client_visible'
  | 'client.task.completed'
  | 'client.invoice.sent';

/** Run an email send without blocking or failing the caller. */
export function enqueueEmailNotification(task: () => Promise<void>): void {
  void task().catch((err) => {
    console.error('[email] notification task failed', err);
  });
}

export { isEmailEnabled } from './emailConfig';
export { sendEmail } from './sendEmail';
export { loadWorkspaceEmailBrand } from './brandContext';
export { buildBrandedEmailHtml, truncateExcerpt, htmlToPlainText } from './layout';
export { getFrontendBaseUrl } from '../frontendUrl';
