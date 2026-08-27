import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  Archive,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Circle,
  Clock,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { Project, ProjectBudgetBurn, ProjectTask } from '../../types';
import { formatCurrency } from '../../utils/calculations';
import { projectBillingSummary } from '../../utils/projectBilling';
import { sortProjectTasksByOrder } from '../../utils/projectTasks';
import type { ClientProjectGroup } from '../../utils/projectClient';

const projectStatusStyles: Record<string, string> = {
  ACTIVE: 'bg-green-50 text-green-700 border-green-200',
  PAUSED: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  COMPLETED: 'bg-gray-50 text-gray-600 border-gray-200',
  ARCHIVED: 'bg-gray-100 text-gray-400 border-gray-200',
};

const taskStatusIcons: Record<string, ReactNode> = {
  TODO: <Circle className="h-3.5 w-3.5 text-gray-400" />,
  IN_PROGRESS: <Clock className="h-3.5 w-3.5 text-blue-500" />,
  COMPLETED: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
};

interface ClientProjectsCardProps {
  group: ClientProjectGroup;
  hubPathPrefix: string;
  openTasksByProjectId?: Record<string, ProjectTask[]>;
  budgetBurnByProjectId?: Record<string, ProjectBudgetBurn>;
  budgetBurnPeriodLabel?: string;
  showBudget?: boolean;
  canEdit?: boolean;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
}

export function ClientProjectsCard({
  group,
  hubPathPrefix,
  openTasksByProjectId = {},
  budgetBurnByProjectId,
  budgetBurnPeriodLabel,
  showBudget = true,
  canEdit = true,
  onEdit,
  onDelete,
  onArchive,
}: ClientProjectsCardProps) {
  const projectCount = group.projects.length;

  return (
    <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <header className="flex items-start gap-3 border-b border-gray-100 bg-gray-50/80 px-4 py-3.5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
          <Briefcase className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-gray-900">
            {group.clientName}
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {group.clientCompany ? `${group.clientCompany} · ` : ''}
            {projectCount} {projectCount === 1 ? 'project' : 'projects'}
            {group.isInternal ? ' · Internal' : ''}
          </p>
        </div>
      </header>

      <ul className="divide-y divide-gray-100">
        {group.projects.map((project) => {
          const hubTo = `${hubPathPrefix}/${project._id}`;
          const openTasks = sortProjectTasksByOrder(
            openTasksByProjectId[project._id] || []
          );
          const budgetBurn = budgetBurnByProjectId?.[project._id];
          const isArchived = project.status === 'ARCHIVED';

          return (
            <li
              key={project._id}
              className={`px-4 py-3 ${isArchived ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={hubTo}
                      className="min-w-0 font-medium text-gray-900 hover:text-primary-700 hover:underline"
                    >
                      {project.title}
                    </Link>
                    {canEdit && (
                      <div className="flex shrink-0 items-center gap-0.5">
                        {project.status === 'COMPLETED' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Archive "${project.title}"? It will move to the Archived tab.`
                                )
                              ) {
                                onArchive(project._id);
                              }
                            }}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-amber-50 hover:text-amber-600"
                            title="Archive project"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onEdit(project)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-primary-50 hover:text-primary-600"
                          title="Edit project"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Are you sure you want to delete "${project.title}"?`
                              )
                            ) {
                              onDelete(project._id);
                            }
                          }}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          title="Delete project"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                        projectStatusStyles[project.status] || projectStatusStyles.ACTIVE
                      }`}
                    >
                      {project.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {projectBillingSummary(project, showBudget)}
                    </span>
                    {openTasks.length > 0 && (
                      <span className="text-xs text-gray-400">
                        {openTasks.length} open{' '}
                        {openTasks.length === 1 ? 'task' : 'tasks'}
                      </span>
                    )}
                  </div>

                  {showBudget &&
                    budgetBurn &&
                    (project.billingMode ?? 'HOURLY') === 'HOURLY' &&
                    project.budget != null &&
                    project.budget > 0 && (
                      <div className="mt-2" title="Billable amount from time entries × effective rates">
                        <div className="h-1 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full ${
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
                          {formatCurrency(budgetBurn.billed)} /{' '}
                          {formatCurrency(budgetBurn.budget)}
                          {budgetBurnPeriodLabel ? ` · ${budgetBurnPeriodLabel}` : ''}
                        </p>
                      </div>
                    )}

                  {openTasks.length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {openTasks.slice(0, 6).map((task) => (
                        <li key={task._id}>
                          <Link
                            to={`${hubTo}#tasks`}
                            className="flex items-center gap-2 rounded-md px-1 py-0.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          >
                            <span className="shrink-0">
                              {taskStatusIcons[task.status]}
                            </span>
                            <span className="truncate">{task.title}</span>
                          </Link>
                        </li>
                      ))}
                      {openTasks.length > 6 && (
                        <li className="pl-6 text-xs text-gray-400">
                          +{openTasks.length - 6} more
                        </li>
                      )}
                    </ul>
                  )}
                </div>

                <Link
                  to={hubTo}
                  className="mt-0.5 shrink-0 rounded-lg p-1.5 text-primary-600 hover:bg-primary-50"
                  title="Open project"
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
