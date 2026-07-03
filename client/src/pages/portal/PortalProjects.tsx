import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { portalApi } from '../../services/api';
import PortalStatusBadge from '../../components/portal/PortalStatusBadge';
import type { PortalProjectSummary, ProjectStatus } from '../../types';

type StatusTab = ProjectStatus | 'ALL';

const TABS: { value: StatusTab; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'On hold' },
  { value: 'COMPLETED', label: 'Complete' },
  { value: 'ALL', label: 'All' },
];

function PortalProjects() {
  const [tab, setTab] = useState<StatusTab>('ACTIVE');
  const [projects, setProjects] = useState<PortalProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    portalApi
      .getProjects({ status: tab })
      .then((res) => {
        setProjects(res.data.projects || []);
        setError(null);
      })
      .catch(() => setError('Failed to load projects'))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-display-sm mb-2 text-brand-charcoal">Projects</h1>
      <p className="mb-6 text-neutral-600">Browse your projects with the team.</p>

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.value
                ? 'bg-brand-sage text-white'
                : 'bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-sage/30 border-t-brand-sage" />
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-neutral-600">
          No projects in this view.
        </div>
      ) : (
        <ul className="space-y-3">
          {projects.map((p) => (
            <li key={p._id}>
              <Link
                to={`/portal/projects/${p._id}`}
                className="block rounded-xl border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-brand-charcoal">{p.title}</h2>
                    {p.excerpt && (
                      <p className="mt-1 line-clamp-2 text-sm text-neutral-500">{p.excerpt}</p>
                    )}
                  </div>
                  <PortalStatusBadge kind="project" status={p.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-neutral-400">
                  <span>
                    Updated {new Date(p.updatedAt).toLocaleDateString()}
                  </span>
                  {p.openTaskCount > 0 && (
                    <span>
                      {p.openTaskCount} open task{p.openTaskCount === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PortalProjects;
