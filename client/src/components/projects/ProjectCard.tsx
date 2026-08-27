import { Link } from 'react-router-dom';
import { Pencil, Trash2, Archive, ArrowRight } from 'lucide-react';
import type { Project, Client, ProjectBudgetBurn } from '../../types';
import { formatCurrency } from '../../utils/calculations';
import { projectBillingSummary } from '../../utils/projectBilling';

interface ProjectCardProps {
  project: Project;
  hubTo: string;
  /** Effective billed vs budget (admin); period set on Projects page */
  budgetBurn?: ProjectBudgetBurn;
  budgetBurnPeriodLabel?: string;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  showBudget?: boolean;
  canEdit?: boolean;
}

const statusStyles: Record<string, string> = {
  ACTIVE: 'bg-green-50 text-green-700 border-green-200',
  PAUSED: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  COMPLETED: 'bg-gray-50 text-gray-600 border-gray-200',
  ARCHIVED: 'bg-gray-100 text-gray-400 border-gray-200',
};

export function ProjectCard({
  project,
  hubTo,
  budgetBurn,
  budgetBurnPeriodLabel,
  onEdit,
  onDelete,
  onArchive,
  showBudget = true,
  canEdit = true,
}: ProjectCardProps) {
  const client =
    typeof project.clientId === 'object' ? (project.clientId as Client) : null;

  const isArchived = project.status === 'ARCHIVED';

  const preview =
    project.excerpt ||
    (project.brief
      ? (() => {
          const plain = project.brief.replace(/<[^>]*>/g, '').trim();
          return plain.length > 120 ? plain.slice(0, 120) + '…' : plain;
        })()
      : '') ||
    project.description ||
    '';

  return (
    <div className={`card hover:shadow-md transition-shadow ${isArchived ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold text-gray-900">
            <Link to={hubTo} className="hover:text-primary-700 hover:underline">
              {project.title}
            </Link>
          </h3>
          {client && <p className="mt-0.5 text-sm text-gray-500">{client.name}</p>}
          {preview && (
            <p className="mt-1 line-clamp-2 text-sm text-gray-400">{preview}</p>
          )}
        </div>

        {canEdit && (
          <div className="ml-4 flex items-center gap-1">
            {project.status === 'COMPLETED' && (
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      `Archive "${project.title}"? It will move to the Archived tab.`
                    )
                  ) {
                    onArchive(project._id);
                  }
                }}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
                title="Archive project"
              >
                <Archive className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => onEdit(project)}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-primary-50 hover:text-primary-600"
              title="Edit project"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete "${project.title}"?`)) {
                  onDelete(project._id);
                }
              }}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
              title="Delete project"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3 border-t border-gray-100 pt-3">
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
            statusStyles[project.status]
          }`}
        >
          {project.status}
        </span>
        <span className="text-xs text-gray-500">
          {projectBillingSummary(project, showBudget)}
        </span>
      </div>

      {showBudget &&
        budgetBurn &&
        (project.billingMode ?? 'HOURLY') === 'HOURLY' &&
        project.budget != null &&
        project.budget > 0 && (
          <div
            className="mt-2 px-0.5"
            title="Billable amount from time entries × effective rates (excludes fixed-price/retainer logic)"
          >
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full transition-all ${
                  budgetBurn.percentUsed >= 100
                    ? 'bg-red-500'
                    : budgetBurn.percentUsed >= 85
                      ? 'bg-amber-500'
                      : 'bg-primary-500'
                }`}
                style={{
                  width: `${Math.min(100, budgetBurn.percentUsed)}%`,
                }}
              />
            </div>
            <p className="mt-1 text-[11px] leading-snug text-gray-500">
              Budget burn {budgetBurn.percentUsed.toFixed(0)}% · {formatCurrency(budgetBurn.billed)} /{' '}
              {formatCurrency(budgetBurn.budget)}
              {budgetBurnPeriodLabel ? ` · ${budgetBurnPeriodLabel}` : ''}
            </p>
          </div>
        )}

      <div className="mt-3">
        <Link
          to={hubTo}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-800"
        >
          Open project
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
