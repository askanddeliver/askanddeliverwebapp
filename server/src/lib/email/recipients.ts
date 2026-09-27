import mongoose from 'mongoose';
import { User } from '../../models';
import type { IUserNotificationPreferences } from '../../models/User';
import {
  type EmailNotificationPreferenceKey,
  isEmailPreferenceEnabled,
} from './notificationPreferences';

export interface ProjectStakeholderEmailOptions {
  workspaceOwnerId: string;
  assignedMemberIds?: string[];
  includeAdmin?: boolean;
  includeAssigned?: boolean;
  /** Auth0 subs to omit (e.g. message author). */
  excludeAuth0Ids?: string[];
  /** When set, omit users who opted out of this email type. */
  preferenceKey?: EmailNotificationPreferenceKey;
}

export interface ProjectStakeholderRecipient {
  email: string;
  role: 'admin' | 'member';
  auth0Id: string;
}

function emailFromUser(user: {
  email?: string;
  notificationPreferences?: IUserNotificationPreferences;
}): string | null {
  const email = user.email?.trim().toLowerCase();
  return email || null;
}

/** Resolve unique active admin/member recipients for workspace admin + project assignees. */
export async function getProjectStakeholderRecipients(
  options: ProjectStakeholderEmailOptions
): Promise<ProjectStakeholderRecipient[]> {
  const {
    workspaceOwnerId,
    assignedMemberIds = [],
    includeAdmin = true,
    includeAssigned = true,
    excludeAuth0Ids = [],
    preferenceKey = 'clientMessages',
  } = options;

  const exclude = new Set(excludeAuth0Ids);
  const auth0Ids = new Set<string>();

  if (includeAdmin && !exclude.has(workspaceOwnerId)) {
    auth0Ids.add(workspaceOwnerId);
  }

  if (includeAssigned) {
    for (const id of assignedMemberIds) {
      if (id && !exclude.has(id)) {
        auth0Ids.add(id);
      }
    }
  }

  if (auth0Ids.size === 0) return [];

  const users = await User.find({
    auth0Id: { $in: [...auth0Ids] },
    status: 'active',
    role: { $in: ['admin', 'member'] },
  })
    .select('auth0Id email role notificationPreferences')
    .lean();

  const seen = new Set<string>();
  const recipients: ProjectStakeholderRecipient[] = [];

  for (const u of users) {
    if (!isEmailPreferenceEnabled(u.notificationPreferences, preferenceKey)) continue;
    const email = emailFromUser(u);
    if (!email || seen.has(email)) continue;
    if (u.role !== 'admin' && u.role !== 'member') continue;
    seen.add(email);
    recipients.push({ email, role: u.role, auth0Id: u.auth0Id });
  }

  return recipients;
}

/** Resolve unique active user emails for workspace admin + project assignees. */
export async function getProjectStakeholderEmails(
  options: ProjectStakeholderEmailOptions
): Promise<string[]> {
  const recipients = await getProjectStakeholderRecipients(options);
  return recipients.map((r) => r.email);
}

export async function getMemberEmail(
  auth0Id: string,
  preferenceKey: EmailNotificationPreferenceKey = 'projectAssignments'
): Promise<string | null> {
  const user = await User.findOne({ auth0Id, status: 'active' })
    .select('email notificationPreferences')
    .lean();
  if (!user || !isEmailPreferenceEnabled(user.notificationPreferences, preferenceKey)) {
    return null;
  }
  return emailFromUser(user);
}

/** Active client-portal user emails for a CRM client record. */
export async function getClientPortalEmails(
  workspaceOwnerId: string,
  clientId: string | mongoose.Types.ObjectId,
  preferenceKey: EmailNotificationPreferenceKey
): Promise<string[]> {
  const users = await User.find({
    workspaceOwnerId,
    role: 'client',
    clientId,
    status: 'active',
  })
    .select('email notificationPreferences')
    .lean();

  const emails = users
    .filter((u) => isEmailPreferenceEnabled(u.notificationPreferences, preferenceKey))
    .map((u) => emailFromUser(u))
    .filter((e): e is string => !!e);

  return [...new Set(emails)];
}

/** Portal users who opted in to invoiceSent only (no CRM email fallback). */
export async function getInvoiceClientEmails(
  workspaceOwnerId: string,
  clientId: string | mongoose.Types.ObjectId
): Promise<string[]> {
  return getClientPortalEmails(workspaceOwnerId, clientId, 'invoiceSent');
}
