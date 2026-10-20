import { useState, useEffect } from 'react';
import { Plus, Filter, Play, Square } from 'lucide-react';
import { EntryList } from '../../components/entries/EntryList';
import { EntryModal } from '../../components/entries/EntryModal';
import { StartTaskPickerModal } from '../../components/timer/StartTaskPickerModal';
import { TimerDisplay } from '../../components/timer/TimerDisplay';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import {
  memberApi,
  timeEntriesApi,
  taskTypesApi,
  projectTasksApi,
} from '../../services/api';
import {
  formatDurationHuman,
  getDaysAgoString,
  getTodayString,
  toUTCStartOfDay,
  toUTCEndOfDay,
} from '../../utils/calculations';
import { projectClientId, uniqueClientsFromProjects } from '../../utils/projectClient';
import type { TimeEntry, Project, TaskType, ProjectTask } from '../../types';

function MemberEntries() {
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

  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState(getDaysAgoString(30));
  const [endDate, setEndDate] = useState(getTodayString());
  const [clientFilter, setClientFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const matchesMemberEntryFilter = (e: TimeEntry): boolean => {
    if (e.isRunning) return false;
    const proj = typeof e.projectId === 'object' ? e.projectId : null;
    if (projectFilter) {
      return (proj?._id || String(e.projectId)) === projectFilter;
    }
    if (clientFilter && proj) {
      return projectClientId(proj) === clientFilter;
    }
    if (clientFilter && !proj) return false;
    return true;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [entriesRes, projectsRes, taskTypesRes, projectTasksRes, timerRes] = await Promise.all([
        timeEntriesApi.getAll({
          startDate: toUTCStartOfDay(startDate),
          endDate: toUTCEndOfDay(endDate),
          projectId: projectFilter || undefined,
        }),
        memberApi.getProjects(),
        taskTypesApi.getAll(),
        projectTasksApi.getAll(),
        timeEntriesApi.getActive(),
      ]);

      setEntries((entriesRes.data || []).filter(matchesMemberEntryFilter));
      setProjects(projectsRes.data || []);
      setTaskTypes(taskTypesRes.data || []);
      setProjectTasks(projectTasksRes.data || []);
      setActiveTimer(timerRes.data);
      setError(null);
    } catch (err) {
      console.error('Failed to load entries:', err);
      setError('Failed to load time entries');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = async () => {
    try {
      setLoading(true);
      const res = await timeEntriesApi.getAll({
        startDate: toUTCStartOfDay(startDate),
        endDate: toUTCEndOfDay(endDate),
        projectId: projectFilter || undefined,
      });
      setEntries((res.data || []).filter(matchesMemberEntryFilter));
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
        setEntries(entries.map((e) => (e._id === editingEntry._id ? res.data : e)));
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
      if (matchesMemberEntryFilter({ ...res.data, isRunning: false })) {
        setEntries((prev) => [res.data, ...prev.filter((entry) => entry._id !== res.data._id)]);
      }
      setError(null);
    } catch (err) {
      console.error('Failed to stop timer:', err);
      setError('Failed to stop timer');
    }
  };

  const totalSeconds = entries.reduce((sum, e) => sum + e.duration, 0);

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeader
          title="Time entries"
          subtitle={`${entries.length} entries · ${formatDurationHuman(totalSeconds)} total`}
        />
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-2 ${
              showFilters ? 'bg-gray-300' : ''
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
          <button
            onClick={() => setStartTaskOpen(true)}
            disabled={Boolean(activeTimer?.isRunning)}
            className="btn-secondary flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            title={activeTimer?.isRunning ? 'Stop the current timer first' : 'Start a task'}
          >
            <Play className="h-4 w-4" />
            Start task
          </button>
          <button
            onClick={() => {
              setEditingEntry(null);
              setModalOpen(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Entry
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="card mb-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
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
              <label className="mb-1 block text-sm font-medium text-gray-700">
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
              <label className="mb-1 block text-sm font-medium text-gray-700">
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
              <label className="mb-1 block text-sm font-medium text-gray-700">
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
          </div>
          <button onClick={handleApplyFilters} className="btn-primary mt-4 text-sm">
            Apply Filters
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
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
          showAmount={false}
        />
      </div>

      <EntryModal
        entry={editingEntry}
        projects={projects}
        taskTypes={taskTypes}
        projectTasks={projectTasks}
        isOpen={modalOpen}
        showRate={false}
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
        showRate={false}
        isTimerRunning={Boolean(activeTimer?.isRunning)}
        onClose={() => setStartTaskOpen(false)}
        onStart={handleStartTask}
      />
    </div>
  );
}

export default MemberEntries;
