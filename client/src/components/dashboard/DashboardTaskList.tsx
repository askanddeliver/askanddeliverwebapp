import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  Clock,
  ListTodo,
  Play,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { Project, ProjectTask } from '../../types';
import { sortProjectTasksByOrder } from '../../utils/projectTasks';

interface DashboardTaskListProps {
  projects: Project[];
  projectTasks: ProjectTask[];
  isTimerRunning: boolean;
  hasTaskTypes: boolean;
  onPlay: (project: Project, task: ProjectTask) => void;
  /** When true, render list only (no outer card). Used inside Internal workspace card. */
  hideOuterCard?: boolean;
  /** Override default "To-do" heading */
  title?: string;
}

const statusIcons: Record<string, React.ReactNode> = {
  TODO: <Circle className="w-4 h-4 text-gray-400 flex-shrink-0" />,
  IN_PROGRESS: <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />,
  COMPLETED: <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />,
};

const statusLabels: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Done',
};

type ClientGroup = {
  clientSortKey: string;
  clientName: string;
  projectBlocks: { project: Project; tasks: ProjectTask[] }[];
};

function buildGroups(projects: Project[], tasks: ProjectTask[]): ClientGroup[] {
  const projectById = new Map(projects.map((p) => [p._id, p]));
  const activeIds = new Set(
    projects.filter((p) => p.status === 'ACTIVE').map((p) => p._id)
  );

  const openTasks = tasks.filter((t) => {
    const pid = typeof t.projectId === 'object' ? t.projectId._id : t.projectId;
    if (!activeIds.has(pid)) return false;
    return t.status === 'TODO' || t.status === 'IN_PROGRESS';
  });

  const byClient = new Map<
    string,
    { clientName: string; byProject: Map<string, ProjectTask[]> }
  >();

  for (const task of openTasks) {
    const pid = typeof task.projectId === 'object' ? task.projectId._id : task.projectId;
    const project = projectById.get(pid);
    if (!project) continue;

    const clientSortKey =
      typeof project.clientId === 'object'
        ? project.clientId._id
        : `__noclient__${project._id}`;
    const clientName =
      typeof project.clientId === 'object'
        ? project.clientId.name
        : 'Unknown client';

    if (!byClient.has(clientSortKey)) {
      byClient.set(clientSortKey, { clientName, byProject: new Map() });
    }
    const bucket = byClient.get(clientSortKey)!;
    if (!bucket.byProject.has(project._id)) {
      bucket.byProject.set(project._id, []);
    }
    bucket.byProject.get(project._id)!.push(task);
  }

  const groups: ClientGroup[] = [];
  for (const [clientSortKey, { clientName, byProject }] of byClient) {
    const projectBlocks: { project: Project; tasks: ProjectTask[] }[] = [];
    for (const [projId, projTasks] of byProject) {
      const project = projectById.get(projId);
      if (!project) continue;
      projectBlocks.push({
        project,
        tasks: sortProjectTasksByOrder(projTasks),
      });
    }
    projectBlocks.sort((a, b) =>
      a.project.title.localeCompare(b.project.title, undefined, {
        sensitivity: 'base',
      })
    );
    groups.push({ clientSortKey, clientName, projectBlocks });
  }

  groups.sort((a, b) =>
    a.clientName.localeCompare(b.clientName, undefined, { sensitivity: 'base' })
  );
  return groups;
}

export function DashboardTaskList({
  projects,
  projectTasks,
  isTimerRunning,
  hasTaskTypes,
  onPlay,
  hideOuterCard = false,
  title = 'To-do',
}: DashboardTaskListProps) {
  const groups = useMemo(
    () => buildGroups(projects, projectTasks),
    [projects, projectTasks]
  );

  const [collapsedClients, setCollapsedClients] = useState<Record<string, boolean>>(
    {}
  );

  const toggleClient = (key: string) => {
    setCollapsedClients((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const totalOpen = useMemo(
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

  if (groups.length === 0) {
    const emptyWrap = hideOuterCard ? 'mb-0' : 'card mb-6';
    return (
      <div className={emptyWrap}>
        <div className="flex items-center gap-2 mb-3">
          <ListTodo className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        </div>
        <p className="text-sm text-gray-500 mb-3">
          No open tasks for active projects. Add or reopen tasks on the Projects
          page.
        </p>
        <Link to="/projects" className="btn-outline text-sm inline-flex">
          Go to Projects
        </Link>
      </div>
    );
  }

  const outer = hideOuterCard ? 'mb-0' : 'card mb-6';
  return (
    <div className={outer}>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {totalOpen} open
          </span>
        </div>
        <Link to="/projects" className="link text-sm">
          Manage on Projects
        </Link>
      </div>

      <div className="space-y-4">
        {groups.map((group) => {
          const collapsed = collapsedClients[group.clientSortKey];
          return (
            <div
              key={group.clientSortKey}
              className="border border-gray-100 rounded-lg overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleClient(group.clientSortKey)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100/80 transition-colors text-left"
              >
                {collapsed ? (
                  <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                )}
                <span className="font-semibold text-gray-800 text-sm">
                  {group.clientName}
                </span>
              </button>

              {!collapsed && (
                <div className="divide-y divide-gray-50">
                  {group.projectBlocks.map(({ project, tasks }) => (
                    <div key={project._id} className="px-3 py-2">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        {project.title}
                      </p>
                      <ul className="space-y-1">
                        {tasks.map((task) => {
                          const playDisabled =
                            isTimerRunning || !hasTaskTypes;
                          return (
                            <li
                              key={task._id}
                              className="flex items-start gap-2 py-1.5 rounded-md hover:bg-gray-50/80 -mx-1 px-1"
                            >
                              <span className="mt-0.5">{statusIcons[task.status]}</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {task.title}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] uppercase tracking-wide text-gray-400">
                                    {statusLabels[task.status]}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                title={
                                  !hasTaskTypes
                                    ? 'Configure task types first'
                                    : isTimerRunning
                                      ? 'Stop the current timer first'
                                      : 'Start timer for this task'
                                }
                                disabled={playDisabled}
                                onClick={() => onPlay(project, task)}
                                className="flex-shrink-0 p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                <Play className="w-5 h-5" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
