import { useState, useEffect } from 'react';
import { Plus, Upload, ExternalLink } from 'lucide-react';
import { PortfolioProjectList } from '../components/portfolio/PortfolioProjectList';
import { PortfolioProjectModal } from '../components/portfolio/PortfolioProjectModal';
import { portfolioApi } from '../services/api';
import { portfolioProjects as staticProjects } from '../data/portfolioProjects';
import type { PortfolioProject } from '../types';

function PortfolioAdmin() {
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<PortfolioProject | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await portfolioApi.getAll();
      setProjects(res.data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load portfolio projects:', err);
      setError('Failed to load portfolio projects');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: Partial<PortfolioProject>) => {
    try {
      if (editingProject) {
        const res = await portfolioApi.update(editingProject._id, data);
        setProjects(
          projects.map((p) => (p._id === editingProject._id ? res.data : p))
        );
      } else {
        const res = await portfolioApi.create(data);
        setProjects([...projects, res.data]);
      }
      setModalOpen(false);
      setEditingProject(null);
      setError(null);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response: { data: { message: string } } }).response?.data?.message
          : 'Failed to save project';
      console.error('Failed to save portfolio project:', err);
      setError(message || 'Failed to save project');
    }
  };

  const handleEdit = (project: PortfolioProject) => {
    setEditingProject(project);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await portfolioApi.delete(id);
      setProjects(projects.filter((p) => p._id !== id));
    } catch (err) {
      console.error('Failed to delete portfolio project:', err);
      setError('Failed to delete project');
    }
  };

  const handleTogglePublish = async (id: string) => {
    try {
      const res = await portfolioApi.togglePublish(id);
      setProjects(projects.map((p) => (p._id === id ? res.data : p)));
    } catch (err) {
      console.error('Failed to toggle publish:', err);
      setError('Failed to update publish status');
    }
  };

  const handleToggleFeature = async (id: string) => {
    try {
      const res = await portfolioApi.toggleFeature(id);
      setProjects(projects.map((p) => (p._id === id ? res.data : p)));
    } catch (err) {
      console.error('Failed to toggle feature:', err);
      setError('Failed to update feature status');
    }
  };

  const handleSeedData = async () => {
    if (
      !window.confirm(
        'This will populate the portfolio with the default project data. Continue?'
      )
    ) {
      return;
    }

    try {
      setSeeding(true);
      setError(null);
      const res = await portfolioApi.seed(staticProjects);
      setProjects(res.data || []);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response: { data: { message: string } } }).response?.data?.message
          : 'Failed to seed data';
      console.error('Failed to seed portfolio data:', err);
      setError(message || 'Failed to seed data');
    } finally {
      setSeeding(false);
    }
  };

  const handleReorder = async (projectIds: string[]) => {
    try {
      const res = await portfolioApi.reorder(projectIds);
      setProjects(res.data || []);
    } catch (err) {
      console.error('Failed to reorder projects:', err);
      setError('Failed to reorder projects');
    }
  };

  const handleNewProject = () => {
    setEditingProject(null);
    setModalOpen(true);
  };

  const publishedCount = projects.filter((p) => p.published).length;
  const featuredCount = projects.filter((p) => p.featured).length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Portfolio</h1>
          <p className="text-gray-500 mt-1">
            Manage your public portfolio projects and case studies
          </p>
        </div>
        <div className="flex items-center gap-2">
          {projects.length === 0 && (
            <button
              onClick={handleSeedData}
              disabled={seeding}
              className="btn-secondary flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {seeding ? 'Seeding...' : 'Seed Default Data'}
            </button>
          )}
          <button
            onClick={handleNewProject}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      {projects.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card py-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
            <p className="text-xs text-gray-500">Total Projects</p>
          </div>
          <div className="card py-4 text-center">
            <p className="text-2xl font-bold text-green-600">{publishedCount}</p>
            <p className="text-xs text-gray-500">Published</p>
          </div>
          <div className="card py-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{featuredCount}</p>
            <p className="text-xs text-gray-500">Featured</p>
          </div>
        </div>
      )}

      {/* View Public Portfolio Link */}
      {publishedCount > 0 && (
        <div className="mb-6">
          <a
            href="/work"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
          >
            <ExternalLink className="w-4 h-4" />
            View public portfolio
          </a>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <PortfolioProjectList
        projects={projects}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onTogglePublish={handleTogglePublish}
        onToggleFeature={handleToggleFeature}
        onReorder={handleReorder}
      />

      <PortfolioProjectModal
        project={editingProject}
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

export default PortfolioAdmin;
