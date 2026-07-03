import { useState, useEffect, useMemo } from 'react';
import { memberApi, projectTasksApi } from '../../services/api';
import { ProjectList } from '../../components/projects/ProjectList';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import type { Project, ProjectTask } from '../../types';
import { sortProjectTasksByOrder } from '../../utils/projectTasks';

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

  const tasksByProject = useMemo(() => {
    const map: Record<string, ProjectTask[]> = {};
    for (const task of projectTasks) {
      const pid =
        typeof task.projectId === 'object' ? task.projectId._id : task.projectId;
      if (!map[pid]) map[pid] = [];
      map[pid].push(task);
    }
    for (const pid of Object.keys(map)) {
      map[pid] = sortProjectTasksByOrder(map[pid]);
    }
    return map;
  }, [projectTasks]);

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
      setProjectTasks((prev) => {
        const bumped = prev.map((t) => {
          const tPid =
            typeof t.projectId === 'object' ? t.projectId._id : t.projectId;
          return tPid === pid ? { ...t, order: (t.order ?? 0) + 1 } : t;
        });
        return sortProjectTasksByOrder([res.data, ...bumped]);
      });
      setError(null);
    } catch (err) {
      console.error('Failed to create task:', err);
      setError('Failed to create task');
    }
  };

  const handleUpdateTask = async (id: string, data: Partial<ProjectTask>) => {
    try {
      const res = await projectTasksApi.update(id, data);
      setProjectTasks((prev) =>
        prev.map((t) => (t._id === id ? res.data : t))
      );
      setError(null);
    } catch (err) {
      console.error('Failed to update task:', err);
      setError('Failed to update task');
    }
  };

  const handleToggleTaskStatus = async (id: string, status: string) => {
    try {
      const res = await projectTasksApi.updateStatus(id, status);
      setProjectTasks((prev) =>
        prev.map((t) => (t._id === id ? res.data : t))
      );
    } catch (err) {
      console.error('Failed to toggle task status:', err);
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
        tasksByProject={tasksByProject}
        showBudget={false}
        canEdit={false}
        canManageTasks
        canDeleteTasks={false}
        onEdit={() => {}}
        onDelete={() => {}}
        onArchive={() => {}}
        onCreateTask={handleCreateTask}
        onUpdateTask={handleUpdateTask}
        onToggleTaskStatus={handleToggleTaskStatus}
        onDeleteTask={() => {}}
      />
    </div>
  );
}

export default MemberProjects;
