import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CheckCircle2,
  Circle,
  Clock,
  ListTodo,
  Play,
  ChevronDown,
  ChevronUp,
  Briefcase,
  GripVertical,
} from 'lucide-react';
import type { Project, ProjectTask } from '../../types';
import { sortProjectTasksByOrder } from '../../utils/projectTasks';

interface DashboardTaskListProps {
  projects: Project[];
  projectTasks: ProjectTask[];
  isTimerRunning: boolean;
  hasTaskTypes: boolean;
  onPlay: (project: Project, task: ProjectTask) => void;
  /** Cycle task status (TODO → IN_PROGRESS → COMPLETED). Completed tasks leave this list. */
  onToggleStatus?: (id: string, status: string) => void | Promise<void>;
  /** Admin dashboard: drag open tasks to set priority within each project. */
  canReorder?: boolean;
  onReorderTasks?: (projectId: string, openTaskIds: string[]) => void | Promise<void>;
  /** When true, render list only (no outer card). Used inside Internal workspace card. */
  hideOuterCard?: boolean;
  /** Override default "To-do" heading */
  title?: string;
  /** Link for "Manage on Projects" (member hub uses /member/projects) */
  projectsLink?: string;
  /** Base path for per-project hub links */
  projectHubBase?: string;
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

const nextStatus: Record<ProjectTask['status'], ProjectTask['status']> = {
  TODO: 'IN_PROGRESS',
  IN_PROGRESS: 'COMPLETED',
  COMPLETED: 'TODO',
};

const statusActionHint: Record<ProjectTask['status'], string> = {
  TODO: 'Click to mark in progress',
  IN_PROGRESS: 'Click to complete',
  COMPLETED: 'Click to reopen',
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

function TaskRowBody({
  task,
  project,
  isTimerRunning,
  hasTaskTypes,
  statusBusy,
  dragHandle,
  onPlay,
  onCycleStatus,
}: {
  task: ProjectTask;
  project: Project;
  isTimerRunning: boolean;
  hasTaskTypes: boolean;
  statusBusy: boolean;
  dragHandle?: React.ReactNode;
  onPlay: (project: Project, task: ProjectTask) => void;
  onCycleStatus?: (task: ProjectTask) => void;
}) {
  const playDisabled = isTimerRunning || !hasTaskTypes;
  return (
    <>
      {dragHandle}
      {onCycleStatus ? (
        <button
          type="button"
          onClick={() => onCycleStatus(task)}
          disabled={statusBusy}
          className="mt-0.5 flex-shrink-0 hover:scale-110 transition-transform disabled:opacity-40 disabled:cursor-wait"
          title={`Status: ${statusLabels[task.status]} — ${statusActionHint[task.status]}`}
          aria-label={`${statusLabels[task.status]}. ${statusActionHint[task.status]}`}
        >
          {statusIcons[task.status]}
        </button>
      ) : (
        <span className="mt-0.5">{statusIcons[task.status]}</span>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">{task.title}</div>
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
    </>
  );
}

function SortableDashboardTaskRow(
  props: {
    task: ProjectTask;
    project: Project;
    isTimerRunning: boolean;
    hasTaskTypes: boolean;
    statusBusy: boolean;
    onPlay: (project: Project, task: ProjectTask) => void;
    onCycleStatus?: (task: ProjectTask) => void;
  }
) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.task._id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-2 rounded-md py-1.5 -mx-1 px-1 hover:bg-gray-50/80 ${
        isDragging ? 'shadow-md ring-2 ring-primary-100 z-10 bg-white relative' : ''
      }`}
    >
      <TaskRowBody
        {...props}
        dragHandle={
          <button
            type="button"
            className="mt-1 flex-shrink-0 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none"
            {...attributes}
            {...listeners}
            aria-label="Drag to set priority"
          >
            <GripVertical className="w-4 h-4" />
          </button>
        }
      />
    </li>
  );
}

function OpenTaskRows({
  project,
  tasks,
  canReorder,
  isTimerRunning,
  hasTaskTypes,
  busyTaskId,
  onPlay,
  onCycleStatus,
  onReorderTasks,
}: {
  project: Project;
  tasks: ProjectTask[];
  canReorder: boolean;
  isTimerRunning: boolean;
  hasTaskTypes: boolean;
  busyTaskId: string | null;
  onPlay: (project: Project, task: ProjectTask) => void;
  onCycleStatus?: (task: ProjectTask) => void;
  onReorderTasks?: (projectId: string, openTaskIds: string[]) => void | Promise<void>;
}) {
  const [items, setItems] = useState(tasks);

  useEffect(() => {
    setItems(tasks);
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!onReorderTasks) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((task) => task._id === active.id);
    const newIndex = items.findIndex((task) => task._id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const previous = items;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    try {
      await onReorderTasks(
        project._id,
        next.map((task) => task._id)
      );
    } catch {
      setItems(previous);
    }
  };

  if (!canReorder || !onReorderTasks) {
    return (
      <ul className="mt-2 space-y-1">
        {tasks.map((task) => (
          <li
            key={task._id}
            className="flex items-start gap-2 rounded-md py-1.5 -mx-1 px-1 hover:bg-gray-50/80"
          >
            <TaskRowBody
              task={task}
              project={project}
              isTimerRunning={isTimerRunning}
              hasTaskTypes={hasTaskTypes}
              statusBusy={busyTaskId === task._id}
              onPlay={onPlay}
              onCycleStatus={onCycleStatus}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => void handleDragEnd(event)}>
      <SortableContext items={items.map((task) => task._id)} strategy={verticalListSortingStrategy}>
        <ul className="mt-2 space-y-1">
          {items.map((task) => (
            <SortableDashboardTaskRow
              key={task._id}
              task={task}
              project={project}
              isTimerRunning={isTimerRunning}
              hasTaskTypes={hasTaskTypes}
              statusBusy={busyTaskId === task._id}
              onPlay={onPlay}
              onCycleStatus={onCycleStatus}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

export function DashboardTaskList({
  projects,
  projectTasks,
  isTimerRunning,
  hasTaskTypes,
  onPlay,
  onToggleStatus,
  canReorder = false,
  onReorderTasks,
  hideOuterCard = false,
  title = 'To-do',
  projectsLink = '/projects',
  projectHubBase = '/projects',
}: DashboardTaskListProps) {
  const groups = useMemo(
    () => buildGroups(projects, projectTasks),
    [projects, projectTasks]
  );

  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(
    () => new Set()
  );
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

  const toggleOpenTasks = (projectId: string) => {
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const handleCycleStatus = async (task: ProjectTask) => {
    if (!onToggleStatus || busyTaskId) return;
    setBusyTaskId(task._id);
    try {
      await onToggleStatus(task._id, nextStatus[task.status]);
    } finally {
      setBusyTaskId(null);
    }
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
        <Link to={projectsLink} className="btn-outline text-sm inline-flex">
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
        <Link to={projectsLink} className="link text-sm">
          Manage on Projects
        </Link>
      </div>

      <div className="space-y-4">
        {groups.map((group) => (
          <article
            key={group.clientSortKey}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white"
          >
            <header className="flex items-start gap-3 border-b border-gray-100 bg-gray-50/80 px-4 py-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                <Briefcase className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-gray-900">
                  {group.clientName}
                </h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  {group.projectBlocks.length}{' '}
                  {group.projectBlocks.length === 1 ? 'project' : 'projects'}
                </p>
              </div>
            </header>

            <ul className="divide-y divide-gray-100">
              {group.projectBlocks.map(({ project, tasks }) => {
                const tasksExpanded = expandedTaskIds.has(project._id);
                const hubTo = `${projectHubBase}/${project._id}`;

                return (
                  <li key={project._id} className="px-4 py-3">
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <Link
                        to={`${hubTo}#tasks`}
                        className="min-w-0 truncate font-medium text-gray-900 hover:text-primary-700 hover:underline"
                      >
                        {project.title}
                      </Link>
                    </div>

                    {tasks.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleOpenTasks(project._id)}
                        aria-expanded={tasksExpanded}
                        className="mt-1.5 inline-flex items-center gap-0.5 text-xs text-gray-400 hover:text-gray-700"
                      >
                        {tasks.length} open{' '}
                        {tasks.length === 1 ? 'task' : 'tasks'}
                        {tasksExpanded ? (
                          <ChevronUp className="h-3 w-3" aria-hidden />
                        ) : (
                          <ChevronDown className="h-3 w-3" aria-hidden />
                        )}
                      </button>
                    )}

                    {tasksExpanded && tasks.length > 0 && (
                      <>
                        {canReorder && (
                          <p className="mt-2 text-[11px] text-gray-400">
                            Drag tasks by the handle to set priority.
                          </p>
                        )}
                        <OpenTaskRows
                          project={project}
                          tasks={tasks}
                          canReorder={canReorder}
                          isTimerRunning={isTimerRunning}
                          hasTaskTypes={hasTaskTypes}
                          busyTaskId={busyTaskId}
                          onPlay={onPlay}
                          onCycleStatus={onToggleStatus ? handleCycleStatus : undefined}
                          onReorderTasks={onReorderTasks}
                        />
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
