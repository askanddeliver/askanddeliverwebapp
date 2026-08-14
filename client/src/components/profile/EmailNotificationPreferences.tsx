import type { UserEmailNotificationPreferences, UserRole } from '../../types';

type PrefKey = keyof Pick<
  UserEmailNotificationPreferences,
  | 'clientMessages'
  | 'projectAssignments'
  | 'clientVisibleReplies'
  | 'taskCompleted'
  | 'invoiceSent'
>;

const TOGGLE_DEFS: Record<
  UserRole,
  { key: PrefKey; label: string; description: string }[]
> = {
  admin: [
    {
      key: 'clientMessages',
      label: 'Client messages',
      description: 'Email when a client posts a message on a project',
    },
  ],
  member: [
    {
      key: 'clientMessages',
      label: 'Client messages',
      description: 'Email when a client posts on a project you are assigned to',
    },
    {
      key: 'projectAssignments',
      label: 'Project assignments',
      description: 'Email when you are assigned to a new project',
    },
  ],
  client: [
    {
      key: 'clientVisibleReplies',
      label: 'Team updates',
      description: 'Email when your team sends a client-visible project message',
    },
    {
      key: 'taskCompleted',
      label: 'Task completed',
      description: 'Email when a shared task is marked complete',
    },
    {
      key: 'invoiceSent',
      label: 'Invoices',
      description: 'Email when a new invoice is sent to you',
    },
  ],
  pending: [],
};

export function defaultEmailPreferences(
  role: UserRole
): UserEmailNotificationPreferences {
  const prefs: UserEmailNotificationPreferences = {};
  for (const def of TOGGLE_DEFS[role]) {
    prefs[def.key] = false;
  }
  return prefs;
}

export function resolveEmailPreferences(
  role: UserRole,
  stored?: UserEmailNotificationPreferences
): UserEmailNotificationPreferences {
  const prefs = defaultEmailPreferences(role);
  for (const def of TOGGLE_DEFS[role]) {
    if (stored?.[def.key] === true) {
      prefs[def.key] = true;
    }
  }
  return prefs;
}

interface EmailNotificationPreferencesProps {
  role: UserRole;
  preferences: UserEmailNotificationPreferences;
  onChange: (preferences: UserEmailNotificationPreferences) => void;
  onSave: () => void;
  saving?: boolean;
  saved?: boolean;
  error?: string | null;
  compact?: boolean;
}

function EmailNotificationPreferences({
  role,
  preferences,
  onChange,
  onSave,
  saving = false,
  saved = false,
  error = null,
  compact = false,
}: EmailNotificationPreferencesProps) {
  const toggles = TOGGLE_DEFS[role];
  if (toggles.length === 0) return null;

  const toggle = (key: PrefKey, enabled: boolean) => {
    onChange({ ...preferences, [key]: enabled });
  };

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {!compact && (
        <>
          <h3 className="text-lg font-bold text-gray-900">Email notifications</h3>
          <p className="text-sm text-gray-500">
            All notification emails are off until you turn them on here. Nothing sends to clients or
            team members until they opt in, and the server must have{' '}
            <code className="text-xs">RESEND_NOTIFICATIONS_ENABLED=true</code>.
          </p>
        </>
      )}

      <ul className="space-y-3">
        {toggles.map(({ key, label, description }) => (
          <li
            key={key}
            className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-3"
          >
            <div>
              <p className="font-medium text-gray-900">{label}</p>
              <p className="text-sm text-gray-500">{description}</p>
            </div>
            <label className="relative inline-flex shrink-0 cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={preferences[key] === true}
                onChange={(e) => toggle(key, e.target.checked)}
              />
              <span className="h-6 w-11 rounded-full bg-gray-300 transition peer-checked:bg-primary-600 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
            </label>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className={compact ? 'btn-primary text-sm' : 'btn-primary'}
        >
          {saving ? 'Saving…' : 'Save notification settings'}
        </button>
        {saved && <span className="text-sm text-green-600">Saved</span>}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default EmailNotificationPreferences;
