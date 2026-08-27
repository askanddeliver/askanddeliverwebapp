import { Link } from 'react-router-dom';
import { ArrowLeft, Archive, Pencil, Trash2 } from 'lucide-react';
import type { Client, Project } from '../../types';
import { projectBillingSummary } from '../../utils/projectBilling';

const statusStyles: Record<string, string> = {
  ACTIVE: 'bg-green-50 text-green-700 border-green-200',
  PAUSED: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  COMPLETED: 'bg-gray-50 text-gray-600 border-gray-200',
  ARCHIVED: 'bg-gray-100 text-gray-400 border-gray-200',
};

interface ProjectHubHeaderProps {
  project: Project;
  listPath: string;
  listLabel: string;
  showBilling: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

export function ProjectHubHeader({
  project,
  listPath,
  listLabel,
  showBilling,
  canEdit,
  onEdit,
  onArchive,
  onDelete,
}: ProjectHubHeaderProps) {
  const client =
    typeof project.clientId === 'object' ? (project.clientId as Client) : null;

  return (
    <div className="mb-6">
      <Link
        to={listPath}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--admin-text-3)] hover:text-[var(--admin-text)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {listLabel}
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-[-0.015em] text-[var(--admin-text)]">
            {project.title}
          </h1>
          {client && (
            <p className="mt-0.5 text-sm text-[var(--admin-text-2)]">{client.name}</p>
          )}
          {project.excerpt && (
            <p className="mt-2 text-sm text-[var(--admin-text-3)]">{project.excerpt}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                statusStyles[project.status] || statusStyles.ACTIVE
              }`}
            >
              {project.status}
            </span>
            <span className="text-xs text-[var(--admin-text-3)]">
              {projectBillingSummary(project, showBilling)}
            </span>
          </div>
        </div>

        {canEdit && (
          <div className="flex shrink-0 items-center gap-1">
            {project.status === 'COMPLETED' && (
              <button
                type="button"
                onClick={onArchive}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
                title="Archive project"
              >
                <Archive className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-primary-50 hover:text-primary-600"
              title="Edit project"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
              title="Delete project"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
