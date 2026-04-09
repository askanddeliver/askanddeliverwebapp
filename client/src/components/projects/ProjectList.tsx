import { FolderOpen } from 'lucide-react';
import type { Project, ProjectBudgetBurn, ProjectTask } from '../../types';
import { ProjectCard } from './ProjectCard';

interface ProjectListProps {
  projects: Project[];
  tasksByProject: Record<string, ProjectTask[]>;
  /** Admin: billed vs budget from API (HOURLY + budget only) */
  budgetBurnByProjectId?: Record<string, ProjectBudgetBurn>;
  budgetBurnPeriodLabel?: string;
  showBudget?: boolean;
  canEdit?: boolean;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
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

export function ProjectList({
  projects,
  tasksByProject,
  budgetBurnByProjectId,
  budgetBurnPeriodLabel,
  showBudget = true,
  canEdit = true,
  onEdit,
  onDelete,
  onArchive,
  onCreateTask,
  onUpdateTask,
  onToggleTaskStatus,
  onDeleteTask,
  canReorder = false,
  onReorderTasks,
}: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-500 mb-2">
          No projects found
        </h3>
        <p className="text-gray-400">
          Try adjusting your filters, or create a new project.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
      {projects.map((project) => (
        <ProjectCard
          key={project._id}
          project={project}
          tasks={tasksByProject[project._id] || []}
          budgetBurn={budgetBurnByProjectId?.[project._id]}
          budgetBurnPeriodLabel={budgetBurnPeriodLabel}
          onEdit={onEdit}
          onDelete={onDelete}
          onArchive={onArchive}
          onCreateTask={onCreateTask}
          onUpdateTask={onUpdateTask}
          onToggleTaskStatus={onToggleTaskStatus}
          onDeleteTask={onDeleteTask}
          showBudget={showBudget}
          canEdit={canEdit}
          canReorder={canReorder}
          onReorderTasks={onReorderTasks}
        />
      ))}
    </div>
  );
}
