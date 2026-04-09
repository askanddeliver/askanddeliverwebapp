import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Clock, CalendarDays, FolderOpen, Inbox } from 'lucide-react';
import { useUserRole } from '../contexts/UserContext';
import { TimerDisplay } from '../components/timer/TimerDisplay';
import { TimerControls } from '../components/timer/TimerControls';
import { QuickEntry } from '../components/timer/QuickEntry';
import { StartTaskTimerModal } from '../components/timer/StartTaskTimerModal';
import { DashboardTaskList } from '../components/dashboard/DashboardTaskList';
import { EntryList } from '../components/entries/EntryList';
import { EntryModal } from '../components/entries/EntryModal';
import { timeEntriesApi, projectsApi, taskTypesApi, projectTasksApi, leadsApi } from '../services/api';
import { formatDurationHuman } from '../utils/calculations';
import type { TimeEntry, Project, TaskType, ProjectTask, LeadStats } from '../types';

function Dashboard() {
  const { user } = useAuth0();
  const { isAdmin } = useUserRole();
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);
  const [allEntries, setAllEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [leadStats, setLeadStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [startTaskContext, setStartTaskContext] = useState<{
    project: Project;
    task: ProjectTask;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [timerRes, entriesRes, projectsRes, taskTypesRes, projectTasksRes, leadStatsRes] =
        await Promise.all([
          timeEntriesApi.getActive(),
          timeEntriesApi.getAll(),
          projectsApi.getAll(),
          taskTypesApi.getAll(),
          projectTasksApi.getAll(),
          leadsApi.getStats().catch(() => ({ data: null })),
        ]);

      setActiveTimer(timerRes.data);
      const entries = (entriesRes.data || []).filter((e: TimeEntry) => !e.isRunning);
      setAllEntries(entries);
      setProjects(projectsRes.data || []);
      setTaskTypes(taskTypesRes.data || []);
      setProjectTasks(projectTasksRes.data || []);
      setLeadStats(leadStatsRes.data);
      setError(null);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load data. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (
    projectId: string,
    taskTypeId: string,
    projectTaskId?: string,
    description?: string
  ): Promise<boolean> => {
    try {
      const res = await timeEntriesApi.start({
        projectId,
        taskTypeId,
        projectTaskId,
        description,
      });
      setActiveTimer(res.data);
      setError(null);
      return true;
    } catch (err) {
      console.error('Failed to start timer:', err);
      setError('Failed to start timer');
      return false;
    }
  };

  const handleStop = async () => {
    try {
      const res = await timeEntriesApi.stop();
      setActiveTimer(null);
      setAllEntries([res.data, ...allEntries]);
      setError(null);
    } catch (err) {
      console.error('Failed to stop timer:', err);
      setError('Failed to stop timer');
    }
  };

  const handleManualEntry = async (data: {
    projectId: string;
    taskTypeId: string;
    projectTaskId?: string;
    description?: string;
    startTime: string;
    endTime: string;
    duration: number;
  }) => {
    try {
      const res = await timeEntriesApi.create(data);
      setAllEntries([res.data, ...allEntries]);
      setError(null);
    } catch (err) {
      console.error('Failed to create entry:', err);
      setError('Failed to create entry');
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await timeEntriesApi.delete(id);
      setAllEntries(allEntries.filter((e) => e._id !== id));
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  const handleContinueEntry = async (entry: TimeEntry) => {
    try {
      const res = await timeEntriesApi.continue(entry._id);
      setActiveTimer(res.data);
      setAllEntries(allEntries.filter((e) => e._id !== entry._id));
      setError(null);
    } catch (err) {
      console.error('Failed to continue entry:', err);
      setError('Failed to continue entry');
    }
  };

  const handleEditEntry = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setEditModalOpen(true);
  };

  const handleStartFromTaskModal = async (
    projectId: string,
    taskTypeId: string,
    projectTaskId: string,
    description?: string
  ) => {
    const ctx = startTaskContext;
    const ok = await handleStart(projectId, taskTypeId, projectTaskId, description);
    if (!ok || !ctx) return;

    if (isAdmin && ctx.task.status === 'TODO') {
      try {
        const res = await projectTasksApi.updateStatus(ctx.task._id, 'IN_PROGRESS');
        setProjectTasks((prev) =>
          prev.map((t) => (t._id === res.data._id ? res.data : t))
        );
      } catch (e) {
        console.error('Could not mark task in progress:', e);
      }
    }
    setStartTaskContext(null);
  };

  const handleSaveEdit = async (data: {
    projectId: string;
    taskTypeId: string;
    projectTaskId?: string;
    description?: string;
    startTime: string;
    endTime: string;
    duration: number;
  }) => {
    if (!editingEntry) return;
    try {
      const res = await timeEntriesApi.update(editingEntry._id, data);
      setAllEntries(allEntries.map((e) => (e._id === editingEntry._id ? res.data : e)));
      setEditModalOpen(false);
      setEditingEntry(null);
      setError(null);
    } catch (err) {
      console.error('Failed to update entry:', err);
      setError('Failed to update entry');
    }
  };

  // --- Stats calculations ---
  const now = new Date();
  const todayStr = now.toDateString();

  const todayEntries = allEntries.filter(
    (e) => new Date(e.startTime).toDateString() === todayStr
  );
  const todaySeconds = todayEntries.reduce((sum, e) => sum + e.duration, 0);

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const weekEntries = allEntries.filter(
    (e) => new Date(e.startTime) >= startOfWeek
  );
  const weekSeconds = weekEntries.reduce((sum, e) => sum + e.duration, 0);

  const activeProjects = projects.filter((p) => p.status === 'ACTIVE').length;

  const newLeads = leadStats
    ? (leadStats.NEW || 0) + (leadStats.CONTACTED || 0) + (leadStats.QUALIFIED || 0)
    : 0;

  const recentEntries = allEntries.slice(0, 10);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Welcome Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.given_name || user?.name || 'User'}
        </h1>
        <p className="text-gray-500 mt-1">
          {todaySeconds > 0
            ? `${formatDurationHuman(todaySeconds)} tracked today`
            : "Let's get to work"}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
          <button onClick={loadData} className="ml-4 underline">
            Retry
          </button>
        </div>
      )}

      {/* Summary stats — full width so values are not squeezed in the xl sidebar */}
      <div
        className={`grid grid-cols-2 gap-3 mb-6 ${isAdmin ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}
      >
        <div className="card !p-4 flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-primary-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Today</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900 tabular-nums leading-tight">
              {todaySeconds > 0 ? formatDurationHuman(todaySeconds) : '0h'}
            </p>
          </div>
        </div>

        <div className="card !p-4 flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <CalendarDays className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">This Week</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900 tabular-nums leading-tight">
              {weekSeconds > 0 ? formatDurationHuman(weekSeconds) : '0h'}
            </p>
          </div>
        </div>

        <div className="card !p-4 flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
            <FolderOpen className="w-5 h-5 text-green-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active Projects</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900 tabular-nums leading-tight">{activeProjects}</p>
          </div>
        </div>

        {isAdmin && (
        <div className="card !p-4 flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Inbox className="w-5 h-5 text-amber-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Open Leads</p>
            <p className="text-lg sm:text-xl font-bold text-gray-900 tabular-nums leading-tight">{newLeads}</p>
          </div>
        </div>
        )}
      </div>

      <div className="flex flex-col xl:grid xl:grid-cols-12 xl:gap-8 xl:items-start">
      {/* Mobile order: timer stack first; xl: todo left (7), stack right (5) */}
      <div className="space-y-6 xl:col-span-5 xl:col-start-8 xl:row-start-1">
      {/* Setup Prompts (admin only - members can't configure task types) */}
      {isAdmin && taskTypes.length === 0 && (
        <div className="card bg-blue-50 border-blue-200 mb-6">
          <h3 className="font-bold text-blue-900 mb-2">
            Get started with task types
          </h3>
          <p className="text-blue-700 text-sm mb-3">
            Set up your task types and hourly rates before you can start tracking
            time.
          </p>
          <Link to="/task-types" className="btn-primary text-sm">
            Configure Task Types
          </Link>
        </div>
      )}

      {isAdmin && projects.length === 0 && taskTypes.length > 0 && (
        <div className="card bg-blue-50 border-blue-200 mb-6">
          <h3 className="font-bold text-blue-900 mb-2">
            Create your first project
          </h3>
          <p className="text-blue-700 text-sm mb-3">
            Add a client and project to start tracking time.
          </p>
          <div className="flex gap-3">
            <Link to="/clients" className="btn-primary text-sm">
              Add Client
            </Link>
            <Link to="/projects" className="btn-outline text-sm">
              Add Project
            </Link>
          </div>
        </div>
      )}

      {/* Timer Section */}
      {projects.length > 0 && taskTypes.length > 0 && (
        <div className="card">
          <TimerDisplay
            startTime={activeTimer?.startTime}
            isRunning={activeTimer?.isRunning || false}
            initialDuration={activeTimer?.duration || 0}
          />

          {activeTimer?.isRunning && (
            <div className="text-center text-sm text-gray-500 mb-4">
              {typeof activeTimer.projectId === 'object'
                ? activeTimer.projectId.title
                : 'Project'}{' '}
              {activeTimer.projectTaskId &&
                typeof activeTimer.projectTaskId === 'object' && (
                  <span>
                    &rsaquo;{' '}
                    {(activeTimer.projectTaskId as ProjectTask).title}{' '}
                  </span>
                )}
              &mdash;{' '}
              {typeof activeTimer.taskTypeId === 'object'
                ? activeTimer.taskTypeId.name
                : 'Task'}
              {activeTimer.description && ` | ${activeTimer.description}`}
            </div>
          )}

          <TimerControls
            projects={projects}
            taskTypes={taskTypes}
            projectTasks={projectTasks}
            isRunning={activeTimer?.isRunning || false}
            onStart={handleStart}
            onStop={handleStop}
            showRate={isAdmin}
          />
        </div>
      )}

      {/* Quick Manual Entry */}
      {projects.length > 0 && taskTypes.length > 0 && (
        <div>
          <QuickEntry
            projects={projects}
            taskTypes={taskTypes}
            projectTasks={projectTasks}
            onSubmit={handleManualEntry}
            showRate={isAdmin}
          />
        </div>
      )}

      {/* Recent Entries — with timer stack, not beside todo */}
      {recentEntries.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Recent Entries
            </h2>
            <Link to="/entries" className="link text-sm">
              View all
            </Link>
          </div>
          <EntryList
            entries={recentEntries}
            onEdit={handleEditEntry}
            onDelete={handleDeleteEntry}
            onContinue={!activeTimer?.isRunning ? handleContinueEntry : undefined}
            showAmount={isAdmin}
          />
        </div>
      )}
      </div>

      {/* To-do column — left on xl; below timer stack on narrow screens */}
      <div className="space-y-6 xl:col-span-7 xl:col-start-1 xl:row-start-1 mt-6 xl:mt-0">
      {projects.length > 0 && (
        <DashboardTaskList
          projects={projects}
          projectTasks={projectTasks}
          isTimerRunning={Boolean(activeTimer?.isRunning)}
          hasTaskTypes={taskTypes.length > 0}
          onPlay={(project, task) => setStartTaskContext({ project, task })}
        />
      )}
      </div>
      </div>

      <StartTaskTimerModal
        isOpen={startTaskContext !== null}
        project={startTaskContext?.project ?? null}
        projectTask={startTaskContext?.task ?? null}
        taskTypes={taskTypes}
        showRate={isAdmin}
        isTimerRunning={Boolean(activeTimer?.isRunning)}
        onClose={() => setStartTaskContext(null)}
        onStart={handleStartFromTaskModal}
      />

      <EntryModal
        entry={editingEntry}
        projects={projects}
        taskTypes={taskTypes}
        projectTasks={projectTasks}
        isOpen={editModalOpen}
        showRate={isAdmin}
        onClose={() => {
          setEditModalOpen(false);
          setEditingEntry(null);
        }}
        onSave={handleSaveEdit}
      />
    </div>
  );
}

export default Dashboard;
