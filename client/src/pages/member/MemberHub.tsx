import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { TimerDisplay } from '../../components/timer/TimerDisplay';
import { TimerControls } from '../../components/timer/TimerControls';
import { QuickEntry } from '../../components/timer/QuickEntry';
import { StartTaskTimerModal } from '../../components/timer/StartTaskTimerModal';
import { DashboardTaskList } from '../../components/dashboard/DashboardTaskList';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { AdminStatStrip } from '../../components/admin/AdminStatStrip';
import { AdminPanel } from '../../components/admin/AdminPanel';
import { EntryList } from '../../components/entries/EntryList';
import { EntryModal } from '../../components/entries/EntryModal';
import {
  memberApi,
  timeEntriesApi,
  taskTypesApi,
  projectTasksApi,
} from '../../services/api';
import { formatDurationHuman } from '../../utils/calculations';
import type { TimeEntry, Project, TaskType, ProjectTask, MemberDashboardStats } from '../../types';

function MemberHub() {
  const { user } = useAuth0();
  const [stats, setStats] = useState<MemberDashboardStats | null>(null);
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);
  const [allEntries, setAllEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [projectTasksClient, setProjectTasksClient] = useState<ProjectTask[]>([]);
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
      const [dashboardRes, timerRes, entriesRes, projectsRes, taskTypesRes, clientTasksRes, allTasksRes] =
        await Promise.all([
          memberApi.getDashboard(),
          timeEntriesApi.getActive(),
          timeEntriesApi.getAll(),
          memberApi.getProjects(),
          taskTypesApi.getAll(),
          projectTasksApi.getAll({ scope: 'client-only' }),
          projectTasksApi.getAll(),
        ]);

      setStats(dashboardRes.data.stats);
      setActiveTimer(timerRes.data);
      const entries = (entriesRes.data || []).filter((e: TimeEntry) => !e.isRunning);
      setAllEntries(entries);
      setProjects(projectsRes.data || []);
      setTaskTypes(taskTypesRes.data || []);
      setProjectTasksClient(clientTasksRes.data || []);
      setProjectTasks(allTasksRes.data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load member hub:', err);
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
      loadData();
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
      loadData();
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
    const ok = await handleStart(projectId, taskTypeId, projectTaskId, description);
    if (ok) setStartTaskContext(null);
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

  const recentEntries = allEntries.slice(0, 10);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  const statItems = stats
    ? [
        {
          label: 'Today',
          value: stats.todaySeconds > 0 ? formatDurationHuman(stats.todaySeconds) : '0h',
        },
        {
          label: 'This week',
          value: stats.weekSeconds > 0 ? formatDurationHuman(stats.weekSeconds) : '0h',
        },
        {
          label: 'My projects',
          value: stats.myProjectCount,
        },
        {
          label: 'Open tasks',
          value: stats.openTaskCount,
        },
      ]
    : [];

  return (
    <div className="w-full">
      <AdminPageHeader
        title={`Welcome${user?.given_name || user?.name ? `, ${user.given_name || user.name?.split(' ')[0]}` : ''}`}
        subtitle="Track time, manage tasks, and update your profile."
      />

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
          <button onClick={loadData} className="ml-4 underline">
            Retry
          </button>
        </div>
      )}

      {statItems.length > 0 && <AdminStatStrip items={statItems} />}

      <div className="flex flex-col xl:grid xl:grid-cols-12 xl:items-start xl:gap-4">
        <div className="space-y-6 xl:col-span-5 xl:col-start-8 xl:row-start-1">
          {projects.length > 0 && taskTypes.length > 0 && (
            <AdminPanel title="Timer">
              <TimerDisplay
                startTime={activeTimer?.startTime}
                isRunning={activeTimer?.isRunning || false}
                initialDuration={activeTimer?.duration || 0}
              />

              {activeTimer?.isRunning && (
                <div className="mb-4 text-center text-sm text-gray-500">
                  {typeof activeTimer.projectId === 'object'
                    ? activeTimer.projectId.title
                    : 'Project'}{' '}
                  {activeTimer.projectTaskId &&
                    typeof activeTimer.projectTaskId === 'object' && (
                      <span>
                        &rsaquo; {(activeTimer.projectTaskId as ProjectTask).title}{' '}
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
                showRate={false}
              />
            </AdminPanel>
          )}

          {projects.length > 0 && taskTypes.length > 0 && (
            <QuickEntry
              projects={projects}
              taskTypes={taskTypes}
              projectTasks={projectTasks}
              onSubmit={handleManualEntry}
              showRate={false}
            />
          )}
        </div>

        <div className="mt-6 space-y-6 xl:col-span-7 xl:col-start-1 xl:row-start-1 xl:mt-0">
          {projects.length > 0 && (
            <DashboardTaskList
              projects={projects}
              projectTasks={projectTasksClient}
              isTimerRunning={Boolean(activeTimer?.isRunning)}
              hasTaskTypes={taskTypes.length > 0}
              onPlay={(project, task) => setStartTaskContext({ project, task })}
            />
          )}
        </div>
      </div>

      {recentEntries.length > 0 && (
        <div className="mt-6 xl:mt-8">
          <AdminPanel
            title="Recent entries"
            headerActions={
              <Link to="/member/entries" className="link text-sm font-medium">
                View all
              </Link>
            }
          >
            <EntryList
              entries={recentEntries}
              onEdit={handleEditEntry}
              onDelete={handleDeleteEntry}
              onContinue={!activeTimer?.isRunning ? handleContinueEntry : undefined}
              showAmount={false}
            />
          </AdminPanel>
        </div>
      )}

      <StartTaskTimerModal
        isOpen={startTaskContext !== null}
        project={startTaskContext?.project ?? null}
        projectTask={startTaskContext?.task ?? null}
        taskTypes={taskTypes}
        showRate={false}
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
        showRate={false}
        onClose={() => {
          setEditModalOpen(false);
          setEditingEntry(null);
        }}
        onSave={handleSaveEdit}
      />
    </div>
  );
}

export default MemberHub;
