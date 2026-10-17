import { useCallback, useEffect, useState } from 'react';
import { projectTaskSuggestionsApi } from '../../services/api';
import type { ProjectTaskSuggestion } from '../../types';

interface ProjectTaskSuggestionsPanelProps {
  projectId: string;
  canReview: boolean;
  onTaskCreated?: () => void;
}

function apiMessage(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: string } } }).response?.data
    ?.message;
  return typeof msg === 'string' && msg ? msg : fallback;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function ProjectTaskSuggestionsPanel({
  projectId,
  canReview,
  onTaskCreated,
}: ProjectTaskSuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<ProjectTaskSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    id: string;
    action: 'approve' | 'decline';
  } | null>(null);
  const [reviewedOpen, setReviewedOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectTaskSuggestionsApi.list(projectId);
      setSuggestions(res.data || []);
      setError(null);
    } catch {
      setError('Could not load task requests');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const pending = suggestions.filter((s) => s.status === 'PENDING');
  const reviewed = suggestions.filter((s) => s.status !== 'PENDING');

  const handleApprove = async (id: string) => {
    setBusyId(id);
    try {
      const res = await projectTaskSuggestionsApi.approve(projectId, id);
      setSuggestions((prev) =>
        prev.map((s) => (s._id === id ? res.data.suggestion : s))
      );
      setConfirm(null);
      onTaskCreated?.();
    } catch (err) {
      setError(apiMessage(err, 'Could not add this request as a task'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDecline = async (id: string) => {
    setBusyId(id);
    try {
      const res = await projectTaskSuggestionsApi.decline(projectId, id);
      setSuggestions((prev) => prev.map((s) => (s._id === id ? res.data : s)));
      setConfirm(null);
    } catch (err) {
      setError(apiMessage(err, 'Could not decline this request'));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <p className="text-sm text-[var(--admin-text-muted)]">Loading requests…</p>
    );
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {pending.length === 0 && reviewed.length === 0 ? (
        <p className="text-sm text-[var(--admin-text-muted)]">No client requests yet.</p>
      ) : null}

      {pending.length > 0 && (
        <ul className="space-y-3">
          {pending.map((s) => (
            <li
              key={s._id}
              className="rounded-lg border px-3 py-3"
              style={{ borderColor: 'var(--admin-border)' }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-[var(--admin-text)]">{s.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--admin-text-muted)]">
                    {s.suggestedByName} · {formatWhen(s.createdAt)}
                  </p>
                </div>
                {canReview && (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      disabled={busyId === s._id}
                      onClick={() => setConfirm({ id: s._id, action: 'approve' })}
                      className="rounded-md bg-primary-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      Add as task
                    </button>
                    <button
                      type="button"
                      disabled={busyId === s._id}
                      onClick={() => setConfirm({ id: s._id, action: 'decline' })}
                      className="rounded-md border px-2.5 py-1 text-xs font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-surface-2)] disabled:opacity-50"
                      style={{ borderColor: 'var(--admin-border)' }}
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
              {s.description && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--admin-text-muted)]">
                  {s.description}
                </p>
              )}
              {confirm?.id === s._id && (
                <div
                  className="mt-3 rounded-md border bg-[var(--admin-surface-2)] px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--admin-border)' }}
                >
                  {confirm.action === 'approve' ? (
                    <p className="text-[var(--admin-text)]">
                      Add “{s.title}” as a client-visible task?
                    </p>
                  ) : (
                    <p className="text-[var(--admin-text)]">
                      Decline this request? The client will see it as Not added. No
                      email is sent.
                    </p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === s._id}
                      onClick={() =>
                        confirm.action === 'approve'
                          ? handleApprove(s._id)
                          : handleDecline(s._id)
                      }
                      className="rounded-md bg-primary-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      {busyId === s._id
                        ? 'Working…'
                        : confirm.action === 'approve'
                          ? 'Add task'
                          : 'Decline request'}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === s._id}
                      onClick={() => setConfirm(null)}
                      className="text-xs font-medium text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {reviewed.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setReviewedOpen((open) => !open)}
            className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
          >
            Recently reviewed ({reviewed.length})
          </button>
          {reviewedOpen && (
            <ul className="mt-2 space-y-2">
              {reviewed.map((s) => (
                <li
                  key={s._id}
                  className="rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--admin-border)' }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-[var(--admin-text)]">{s.title}</span>
                    <span className="text-xs text-[var(--admin-text-muted)]">
                      {s.status === 'APPROVED' ? 'Added' : 'Declined'}
                      {s.reviewedAt ? ` · ${formatWhen(s.reviewedAt)}` : ''}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default ProjectTaskSuggestionsPanel;
