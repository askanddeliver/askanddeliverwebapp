import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { ProjectList } from '../components/projects/ProjectList';
import { ProjectModal } from '../components/projects/ProjectModal';
import { projectsApi, clientsApi } from '../services/api';
import type { Project, Client } from '../types';

function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
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
      const [projectsRes, clientsRes] = await Promise.all([
        projectsApi.getAll(),
        clientsApi.getAll(),
      ]);
      setProjects(projectsRes.data || []);
      setClients(clientsRes.data || []);
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
    } catch (err) {
      console.error('Failed to delete project:', err);
      setError('Failed to delete project');
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
            Manage your projects and link them to clients
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
            <a href="/clients" className="font-semibold underline">
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
        onEdit={handleEdit}
        onDelete={handleDelete}
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
