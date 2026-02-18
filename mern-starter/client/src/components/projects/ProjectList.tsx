import { FolderOpen } from 'lucide-react';
import type { Project, ProjectTask } from '../../types';
import { ProjectCard } from './ProjectCard';

interface ProjectListProps {
  projects: Project[];
  tasksByProject: Record<string, ProjectTask[]>;
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
}

export function ProjectList({
  projects,
  tasksByProject,
  onEdit,
  onDelete,
  onArchive,
  onCreateTask,
  onUpdateTask,
  onToggleTaskStatus,
  onDeleteTask,
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {projects.map((project) => (
        <ProjectCard
          key={project._id}
          project={project}
          tasks={tasksByProject[project._id] || []}
          onEdit={onEdit}
          onDelete={onDelete}
          onArchive={onArchive}
          onCreateTask={onCreateTask}
          onUpdateTask={onUpdateTask}
          onToggleTaskStatus={onToggleTaskStatus}
          onDeleteTask={onDeleteTask}
        />
      ))}
    </div>
  );
}
