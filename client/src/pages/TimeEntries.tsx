import { useState, useEffect } from 'react';
import { Plus, Filter, Play, Square } from 'lucide-react';
import { useUserRole } from '../contexts/UserContext';
import { EntryList } from '../components/entries/EntryList';
import { EntryModal } from '../components/entries/EntryModal';
import { StartTaskPickerModal } from '../components/timer/StartTaskPickerModal';
import { TimerDisplay } from '../components/timer/TimerDisplay';
import {
  timeEntriesApi,
  projectsApi,
  taskTypesApi,
  projectTasksApi,
} from '../services/api';
import { formatDurationHuman, getDaysAgoString, getTodayString, toUTCStartOfDay, toUTCEndOfDay } from '../utils/calculations';
import { projectClientId, uniqueClientsFromProjects } from '../utils/projectClient';
import type { TimeEntry, Project, TaskType, ProjectTask } from '../types';

function TimeEntries() {
  const { isAdmin } = useUserRole();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [startTaskOpen, setStartTaskOpen] = useState(false);
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState(getDaysAgoString(30));
  const [endDate, setEndDate] = useState(getTodayString());
  const [clientFilter, setClientFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [billingStatus, setBillingStatus] = useState<'unbilled' | 'paid' | 'all'>('unbilled');

  useEffect(() => {
    loadData();
  }, []);

  const entryListParams = () => {
    const clientProjectIds = clientFilter
      ? projects.filter((p) => projectClientId(p) === clientFilter).map((p) => p._id)
      : [];
    return {
      startDate: toUTCStartOfDay(startDate),
      endDate: toUTCEndOfDay(endDate),
      projectId: projectFilter || undefined,
      projectIds:
        !projectFilter && clientProjectIds.length > 0 ? clientProjectIds : undefined,
      billingStatus: billingStatus !== 'all' ? billingStatus : undefined,
    };
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [entriesRes, projectsRes, taskTypesRes, projectTasksRes, timerRes] = await Promise.all([
        timeEntriesApi.getAll(entryListParams()),
        projectsApi.getAll(),
        taskTypesApi.getAll(),
        projectTasksApi.getAll(),
        timeEntriesApi.getActive(),
      ]);

      setEntries(
        (entriesRes.data || []).filter((e: TimeEntry) => !e.isRunning)
      );
      setProjects(projectsRes.data || []);
      setTaskTypes(taskTypesRes.data || []);
      setProjectTasks(projectTasksRes.data || []);
      setActiveTimer(timerRes.data);
      setError(null);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load time entries');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = async () => {
    try {
      setLoading(true);
      const clientProjectIds = clientFilter
        ? projects.filter((p) => projectClientId(p) === clientFilter).map((p) => p._id)
        : [];
      if (clientFilter && !projectFilter && clientProjectIds.length === 0) {
        setEntries([]);
        setError(null);
        return;
      }
      const res = await timeEntriesApi.getAll(entryListParams());
      setEntries(
        (res.data || []).filter((e: TimeEntry) => !e.isRunning)
      );
      setError(null);
    } catch (err) {
      console.error('Failed to filter entries:', err);
      setError('Failed to filter entries');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: {
    projectId: string;
    taskTypeId: string;
    projectTaskId?: string;
    description?: string;
    startTime: string;
    endTime: string;
    duration: number;
  }) => {
    try {
      if (editingEntry) {
        const res = await timeEntriesApi.update(editingEntry._id, data);
        setEntries(
          entries.map((e) => (e._id === editingEntry._id ? res.data : e))
        );
      } else {
        const res = await timeEntriesApi.create(data);
        setEntries([res.data, ...entries]);
      }
      setModalOpen(false);
      setEditingEntry(null);
      setError(null);
    } catch (err) {
      console.error('Failed to save entry:', err);
      setError('Failed to save entry');
    }
  };

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await timeEntriesApi.delete(id);
      setEntries(entries.filter((e) => e._id !== id));
    } catch (err) {
      console.error('Failed to delete entry:', err);
      setError('Failed to delete entry');
    }
  };

  const handleStartTask = async (
    projectId: string,
    taskTypeId: string,
    projectTaskId: string,
    description?: string
  ) => {
    try {
      const res = await timeEntriesApi.start({
        projectId,
        taskTypeId,
        projectTaskId,
        description,
      });
      setActiveTimer(res.data);
      const task = projectTasks.find((item) => item._id === projectTaskId);
      if (task?.status === 'TODO') {
        try {
          const statusRes = await projectTasksApi.updateStatus(projectTaskId, 'IN_PROGRESS');
          setProjectTasks((prev) =>
            prev.map((item) => (item._id === projectTaskId ? statusRes.data : item))
          );
        } catch (err) {
          console.error('Could not mark task in progress:', err);
        }
      }
      setStartTaskOpen(false);
      setError(null);
    } catch (err) {
      console.error('Failed to start task:', err);
      setError('Failed to start task');
    }
  };

  const handleStopTimer = async () => {
    try {
      const res = await timeEntriesApi.stop();
      setActiveTimer(null);
      setEntries((prev) => [res.data, ...prev.filter((entry) => entry._id !== res.data._id)]);
      setError(null);
    } catch (err) {
      console.error('Failed to stop timer:', err);
      setError('Failed to stop timer');
    }
  };

  const totalSeconds = entries.reduce((sum, e) => sum + e.duration, 0);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Time Entries</h1>
          <p className="text-gray-500 mt-1">
            {entries.length} entries | {formatDurationHuman(totalSeconds)} total
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-2 ${
              showFilters ? 'bg-gray-300' : ''
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={() => setStartTaskOpen(true)}
            disabled={Boolean(activeTimer?.isRunning)}
            className="btn-secondary flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            title={activeTimer?.isRunning ? 'Stop the current timer first' : 'Start a task'}
          >
            <Play className="w-4 h-4" />
            Start task
          </button>
          <button
            onClick={() => {
              setEditingEntry(null);
              setModalOpen(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Entry
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client
              </label>
              <select
                value={clientFilter}
                onChange={(e) => {
                  setClientFilter(e.target.value);
                  setProjectFilter('');
                }}
                className="input"
              >
                <option value="">All Clients</option>
                {uniqueClientsFromProjects(projects).map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project
              </label>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="input"
              >
                <option value="">All Projects</option>
                {projects
                  .filter((p) => !clientFilter || projectClientId(p) === clientFilter)
                  .map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.title}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Billing Status
              </label>
              <select
                value={billingStatus}
                onChange={(e) => setBillingStatus(e.target.value as 'unbilled' | 'paid' | 'all')}
                className="input"
              >
                <option value="unbilled">Unbilled</option>
                <option value="paid">Paid</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleApplyFilters}
            className="btn-primary mt-4 text-sm"
          >
            Apply Filters
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {activeTimer?.isRunning && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary-100 bg-primary-50/60 px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-primary-700">
              Timer running
            </p>
            <TimerDisplay
              startTime={activeTimer.startTime}
              isRunning
              initialDuration={activeTimer.duration}
            />
          </div>
          <button type="button" onClick={() => void handleStopTimer()} className="btn-outline flex items-center gap-2">
            <Square className="h-4 w-4" />
            Stop
          </button>
        </div>
      )}

      <div className="card">
        <EntryList
          entries={entries}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
          showAmount={isAdmin}
        />
      </div>

      <EntryModal
        entry={editingEntry}
        projects={projects}
        taskTypes={taskTypes}
        projectTasks={projectTasks}
        isOpen={modalOpen}
        showRate={isAdmin}
        onClose={() => {
          setModalOpen(false);
          setEditingEntry(null);
        }}
        onSave={handleSave}
      />

      <StartTaskPickerModal
        isOpen={startTaskOpen}
        projects={projects}
        projectTasks={projectTasks}
        taskTypes={taskTypes}
        showRate={isAdmin}
        isTimerRunning={Boolean(activeTimer?.isRunning)}
        onClose={() => setStartTaskOpen(false)}
        onStart={handleStartTask}
      />
    </div>
  );
}

export default TimeEntries;
