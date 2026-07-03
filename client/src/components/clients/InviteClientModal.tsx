import { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import type { Client } from '../../types';

interface InviteClientModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string, clientId: string) => Promise<void>;
}

export function InviteClientModal({
  client,
  isOpen,
  onClose,
  onSubmit,
}: InviteClientModalProps) {
  const [email, setEmail] = useState(client?.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const appUrl = window.location.origin;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;
    setError(null);
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    try {
      setSubmitting(true);
      await onSubmit(email.trim(), client._id);
      onClose();
    } catch (err: unknown) {
      let msg = 'Failed to send invite';
      if (err && typeof err === 'object' && 'response' in err) {
        const data = (err as { response?: { data?: { message?: string } } })
          .response?.data;
        if (typeof data?.message === 'string') msg = data.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setError(null);
    onClose();
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen || !client) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900">Invite to Portal</h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1 transition-colors hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <p className="text-sm text-gray-600">
            Grant portal access for <strong>{client.name}</strong>. The contact
            must already have an account — share the login link below if needed,
            then enter their email.
          </p>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="mb-2 text-xs font-medium text-gray-500">Login link</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate text-xs text-gray-700">
                {appUrl}
              </code>
              <button
                type="button"
                onClick={handleCopyLink}
                className="shrink-0 rounded p-1.5 text-gray-500 hover:bg-gray-200"
                title="Copy link"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Contact email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@company.com"
              className="input"
              autoFocus
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="btn-primary flex-1 disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Inviting...' : 'Grant Portal Access'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
