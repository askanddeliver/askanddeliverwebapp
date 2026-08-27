import { FolderOpen } from 'lucide-react';
import type { Project, ProjectBudgetBurn } from '../../types';
import { ProjectCard } from './ProjectCard';

interface ProjectListProps {
  projects: Project[];
  hubPathPrefix: string;
  /** Admin: billed vs budget from API (HOURLY + budget only) */
  budgetBurnByProjectId?: Record<string, ProjectBudgetBurn>;
  budgetBurnPeriodLabel?: string;
  showBudget?: boolean;
  canEdit?: boolean;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
}

export function ProjectList({
  projects,
  hubPathPrefix,
  budgetBurnByProjectId,
  budgetBurnPeriodLabel,
  showBudget = true,
  canEdit = true,
  onEdit,
  onDelete,
  onArchive,
}: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="py-12 text-center">
        <FolderOpen className="mx-auto mb-4 h-12 w-12 text-gray-300" />
        <h3 className="mb-2 text-lg font-medium text-gray-500">No projects found</h3>
        <p className="text-gray-400">Try adjusting your filters, or create a new project.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project._id}
          project={project}
          hubTo={`${hubPathPrefix}/${project._id}`}
          budgetBurn={budgetBurnByProjectId?.[project._id]}
          budgetBurnPeriodLabel={budgetBurnPeriodLabel}
          onEdit={onEdit}
          onDelete={onDelete}
          onArchive={onArchive}
          showBudget={showBudget}
          canEdit={canEdit}
        />
      ))}
    </div>
  );
}
