import { Pencil, Trash2, Archive } from 'lucide-react';
import type { Project, Client, ProjectBudgetBurn, ProjectTask } from '../../types';
import { formatCurrency } from '../../utils/calculations';
import { ProjectTaskList } from '../projectTasks/ProjectTaskList';

interface ProjectCardProps {
  project: Project;
  tasks: ProjectTask[];
  /** Effective billed vs budget (admin); period set on Projects page */
  budgetBurn?: ProjectBudgetBurn;
  budgetBurnPeriodLabel?: string;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  showBudget?: boolean;
  canEdit?: boolean;
  onCreateTask: (data: {
    projectId: string;
    title: string;
    description?: string;
    status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
    estimatedHours?: number;
  }) => void;
  onUpdateTask: (id: string, data: Partial<ProjectTask>) => void;
  onToggleTaskStatus: (id: string, status: string) => void;
  onDeleteTask: (id: string) => void;
  canReorder?: boolean;
  onReorderTasks?: (projectId: string, taskIds: string[]) => void | Promise<void>;
}

const statusStyles: Record<string, string> = {
  ACTIVE: 'bg-green-50 text-green-700 border-green-200',
  PAUSED: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  COMPLETED: 'bg-gray-50 text-gray-600 border-gray-200',
  ARCHIVED: 'bg-gray-100 text-gray-400 border-gray-200',
};

function projectBillingSummary(project: Project, showAmounts: boolean): string {
  const mode = project.billingMode ?? 'HOURLY';
  if (!showAmounts) {
    if (mode === 'FIXED_PRICE') return 'Fixed price';
    if (mode === 'HOUR_RETAINER') return 'Hour retainer';
    return 'Hourly';
  }
  if (mode === 'FIXED_PRICE' && project.agreedAmount != null) {
    return `Fixed · $${project.agreedAmount.toLocaleString()}`;
  }
  if (mode === 'HOUR_RETAINER' && project.retainerHoursTotal != null) {
    const adj =
      project.retainerHoursAdjustment != null && project.retainerHoursAdjustment !== 0
        ? ` · ${project.retainerHoursAdjustment > 0 ? '+' : ''}${project.retainerHoursAdjustment}h adj`
        : '';
    return `Retainer · ${project.retainerHoursTotal} hrs${adj}`;
  }
  if (mode === 'HOURLY' && project.budget) {
    return `Hourly · Budget $${project.budget.toLocaleString()}`;
  }
  return 'Hourly';
}

export function ProjectCard({
  project,
  tasks,
  budgetBurn,
  budgetBurnPeriodLabel,
  onEdit,
  onDelete,
  onArchive,
  onCreateTask,
  onUpdateTask,
  onToggleTaskStatus,
  onDeleteTask,
  canReorder = false,
  onReorderTasks,
  showBudget = true,
  canEdit = true,
}: ProjectCardProps) {
  const client =
    typeof project.clientId === 'object'
      ? (project.clientId as Client)
      : null;

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
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900 truncate">
            {project.title}
          </h3>
          {client && (
            <p className="text-sm text-gray-500 mt-0.5">{client.name}</p>
          )}
          {preview && (
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">{preview}</p>
          )}
        </div>

        {canEdit && (
        <div className="flex items-center gap-1 ml-4">
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
              className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
              title="Archive project"
            >
              <Archive className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onEdit(project)}
            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            title="Edit project"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (
                window.confirm(
                  `Are you sure you want to delete "${project.title}"?`
                )
              ) {
                onDelete(project._id);
              }
            }}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete project"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        )}
      </div>

      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
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
          <div className="mt-2 px-0.5" title="Billable amount from time entries × effective rates (excludes fixed-price/retainer logic)">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
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
            <p className="text-[11px] text-gray-500 mt-1 leading-snug">
              Budget burn {budgetBurn.percentUsed.toFixed(0)}% · {formatCurrency(budgetBurn.billed)} /{' '}
              {formatCurrency(budgetBurn.budget)}
              {budgetBurnPeriodLabel ? ` · ${budgetBurnPeriodLabel}` : ''}
            </p>
          </div>
        )}

      {/* Project Task List */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <ProjectTaskList
          tasks={tasks}
          projectId={project._id}
          projectTitle={project.title}
          onCreateTask={onCreateTask}
          onUpdateTask={onUpdateTask}
          onToggleStatus={onToggleTaskStatus}
          onDeleteTask={onDeleteTask}
          canEdit={canEdit}
          canReorder={canReorder}
          onReorderTasks={onReorderTasks}
        />
      </div>
    </div>
  );
}
