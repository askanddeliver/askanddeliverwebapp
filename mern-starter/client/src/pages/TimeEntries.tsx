import { useState, useEffect } from 'react';
import { Plus, Filter } from 'lucide-react';
import { EntryList } from '../components/entries/EntryList';
import { EntryModal } from '../components/entries/EntryModal';
import {
  timeEntriesApi,
  projectsApi,
  taskTypesApi,
} from '../services/api';
import { formatDurationHuman, getDaysAgoString, getTodayString } from '../utils/calculations';
import type { TimeEntry, Project, TaskType } from '../types';

function TimeEntries() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  // Filters
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
      const [entriesRes, projectsRes, taskTypesRes] = await Promise.all([
        timeEntriesApi.getAll({
          startDate,
          endDate,
          projectId: projectFilter || undefined,
        }),
        projectsApi.getAll(),
        taskTypesApi.getAll(),
      ]);

      setEntries(
        (entriesRes.data || []).filter((e: TimeEntry) => !e.isRunning)
      );
      setProjects(projectsRes.data || []);
      setTaskTypes(taskTypesRes.data || []);
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
      const res = await timeEntriesApi.getAll({
        startDate,
        endDate,
        projectId: projectFilter || undefined,
      });
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

  const totalSeconds = entries.reduce((sum, e) => sum + e.duration, 0);

  return (
    <div className="max-w-4xl mx-auto">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      <div className="card">
        <EntryList
          entries={entries}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
        />
      </div>

      <EntryModal
        entry={editingEntry}
        projects={projects}
        taskTypes={taskTypes}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingEntry(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}

export default TimeEntries;
