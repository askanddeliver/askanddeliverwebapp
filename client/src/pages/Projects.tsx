import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, X, ChevronDown } from 'lucide-react';
import { useUserRole } from '../contexts/UserContext';
import { ProjectList } from '../components/projects/ProjectList';
import { ProjectModal, type ProjectModalSaveData } from '../components/projects/ProjectModal';
import { projectsApi, clientsApi, projectTasksApi } from '../services/api';
import type { Project, Client, ProjectTask, ProjectStatus, ProjectCounts } from '../types';
import { sortProjectTasksByOrder } from '../utils/projectTasks';

type StatusTab = ProjectStatus | 'ALL';

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ARCHIVED', label: 'Archived' },
  { value: 'ALL', label: 'All' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'title_asc', label: 'Title A–Z' },
  { value: 'title_desc', label: 'Title Z–A' },
  { value: 'budget_desc', label: 'Budget High–Low' },
];

function Projects() {
  const { isAdmin } = useUserRole();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [counts, setCounts] = useState<ProjectCounts | null>(null);
  const [tasksByProject, setTasksByProject] = useState<Record<string, ProjectTask[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<StatusTab>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('newest');
  const [clientFilter, setClientFilter] = useState('');

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const [projectsRes, countsRes] = await Promise.all([
        projectsApi.getAll({
          status: activeTab,
          search: searchQuery || undefined,
          sort: sortOption,
          clientId: clientFilter || undefined,
        }),
        projectsApi.getCounts(),
      ]);
      setProjects(projectsRes.data || []);
      setCounts(countsRes.data || null);
      setError(null);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, sortOption, clientFilter]);

  const loadSupportData = useCallback(async () => {
    try {
      const [clientsRes, tasksRes] = await Promise.all([
        isAdmin ? clientsApi.getAll() : Promise.resolve({ data: [] }),
        projectTasksApi.getAll(),
      ]);
      setClients(clientsRes.data || []);

      const grouped: Record<string, ProjectTask[]> = {};
      for (const task of tasksRes.data || []) {
        const pid = typeof task.projectId === 'object' ? task.projectId._id : task.projectId;
        if (!grouped[pid]) grouped[pid] = [];
        grouped[pid].push(task);
      }
      for (const pid of Object.keys(grouped)) {
        grouped[pid] = sortProjectTasksByOrder(grouped[pid]);
      }
      setTasksByProject(grouped);
    } catch (err) {
      console.error('Failed to load support data:', err);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadSupportData();
  }, [loadSupportData]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleSave = async (data: ProjectModalSaveData) => {
    try {
      if (editingProject) {
        await projectsApi.update(editingProject._id, data);
      } else {
        await projectsApi.create(data);
      }
      setModalOpen(false);
      setEditingProject(null);
      setError(null);
      loadProjects();
    } catch (err) {
      console.error('Failed to save project:', err);
      setError('Failed to save project');
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await projectsApi.delete(id);
      const updated = { ...tasksByProject };
      delete updated[id];
      setTasksByProject(updated);
      loadProjects();
    } catch (err) {
      console.error('Failed to delete project:', err);
      setError('Failed to delete project');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await projectsApi.archive(id);
      loadProjects();
    } catch (err) {
      console.error('Failed to archive project:', err);
      setError('Failed to archive project');
    }
  };

  // --- Project Task handlers ---

  const handleCreateTask = async (data: {
    projectId: string;
    title: string;
    description?: string;
    status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
    estimatedHours?: number;
  }) => {
    try {
      const res = await projectTasksApi.create(data);
      const pid = data.projectId;
      setTasksByProject((prev) => ({
        ...prev,
        [pid]: [...(prev[pid] || []), res.data],
      }));
      setError(null);
    } catch (err) {
      console.error('Failed to create task:', err);
      setError('Failed to create task');
    }
  };

  const handleUpdateTask = async (id: string, data: Partial<ProjectTask>) => {
    try {
      const res = await projectTasksApi.update(id, data);
      const pid = typeof res.data.projectId === 'object'
        ? res.data.projectId._id
        : res.data.projectId;
      setTasksByProject((prev) => ({
        ...prev,
        [pid]: (prev[pid] || []).map((t) => (t._id === id ? res.data : t)),
      }));
      setError(null);
    } catch (err) {
      console.error('Failed to update task:', err);
      setError('Failed to update task');
    }
  };

  const handleToggleTaskStatus = async (id: string, status: string) => {
    try {
      const res = await projectTasksApi.updateStatus(id, status);
      const pid = typeof res.data.projectId === 'object'
        ? res.data.projectId._id
        : res.data.projectId;
      setTasksByProject((prev) => ({
        ...prev,
        [pid]: (prev[pid] || []).map((t) => (t._id === id ? res.data : t)),
      }));
    } catch (err) {
      console.error('Failed to toggle task status:', err);
    }
  };

  const handleReorderTasks = async (projectId: string, taskIds: string[]) => {
    try {
      const res = await projectTasksApi.reorder(projectId, taskIds);
      const proj = projects.find((p) => p._id === projectId);
      const merged = (res.data || []).map((t: ProjectTask) => ({
        ...t,
        projectId: proj ?? t.projectId,
      }));
      setTasksByProject((prev) => ({
        ...prev,
        [projectId]: merged,
      }));
      setError(null);
    } catch (err) {
      console.error('Failed to reorder tasks:', err);
      setError('Failed to reorder tasks');
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      let taskProjectId = '';
      for (const [pid, tasks] of Object.entries(tasksByProject)) {
        if (tasks.some((t) => t._id === id)) {
          taskProjectId = pid;
          break;
        }
      }

      await projectTasksApi.delete(id);

      if (taskProjectId) {
        setTasksByProject((prev) => ({
          ...prev,
          [taskProjectId]: (prev[taskProjectId] || []).filter(
            (t) => t._id !== id
          ),
        }));
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError('Failed to delete task');
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">
            Manage your projects, tasks, and link them to clients
          </p>
        </div>
        {isAdmin && (
        <button
          onClick={() => {
            setEditingProject(null);
            setModalOpen(true);
          }}
          className="btn-primary flex items-center gap-2"
          disabled={clients.length === 0}
          title={
            clients.length === 0
              ? 'Create a client first'
              : 'Create new project'
          }
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
        )}
      </div>

      {isAdmin && clients.length === 0 && !loading && (
        <div className="card bg-yellow-50 border-yellow-200 mb-6">
          <p className="text-yellow-800 text-sm">
            You need at least one client before you can create projects.{' '}
            <a href="/clients" className="font-bold underline">
              Add a client
            </a>
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Counts Summary */}
      {counts && counts.TOTAL > 0 && (
        <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-gray-500">
          <span>
            <span className="font-semibold text-green-700">{counts.ACTIVE}</span> Active
          </span>
          <span>
            <span className="font-semibold text-yellow-700">{counts.PAUSED}</span> Paused
          </span>
          <span>
            <span className="font-semibold text-gray-600">{counts.COMPLETED}</span> Completed
          </span>
          <span>
            <span className="font-semibold text-gray-400">{counts.ARCHIVED}</span> Archived
          </span>
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-gray-200 overflow-x-auto">
        {STATUS_TABS.map((tab) => {
          const count =
            tab.value === 'ALL'
              ? counts?.TOTAL ?? 0
              : counts?.[tab.value] ?? 0;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.value
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.value
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search + Sort + Client Filter Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Client Filter (admin only) */}
        {isAdmin && (
        <div className="relative">
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All Clients</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
                {c.company ? ` (${c.company})` : ''}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        )}

        {/* Sort */}
        <div className="relative">
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        </div>
      ) : (
        <ProjectList
          projects={projects}
          tasksByProject={tasksByProject}
          showBudget={isAdmin}
          canEdit={isAdmin}
          canReorder={isAdmin}
          onReorderTasks={handleReorderTasks}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onArchive={handleArchive}
          onCreateTask={handleCreateTask}
          onUpdateTask={handleUpdateTask}
          onToggleTaskStatus={handleToggleTaskStatus}
          onDeleteTask={handleDeleteTask}
        />
      )}

      <ProjectModal
        project={editingProject}
        clients={clients}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}

export default Projects;
