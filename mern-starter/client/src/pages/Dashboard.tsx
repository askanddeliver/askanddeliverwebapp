import { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { TimerDisplay } from '../components/timer/TimerDisplay';
import { TimerControls } from '../components/timer/TimerControls';
import { QuickEntry } from '../components/timer/QuickEntry';
import { EntryList } from '../components/entries/EntryList';
import { timeEntriesApi, projectsApi, taskTypesApi } from '../services/api';
import { formatDurationHuman } from '../utils/calculations';
import type { TimeEntry, Project, TaskType } from '../types';

function Dashboard() {
  const { user } = useAuth0();
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [timerRes, entriesRes, projectsRes, taskTypesRes] =
        await Promise.all([
          timeEntriesApi.getActive(),
          timeEntriesApi.getAll(),
          projectsApi.getAll(),
          taskTypesApi.getAll(),
        ]);

      setActiveTimer(timerRes.data);
      setRecentEntries(
        (entriesRes.data || []).filter((e: TimeEntry) => !e.isRunning).slice(0, 10)
      );
      setProjects(projectsRes.data || []);
      setTaskTypes(taskTypesRes.data || []);
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
    description?: string
  ) => {
    try {
      const res = await timeEntriesApi.start({
        projectId,
        taskTypeId,
        description,
      });
      setActiveTimer(res.data);
      setError(null);
    } catch (err) {
      console.error('Failed to start timer:', err);
      setError('Failed to start timer');
    }
  };

  const handleStop = async () => {
    try {
      const res = await timeEntriesApi.stop();
      setActiveTimer(null);
      setRecentEntries([res.data, ...recentEntries.slice(0, 9)]);
      setError(null);
    } catch (err) {
      console.error('Failed to stop timer:', err);
      setError('Failed to stop timer');
    }
  };

  const handleManualEntry = async (data: {
    projectId: string;
    taskTypeId: string;
    description?: string;
    startTime: string;
    endTime: string;
    duration: number;
  }) => {
    try {
      const res = await timeEntriesApi.create(data);
      setRecentEntries([res.data, ...recentEntries.slice(0, 9)]);
      setError(null);
    } catch (err) {
      console.error('Failed to create entry:', err);
      setError('Failed to create entry');
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await timeEntriesApi.delete(id);
      setRecentEntries(recentEntries.filter((e) => e._id !== id));
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  // Calculate today's stats
  const todayEntries = recentEntries.filter((e) => {
    const entryDate = new Date(e.startTime).toDateString();
    return entryDate === new Date().toDateString();
  });
  const todaySeconds = todayEntries.reduce((sum, e) => sum + e.duration, 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
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

      {/* Setup Prompts */}
      {taskTypes.length === 0 && (
        <div className="card bg-blue-50 border-blue-200 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">
            Get started with task types
          </h3>
          <p className="text-blue-700 text-sm mb-3">
            Set up your task types and hourly rates before you can start tracking
            time.
          </p>
          <a href="/task-types" className="btn-primary text-sm">
            Configure Task Types
          </a>
        </div>
      )}

      {projects.length === 0 && taskTypes.length > 0 && (
        <div className="card bg-blue-50 border-blue-200 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">
            Create your first project
          </h3>
          <p className="text-blue-700 text-sm mb-3">
            Add a client and project to start tracking time.
          </p>
          <div className="flex gap-3">
            <a href="/clients" className="btn-primary text-sm">
              Add Client
            </a>
            <a href="/projects" className="btn-outline text-sm">
              Add Project
            </a>
          </div>
        </div>
      )}

      {/* Timer Section */}
      {projects.length > 0 && taskTypes.length > 0 && (
        <div className="card mb-6">
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
            isRunning={activeTimer?.isRunning || false}
            onStart={handleStart}
            onStop={handleStop}
          />
        </div>
      )}

      {/* Quick Manual Entry */}
      {projects.length > 0 && taskTypes.length > 0 && (
        <div className="mb-6">
          <QuickEntry
            projects={projects}
            taskTypes={taskTypes}
            onSubmit={handleManualEntry}
          />
        </div>
      )}

      {/* Recent Entries */}
      {recentEntries.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Entries
            </h2>
            <a href="/entries" className="link text-sm">
              View all
            </a>
          </div>
          <EntryList
            entries={recentEntries}
            onEdit={() => {}}
            onDelete={handleDeleteEntry}
          />
        </div>
      )}
    </div>
  );
}

export default Dashboard;
