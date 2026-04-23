import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Briefcase } from 'lucide-react';
import type { Project, ProjectTask } from '../../types';
import { DashboardTaskList } from './DashboardTaskList';

interface InternalWorkspaceTodoCardProps {
  projects: Project[];
  projectTasks: ProjectTask[];
  isTimerRunning: boolean;
  hasTaskTypes: boolean;
  onPlay: (project: Project, task: ProjectTask) => void;
}

export function InternalWorkspaceTodoCard({
  projects,
  projectTasks,
  isTimerRunning,
  hasTaskTypes,
  onPlay,
}: InternalWorkspaceTodoCardProps) {
  const [expanded, setExpanded] = useState(false);

  const openCount = useMemo(
    () =>
      projectTasks.filter((t) => {
        const pid = typeof t.projectId === 'object' ? t.projectId._id : t.projectId;
        const proj = projects.find((p) => p._id === pid);
        return (
          proj?.status === 'ACTIVE' &&
          (t.status === 'TODO' || t.status === 'IN_PROGRESS')
        );
      }).length,
    [projects, projectTasks]
  );

  return (
    <div className="card mb-6 border-indigo-100 bg-indigo-50/30">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between gap-3 text-left mb-3"
      >
        <div className="flex items-center gap-2 min-w-0">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          )}
          <Briefcase className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          <span className="font-semibold text-indigo-950 text-sm truncate">
            Internal (Ask + Deliver)
          </span>
          <span className="text-xs font-medium text-indigo-800/80 bg-white/80 px-2 py-0.5 rounded-full border border-indigo-100">
            {openCount} open
          </span>
        </div>
        <Link
          to="/internal-workspace"
          onClick={(ev) => ev.stopPropagation()}
          className="link text-sm text-indigo-700 flex-shrink-0"
        >
          Open workspace
        </Link>
      </button>

      {expanded && (
        <div className="border-t border-indigo-100/80 pt-3 -mx-4 px-4 -mb-4 pb-4">
          <DashboardTaskList
            projects={projects}
            projectTasks={projectTasks}
            isTimerRunning={isTimerRunning}
            hasTaskTypes={hasTaskTypes}
            onPlay={onPlay}
            hideOuterCard
            title="Internal to-do"
          />
        </div>
      )}
    </div>
  );
}
