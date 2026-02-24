import { Pencil, Trash2, Archive } from 'lucide-react';
import type { Project, Client, ProjectTask } from '../../types';
import { ProjectTaskList } from '../projectTasks/ProjectTaskList';

interface ProjectCardProps {
  project: Project;
  tasks: ProjectTask[];
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
}

const statusStyles: Record<string, string> = {
  ACTIVE: 'bg-green-50 text-green-700 border-green-200',
  PAUSED: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  COMPLETED: 'bg-gray-50 text-gray-600 border-gray-200',
  ARCHIVED: 'bg-gray-100 text-gray-400 border-gray-200',
};

export function ProjectCard({
  project,
  tasks,
  onEdit,
  onDelete,
  onArchive,
  onCreateTask,
  onUpdateTask,
  onToggleTaskStatus,
  onDeleteTask,
  showBudget = true,
  canEdit = true,
}: ProjectCardProps) {
  const client =
    typeof project.clientId === 'object'
      ? (project.clientId as Client)
      : null;

  const isArchived = project.status === 'ARCHIVED';

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
          {project.description && (
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">
              {project.description}
            </p>
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
        {showBudget && project.budget && (
          <span className="text-xs text-gray-500">
            Budget: ${project.budget.toLocaleString()}
          </span>
        )}
      </div>

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
        />
      </div>
    </div>
  );
}
