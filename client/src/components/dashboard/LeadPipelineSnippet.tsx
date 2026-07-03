import { Link } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import { AdminPanel } from '../admin/AdminPanel';
import type { DashboardPipelineLead, LeadStats } from '../../types';

const STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  PROPOSAL: 'Proposal',
};

interface LeadPipelineSnippetProps {
  stats: LeadStats | null;
  recent: DashboardPipelineLead[];
}

function LeadPipelineSnippet({ stats, recent }: LeadPipelineSnippetProps) {
  const openCount = stats
    ? (stats.NEW || 0) + (stats.CONTACTED || 0) + (stats.QUALIFIED || 0)
    : 0;

  return (
    <AdminPanel
      title="Lead pipeline"
      headerActions={
        <Link to="/leads" className="link text-sm font-medium">
          View all
        </Link>
      }
    >
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        {(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL'] as const).map((key) => (
          <span key={key} className="text-[var(--admin-text-2)]">
            <span className="font-mono font-semibold text-[var(--admin-text)]">
              {stats?.[key] ?? 0}
            </span>{' '}
            {STATUS_LABELS[key]}
          </span>
        ))}
        {openCount > 0 && (
          <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
            {openCount} open
          </span>
        )}
      </div>

      {recent.length === 0 ? (
        <p className="text-sm text-[var(--admin-text-3)]">
          No active leads in the pipeline.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--admin-border)]">
          {recent.map((lead) => (
            <li key={lead._id} className="flex items-start gap-3 py-2.5 first:pt-0">
              <Inbox className="mt-0.5 h-4 w-4 shrink-0 text-[var(--admin-text-3)]" />
              <div className="min-w-0 flex-1">
                <Link
                  to="/leads"
                  className="truncate text-sm font-medium text-[var(--admin-text)] hover:text-primary-600"
                >
                  {lead.name}
                  {lead.company ? ` · ${lead.company}` : ''}
                </Link>
                <p className="text-xs text-[var(--admin-text-3)]">
                  {STATUS_LABELS[lead.status] || lead.status} ·{' '}
                  {new Date(lead.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminPanel>
  );
}

export default LeadPipelineSnippet;
