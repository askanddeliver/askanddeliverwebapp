import { useState, useEffect } from 'react';
import { Plus, Filter } from 'lucide-react';
import { EntryList } from '../../components/entries/EntryList';
import { EntryModal } from '../../components/entries/EntryModal';
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

  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState(getDaysAgoString(30));
  const [endDate, setEndDate] = useState(getTodayString());
  const [projectFilter, setProjectFilter] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [entriesRes, projectsRes, taskTypesRes, projectTasksRes] = await Promise.all([
        timeEntriesApi.getAll({
          startDate: toUTCStartOfDay(startDate),
          endDate: toUTCEndOfDay(endDate),
          projectId: projectFilter || undefined,
        }),
        memberApi.getProjects(),
        taskTypesApi.getAll(),
        projectTasksApi.getAll(),
      ]);

      setEntries((entriesRes.data || []).filter((e: TimeEntry) => !e.isRunning));
      setProjects(projectsRes.data || []);
      setTaskTypes(taskTypesRes.data || []);
      setProjectTasks(projectTasksRes.data || []);
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
      setEntries((res.data || []).filter((e: TimeEntry) => !e.isRunning));
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                Project
              </label>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="input"
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
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
    </div>
  );
}

export default MemberEntries;
