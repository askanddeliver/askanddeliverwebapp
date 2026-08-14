import { useEffect, useState } from 'react';
import { useUserRole } from '../../contexts/UserContext';
import { usersApi } from '../../services/api';
import EmailNotificationPreferences, {
  resolveEmailPreferences,
} from '../../components/profile/EmailNotificationPreferences';
import type { UserEmailNotificationPreferences } from '../../types';

function PortalSettings() {
  const { user, role, refetch } = useUserRole();
  const [preferences, setPreferences] = useState<UserEmailNotificationPreferences>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && role === 'client') {
      setPreferences(resolveEmailPreferences(role, user.notificationPreferences?.email));
    }
  }, [user, role]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await usersApi.updateMe({ notificationPreferences: { email: preferences } });
      await refetch();
      setSaved(true);
    } catch {
      setError('Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-display-sm mb-2 text-brand-charcoal">Email settings</h1>
      <p className="mb-8 text-neutral-600">
        All emails are off until you turn them on below. The server must also have{' '}
        <code className="text-xs">RESEND_NOTIFICATIONS_ENABLED=true</code> in its environment.
      </p>

      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <EmailNotificationPreferences
          role="client"
          preferences={preferences}
          onChange={setPreferences}
          onSave={handleSave}
          saving={saving}
          saved={saved}
          error={error}
          compact
        />
      </div>
    </div>
  );
}

export default PortalSettings;
