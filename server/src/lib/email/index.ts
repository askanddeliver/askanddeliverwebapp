export { resend, isResendConfigured } from './resendClient';
export {
  formatFromAddress,
  getDefaultFromName,
  getFromEmailAddress,
  isEmailConfigured,
  isEmailEnabled,
  isNotificationsDeliveryEnabled,
} from './emailConfig';
export { loadWorkspaceEmailBrand } from './brandContext';
export type { WorkspaceEmailBrand } from './brandContext';
export {
  buildBrandedEmailHtml,
  htmlToPlainText,
  truncateExcerpt,
} from './layout';
export type { BrandedEmailContent } from './layout';
export { sendEmail } from './sendEmail';
export type { SendEmailOptions, SendEmailResult } from './sendEmail';
export {
  enqueueEmailNotification,
} from './notificationService';
export type { NotificationEventId } from './notificationService';
export { getProjectStakeholderEmails, getMemberEmail, getClientPortalEmails, getInvoiceClientEmails } from './recipients';
export {
  isEmailPreferenceEnabled,
  mergeNotificationPreferences,
  parseNotificationPreferencesUpdate,
} from './notificationPreferences';
export type {
  EmailNotificationPreferenceKey,
  IUserEmailNotificationPreferences,
  IUserNotificationPreferences,
} from './notificationPreferences';
export { notifyClientMessageToTeam } from './notifications/clientMessageToTeam';
export { notifyClientPortalInvite } from './notifications/clientPortalInvite';
export { notifyTeamMessageToClient } from './notifications/teamMessageToClient';
export { notifyInvoiceSentToClient } from './notifications/invoiceSentToClient';
export { notifyClientTaskCompleted } from './notifications/clientTaskCompleted';
export { maybeNotifyClientTaskCompleted } from './taskCompletionNotify';
export {
  notifyMemberAssignedToProject,
  notifyMembersAssignedToProject,
} from './notifications/memberAssignedToProject';
