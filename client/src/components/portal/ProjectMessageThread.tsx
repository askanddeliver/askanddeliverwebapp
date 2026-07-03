import { useState } from 'react';
import { RefreshCw, Send } from 'lucide-react';
import type { ProjectMessage } from '../../types';

interface ProjectMessageThreadProps {
  messages: ProjectMessage[];
  loading?: boolean;
  onSend: (body: string, clientVisible: boolean) => Promise<void>;
  onRefresh?: () => void;
  /** Admin/member compose — show visibility toggle */
  showVisibilityToggle?: boolean;
  emptyLabel?: string;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function roleBadge(role: ProjectMessage['authorRole']): string {
  switch (role) {
    case 'client':
      return 'Client';
    case 'admin':
      return 'Team';
    default:
      return 'Team';
  }
}

function ProjectMessageThread({
  messages,
  loading = false,
  onSend,
  onRefresh,
  showVisibilityToggle = false,
  emptyLabel = 'No messages yet.',
}: ProjectMessageThreadProps) {
  const [body, setBody] = useState('');
  const [clientVisible, setClientVisible] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;

    setSending(true);
    setError(null);
    try {
      await onSend(text, showVisibilityToggle ? clientVisible : true);
      setBody('');
      if (showVisibilityToggle) setClientVisible(false);
    } catch {
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-800">Messages</h3>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-brand-charcoal"
            title="Refresh messages"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-sage/30 border-t-brand-sage" />
        </div>
      ) : messages.length === 0 ? (
        <p className="py-4 text-sm text-neutral-500">{emptyLabel}</p>
      ) : (
        <ul className="mb-4 max-h-80 space-y-3 overflow-y-auto pr-1">
          {messages.map((m) => (
            <li
              key={m._id}
              className={`rounded-lg border px-3 py-2.5 ${
                m.authorRole === 'client'
                  ? 'border-brand-sage/25 bg-brand-sage/5'
                  : 'border-neutral-200 bg-white'
              }`}
            >
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                <span className="font-medium text-neutral-700">{m.authorName}</span>
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                  {roleBadge(m.authorRole)}
                </span>
                {showVisibilityToggle && !m.clientVisible && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">
                    Internal
                  </span>
                )}
                <span>{formatWhen(m.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-neutral-800">{m.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="border-t border-neutral-200 pt-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="input w-full text-sm"
          placeholder="Write a message…"
          disabled={sending}
        />
        {showVisibilityToggle && (
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-neutral-600">
            <input
              type="checkbox"
              checked={clientVisible}
              onChange={(e) => setClientVisible(e.target.checked)}
              className="rounded border-neutral-300"
            />
            Visible to client portal
          </label>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={sending || !body.trim()}
            className="btn-primary inline-flex items-center gap-1.5 text-sm"
          >
            <Send className="h-4 w-4" />
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProjectMessageThread;
