import { useState, useEffect } from 'react';
import { memberApi, projectTasksApi } from '../../services/api';
import { ProjectList } from '../../components/projects/ProjectList';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import type { Project, ProjectTask } from '../../types';

function MemberProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectsRes, tasksRes] = await Promise.all([
        memberApi.getProjects(),
        projectTasksApi.getAll(),
      ]);
      setProjects(projectsRes.data || []);
      setProjectTasks(tasksRes.data || []);
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
        subtitle="Grouped by client — open a project to track time and tasks."
      />

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      <ProjectList
        projects={projects}
        hubPathPrefix="/member/projects"
        tasks={projectTasks}
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
