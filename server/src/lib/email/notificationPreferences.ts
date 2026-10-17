export type EmailDigestPreference = 'none' | 'daily' | 'weekly';

export type EmailNotificationPreferenceKey =
  | 'clientMessages'
  | 'projectAssignments'
  | 'clientVisibleReplies'
  | 'taskCompleted'
  | 'invoiceSent'
  | 'teamMessages'
  | 'allMessages'
  | 'mentionMessages'
  | 'taskSuggestions'
  | 'taskSuggestionApproved';

export interface IUserEmailNotificationPreferences {
  /** Admin/member: email when a client posts a project message */
  clientMessages?: boolean;
  /** Member: email when assigned to a project */
  projectAssignments?: boolean;
  /** Client: email when team posts a client-visible message */
  clientVisibleReplies?: boolean;
  /** Client: email when a client-visible task is marked complete */
  taskCompleted?: boolean;
  /** Client: email when an invoice is sent */
  invoiceSent?: boolean;
  /** Admin/member: email when a teammate chooses Notify team */
  teamMessages?: boolean;
  /**
   * Admin/member: email on every teammate post, including silent (no notify selection).
   * Legacy: unset + teamMessages true counts as on.
   */
  allMessages?: boolean;
  /** Admin/member: email when a teammate @mentions you */
  mentionMessages?: boolean;
  /** Admin/member: email when a client submits a task request */
  taskSuggestions?: boolean;
  /** Client: email when a task request is approved */
  taskSuggestionApproved?: boolean;
  digest?: EmailDigestPreference;
}

export interface IUserNotificationPreferences {
  email?: IUserEmailNotificationPreferences;
}

const EMAIL_TOGGLE_KEYS: EmailNotificationPreferenceKey[] = [
  'clientMessages',
  'projectAssignments',
  'clientVisibleReplies',
  'taskCompleted',
  'invoiceSent',
  'teamMessages',
  'allMessages',
  'mentionMessages',
  'taskSuggestions',
  'taskSuggestionApproved',
];

/** Legacy teamMessages meant every teammate post; honor that until allMessages is set. */
export function isAllProjectMessagesEnabled(
  preferences: IUserNotificationPreferences | undefined
): boolean {
  const email = preferences?.email;
  if (email?.allMessages === true) return true;
  if (email?.allMessages === false) return false;
  return email?.teamMessages === true;
}

/** Opt-in only — email sends when the user explicitly set this preference to true. */
export function isEmailPreferenceEnabled(
  preferences: IUserNotificationPreferences | undefined,
  key: EmailNotificationPreferenceKey
): boolean {
  return preferences?.email?.[key] === true;
}

export type ProjectMessageNotifyKind = 'silent' | 'team' | 'mention';

/** One email per post: all-messages wins, then the matching targeted pref. */
export function receivesProjectMessageEmail(
  preferences: IUserNotificationPreferences | undefined,
  kind: ProjectMessageNotifyKind
): boolean {
  if (isAllProjectMessagesEnabled(preferences)) return true;
  if (kind === 'team') return isEmailPreferenceEnabled(preferences, 'teamMessages');
  if (kind === 'mention') return isEmailPreferenceEnabled(preferences, 'mentionMessages');
  return false;
}

export function parseNotificationPreferencesUpdate(
  body: unknown
): IUserNotificationPreferences | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const raw = body as { email?: unknown };
  if (!raw.email || typeof raw.email !== 'object') return undefined;

  const src = raw.email as Record<string, unknown>;
  const email: IUserEmailNotificationPreferences = {};

  for (const key of EMAIL_TOGGLE_KEYS) {
    if (src[key] === undefined) continue;
    email[key] = Boolean(src[key]);
  }

  if (src.digest !== undefined) {
    const digest = String(src.digest);
    if (digest === 'none' || digest === 'daily' || digest === 'weekly') {
      email.digest = digest;
    }
  }

  return Object.keys(email).length > 0 ? { email } : undefined;
}

export function mergeNotificationPreferences(
  existing: IUserNotificationPreferences | undefined,
  patch: IUserNotificationPreferences | undefined
): IUserNotificationPreferences | undefined {
  if (!patch?.email) return existing;
  return {
    email: {
      ...existing?.email,
      ...patch.email,
    },
  };
}
