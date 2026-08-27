import { useState, useEffect } from 'react';
import { memberApi } from '../../services/api';
import { ProjectList } from '../../components/projects/ProjectList';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import type { Project } from '../../types';

function MemberProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const projectsRes = await memberApi.getProjects();
      setProjects(projectsRes.data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load member projects:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <AdminPageHeader
        title="My projects"
        subtitle="Active and paused projects in your workspace."
      />

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      <ProjectList
        projects={projects}
        hubPathPrefix="/member/projects"
        showBudget={false}
        canEdit={false}
        onEdit={() => {}}
        onDelete={() => {}}
        onArchive={() => {}}
      />
    </div>
  );
}

export default MemberProjects;
