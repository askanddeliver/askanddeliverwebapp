import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUserRole } from '../../contexts/UserContext';
import { portalApi } from '../../services/api';
import PortalStatusBadge from '../../components/portal/PortalStatusBadge';
import type { PortalDashboardResponse } from '../../types';

function PortalHome() {
  const { user } = useUserRole();
  const [data, setData] = useState<PortalDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    portalApi
      .getDashboard()
      .then((res) => {
        setData(res.data);
        setError(null);
      })
      .catch(() => setError('Failed to load portal'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-sage/30 border-t-brand-sage" />
      </div>
    );
  }

  const firstName = user?.name?.split(' ')[0];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-display-sm mb-2 text-brand-charcoal">
        Welcome{firstName ? `, ${firstName}` : ''}
      </h1>
      <p className="mb-8 text-neutral-600">
        {data?.companyName
          ? `${data.companyName} client portal — your projects and updates.`
          : 'Your client portal — projects, briefs, and messages.'}
      </p>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-charcoal">Active projects</h2>
          <Link to="/portal/projects" className="text-sm text-brand-sage hover:underline">
            View all
          </Link>
        </div>

        {data?.activeProjects.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
            <p className="text-neutral-600">No active projects right now.</p>
            {data?.companyEmail && (
              <p className="mt-2 text-sm text-neutral-500">
                Questions? Contact{' '}
                <a href={`mailto:${data.companyEmail}`} className="text-brand-sage underline">
                  {data.companyEmail}
                </a>
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {data?.activeProjects.map((p) => (
              <Link
                key={p._id}
                to={`/portal/projects/${p._id}`}
                className="rounded-xl border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-md"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-brand-charcoal">{p.title}</h3>
                  <PortalStatusBadge kind="project" status={p.status} />
                </div>
                {p.excerpt && (
                  <p className="mb-2 line-clamp-2 text-sm text-neutral-500">{p.excerpt}</p>
                )}
                <p className="text-xs text-neutral-400">
                  {p.openTaskCount > 0
                    ? `${p.openTaskCount} open task${p.openTaskCount === 1 ? '' : 's'}`
                    : 'No open tasks'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {data && data.recentUpdates.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-brand-charcoal">Recent updates</h2>
          <ul className="space-y-3">
            {data.recentUpdates.map((u) => (
              <li
                key={u._id}
                className="rounded-lg border border-neutral-200 bg-white px-4 py-3"
              >
                <p className="text-sm text-neutral-800 line-clamp-2">{u.body}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {u.authorName}
                  {u.projectTitle ? ` · ${u.projectTitle}` : ''} ·{' '}
                  {new Date(u.createdAt).toLocaleDateString()}
                </p>
                {u.projectId && (
                  <Link
                    to={`/portal/projects/${u.projectId}`}
                    className="mt-1 inline-block text-xs text-brand-sage hover:underline"
                  >
                    View project
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default PortalHome;
