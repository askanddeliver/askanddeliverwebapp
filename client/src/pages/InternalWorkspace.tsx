import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  ListTodo,
  LayoutDashboard,
  Play,
  CheckCircle2,
  Circle,
  Clock,
} from 'lucide-react';
import { projectsApi, projectTasksApi, timeEntriesApi } from '../services/api';
import { formatDurationHuman } from '../utils/calculations';
import { sortProjectTasksByOrder } from '../utils/projectTasks';
import type { Project, ProjectTask, TimeEntry } from '../types';

type TabId = 'overview' | 'tasks';

const statusIcons: Record<string, React.ReactNode> = {
  TODO: <Circle className="w-4 h-4 text-gray-400 flex-shrink-0" />,
  IN_PROGRESS: <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />,
  COMPLETED: <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />,
};

function InternalWorkspace() {
  const [tab, setTab] = useState<TabId>('overview');
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [projRes, taskRes, entryRes] = await Promise.all([
        projectsApi.getAll(),
        projectTasksApi.getAll({ scope: 'internal-only' }),
        timeEntriesApi.getAll(),
      ]);
      setProjects(projRes.data || []);
      setTasks(taskRes.data || []);
      setEntries((entryRes.data || []).filter((e) => !e.isRunning));
      setError(null);
    } catch (e) {
      console.error(e);
      setError('Failed to load internal workspace');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const internalProjectIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of projects) {
      const c = typeof p.clientId === 'object' ? p.clientId : null;
      if (c?.isInternal) ids.add(p._id);
    }
    return ids;
  }, [projects]);

  const internalEntries = useMemo(() => {
    return entries.filter((e) => {
      const pid = typeof e.projectId === 'object' ? e.projectId._id : e.projectId;
      return internalProjectIds.has(pid);
    });
  }, [entries, internalProjectIds]);

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const weekSeconds = useMemo(() => {
    return internalEntries
      .filter((e) => new Date(e.startTime) >= startOfWeek)
      .reduce((s, e) => s + e.duration, 0);
  }, [internalEntries, startOfWeek]);

  const openTasks = useMemo(() => {
    return tasks.filter((t) => {
      const pid = typeof t.projectId === 'object' ? t.projectId._id : t.projectId;
      const proj = projects.find((p) => p._id === pid);
      return (
        proj?.status === 'ACTIVE' &&
        (t.status === 'TODO' || t.status === 'IN_PROGRESS')
      );
    });
  }, [tasks, projects]);

  const tasksByProject = useMemo(() => {
    const m = new Map<string, ProjectTask[]>();
    for (const t of tasks) {
      const pid = typeof t.projectId === 'object' ? t.projectId._id : t.projectId;
      if (!m.has(pid)) m.set(pid, []);
      m.get(pid)!.push(t);
    }
    return m;
  }, [tasks]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl">
      <div className="flex items-start gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <Briefcase className="w-6 h-6 text-indigo-700" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Internal Workspace</h1>
          <p className="text-gray-500 mt-1">
            Your own projects and tasks — separate from client-facing work.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="flex gap-2 border-b border-gray-200 mb-6">
        <button
          type="button"
          onClick={() => setTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'overview'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Overview
        </button>
        <button
          type="button"
          onClick={() => setTab('tasks')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'tasks'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <ListTodo className="w-4 h-4" />
          Tasks
        </button>
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card !p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">This week</p>
            <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">
              {weekSeconds > 0 ? formatDurationHuman(weekSeconds) : '0h'}
            </p>
            <p className="text-sm text-gray-500 mt-1">Tracked on internal projects</p>
          </div>
          <div className="card !p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Open tasks</p>
            <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{openTasks.length}</p>
            <p className="text-sm text-gray-500 mt-1">Across active internal projects</p>
          </div>
          <div className="card !p-5 sm:col-span-2">
            <p className="text-sm font-medium text-gray-700 mb-2">Next block</p>
            <p className="text-sm text-gray-500">
              Plan blocks on{' '}
              <Link to="/time-blocks" className="link text-indigo-700">
                Block Time
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      {tab === 'tasks' && (
        <div className="space-y-6">
          {projects
            .filter((p) => {
              const c = typeof p.clientId === 'object' ? p.clientId : null;
              return c?.isInternal && p.status === 'ACTIVE';
            })
            .sort((a, b) => a.title.localeCompare(b.title))
            .map((project) => {
              const projTasks = tasksByProject.get(project._id) || [];
              const open = projTasks.filter(
                (t) => t.status === 'TODO' || t.status === 'IN_PROGRESS'
              );
              if (open.length === 0) return null;
              return (
                <div key={project._id} className="card">
                  <h3 className="font-bold text-gray-900 mb-3">{project.title}</h3>
                  <ul className="space-y-2">
                    {sortProjectTasksByOrder(open).map((task) => (
                      <li
                        key={task._id}
                        className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0"
                      >
                        <span className="mt-0.5">{statusIcons[task.status]}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                          <p className="text-[10px] uppercase tracking-wide text-gray-400">
                            {task.status.replace('_', ' ')}
                          </p>
                        </div>
                        <Link
                          to="/dashboard"
                          className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50"
                          title="Start from dashboard timer"
                        >
                          <Play className="w-4 h-4" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          {openTasks.length === 0 && (
            <p className="text-gray-500 text-sm">No open internal tasks. Add tasks on Projects.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default InternalWorkspace;
