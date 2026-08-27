import { FolderOpen } from 'lucide-react';
import type { Project, ProjectBudgetBurn, ProjectTask } from '../../types';
import { groupProjectsByClient, openTasksByProject } from '../../utils/projectClient';
import { ClientProjectsCard } from './ClientProjectsCard';

interface ProjectListProps {
  projects: Project[];
  hubPathPrefix: string;
  tasks?: ProjectTask[];
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
  tasks = [],
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

  const groups = groupProjectsByClient(projects);
  const tasksByProjectId = openTasksByProject(tasks);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {groups.map((group) => (
        <ClientProjectsCard
          key={group.clientId}
          group={group}
          hubPathPrefix={hubPathPrefix}
          openTasksByProjectId={tasksByProjectId}
          budgetBurnByProjectId={budgetBurnByProjectId}
          budgetBurnPeriodLabel={budgetBurnPeriodLabel}
          showBudget={showBudget}
          canEdit={canEdit}
          onEdit={onEdit}
          onDelete={onDelete}
          onArchive={onArchive}
        />
      ))}
    </div>
  );
}
