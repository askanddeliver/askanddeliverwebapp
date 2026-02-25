import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useUserRole } from '../contexts/UserContext';
import { usersApi } from '../services/api';

function Profile() {
  const { user: auth0User } = useAuth0();
  const { user: appUser, role, isAdmin, refetch } = useUserRole();
  const [displayName, setDisplayName] = useState(appUser?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (appUser?.name) setDisplayName(appUser.name);
  }, [appUser?.name]);

  const user = auth0User;

  if (!user) {
    return null;
  }

  const effectiveName = displayName || appUser?.name || 'User';

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await usersApi.updateMe({ name: displayName.trim() });
      await refetch();
    } catch (err) {
      console.error('Failed to update name:', err);
      setSaveError('Failed to update display name');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile</h1>

      <div className="card">
        <div className="flex items-start gap-6">
          {user.picture && (
            <img
              src={user.picture}
              alt={effectiveName}
              className="w-24 h-24 rounded-full"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {effectiveName}
            </h2>
            <p className="text-gray-600 mb-4">{user.email}</p>

            {appUser && (
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  isAdmin
                    ? 'bg-primary-100 text-primary-800'
                    : role === 'member'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                }`}
              >
                {role === 'admin' && 'Admin'}
                {role === 'member' && 'Member'}
                {role === 'pending' && 'Pending'}
              </span>
            )}
            {user.email_verified && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 ml-2">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Email Verified
              </span>
            )}
          </div>
        </div>

        <hr className="my-6" />

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Display name</h3>
          <p className="text-sm text-gray-500">
            This name appears in team lists, reports, and member hours. Update it if you see &quot;User&quot; instead of your name.
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="input flex-1"
            />
            <button
              type="button"
              onClick={handleSaveName}
              disabled={saving || !displayName.trim()}
              className="btn-primary shrink-0"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
          {saveError && (
            <p className="text-sm text-red-600">{saveError}</p>
          )}
        </div>

        <hr className="my-6" />

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Account Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                User ID
              </label>
              <p className="text-gray-900 font-mono text-sm bg-gray-50 px-3 py-2 rounded-lg break-all">
                {user.sub}
              </p>
            </div>

            {user.nickname && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Nickname
                </label>
                <p className="text-gray-900">{user.nickname}</p>
              </div>
            )}

            {user.updated_at && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Last Updated
                </label>
                <p className="text-gray-900">
                  {new Date(user.updated_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}
          </div>
        </div>

        <hr className="my-6" />

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Raw User Data</h3>
          <p className="text-sm text-gray-500">
            This is the full user object from Auth0. Useful for debugging.
          </p>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default Profile;
