import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { ProjectList } from '../components/projects/ProjectList';
import { ProjectModal } from '../components/projects/ProjectModal';
import { projectsApi, clientsApi, projectTasksApi } from '../services/api';
import type { Project, Client, ProjectTask } from '../types';

function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tasksByProject, setTasksByProject] = useState<Record<string, ProjectTask[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectsRes, clientsRes, tasksRes] = await Promise.all([
        projectsApi.getAll(),
        clientsApi.getAll(),
        projectTasksApi.getAll(),
      ]);
      setProjects(projectsRes.data || []);
      setClients(clientsRes.data || []);

      // Group tasks by project
      const grouped: Record<string, ProjectTask[]> = {};
      for (const task of tasksRes.data || []) {
        const pid = typeof task.projectId === 'object' ? task.projectId._id : task.projectId;
        if (!grouped[pid]) grouped[pid] = [];
        grouped[pid].push(task);
      }
      setTasksByProject(grouped);
      setError(null);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: {
    clientId: string;
    title: string;
    description?: string;
    status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
    budget?: number;
  }) => {
    try {
      if (editingProject) {
        const res = await projectsApi.update(editingProject._id, data);
        setProjects(
          projects.map((p) => (p._id === editingProject._id ? res.data : p))
        );
      } else {
        const res = await projectsApi.create(data);
        setProjects([res.data, ...projects]);
      }
      setModalOpen(false);
      setEditingProject(null);
      setError(null);
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
      setProjects(projects.filter((p) => p._id !== id));
      // Clean up tasks for deleted project
      const updated = { ...tasksByProject };
      delete updated[id];
      setTasksByProject(updated);
    } catch (err) {
      console.error('Failed to delete project:', err);
      setError('Failed to delete project');
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

  const handleDeleteTask = async (id: string) => {
    try {
      // Find which project this task belongs to before deleting
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">
            Manage your projects, tasks, and link them to clients
          </p>
        </div>
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
      </div>

      {clients.length === 0 && (
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <ProjectList
        projects={projects}
        tasksByProject={tasksByProject}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreateTask={handleCreateTask}
        onUpdateTask={handleUpdateTask}
        onToggleTaskStatus={handleToggleTaskStatus}
        onDeleteTask={handleDeleteTask}
      />

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
