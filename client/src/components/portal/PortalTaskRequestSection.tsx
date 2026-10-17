import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { portalApi } from '../../services/api';
import type { ProjectTaskSuggestion } from '../../types';

interface PortalTaskRequestSectionProps {
  projectId: string;
}

function apiMessage(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: string } } }).response?.data
    ?.message;
  return typeof msg === 'string' && msg ? msg : fallback;
}

function statusLabel(status: ProjectTaskSuggestion['status']): string {
  if (status === 'PENDING') return 'Waiting';
  if (status === 'APPROVED') return 'Added';
  return 'Not added';
}

function PortalTaskRequestSection({ projectId }: PortalTaskRequestSectionProps) {
  const [suggestions, setSuggestions] = useState<ProjectTaskSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await portalApi.getTaskSuggestions(projectId);
      setSuggestions(res.data || []);
    } catch {
      /* keep existing */
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await portalApi.createTaskSuggestion(projectId, {
        title: trimmed,
        description: description.trim() || undefined,
      });
      setSuggestions((prev) => [res.data, ...prev]);
      setTitle('');
      setDescription('');
    } catch (err) {
      setError(apiMessage(err, 'Could not send this request'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-neutral-500">
        Request a task
      </h2>
      <p className="mb-4 text-sm text-neutral-500">
        Requests are reviewed by the team before they appear as tasks.
      </p>

      <form onSubmit={handleSubmit} className="mb-6 space-y-3">
        <div>
          <label htmlFor="task-request-title" className="sr-only">
            Task title
          </label>
          <input
            id="task-request-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            required
            placeholder="What should we add?"
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-brand-charcoal placeholder:text-neutral-400 focus:border-brand-sage focus:outline-none focus:ring-1 focus:ring-brand-sage"
          />
        </div>
        <div>
          <label htmlFor="task-request-description" className="sr-only">
            Details
          </label>
          <textarea
            id="task-request-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Optional details"
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-brand-charcoal placeholder:text-neutral-400 focus:border-brand-sage focus:outline-none focus:ring-1 focus:ring-brand-sage"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="btn-primary text-sm disabled:opacity-50"
        >
          {submitting ? 'Sending…' : 'Send request'}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-neutral-500">Loading requests…</p>
      ) : suggestions.length === 0 ? (
        <p className="text-sm italic text-neutral-500">You haven&apos;t requested any tasks yet.</p>
      ) : (
        <ul className="space-y-3">
          {suggestions.map((s) => (
            <li
              key={s._id}
              className="rounded-lg border border-neutral-100 bg-neutral-50/50 px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-brand-charcoal">{s.title}</span>
                <span
                  className={`text-xs font-semibold ${
                    s.status === 'APPROVED'
                      ? 'text-green-700'
                      : s.status === 'DECLINED'
                        ? 'text-neutral-500'
                        : 'text-amber-700'
                  }`}
                >
                  {statusLabel(s.status)}
                </span>
              </div>
              {s.description && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">
                  {s.description}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PortalTaskRequestSection;
