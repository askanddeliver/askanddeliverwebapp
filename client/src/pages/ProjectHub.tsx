import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useUserRole } from '../contexts/UserContext';
import { AdminPanel } from '../components/admin/AdminPanel';
import { ProjectHubHeader } from '../components/projects/ProjectHubHeader';
import { ProjectTeamStrip } from '../components/projects/ProjectTeamStrip';
import { ProjectBudgetPanel } from '../components/projects/ProjectBudgetPanel';
import { ProjectEntriesSection } from '../components/projects/ProjectEntriesSection';
import { ProjectTaskList } from '../components/projectTasks/ProjectTaskList';
import ProjectMessagesPanel from '../components/projects/ProjectMessagesPanel';
import { ProjectModal, type ProjectModalSaveData } from '../components/projects/ProjectModal';
import { EntryModal } from '../components/entries/EntryModal';
import SanitizedBrief from '../components/portal/SanitizedBrief';
import {
  clientsApi,
  projectsApi,
  projectTasksApi,
  taskTypesApi,
  timeEntriesApi,
} from '../services/api';
import { sortProjectTasksByOrder } from '../utils/projectTasks';
import { getBurnDateRange, type BurnPeriod } from '../utils/projectBilling';
import type {
  Client,
  Project,
  ProjectBudgetBurn,
  ProjectTask,
  TaskType,
  TimeEntry,
} from '../types';

function ProjectHub() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();

  const isMemberHub = location.pathname.startsWith('/member/');
  const listPath = isMemberHub ? '/member/projects' : '/projects';
  const listLabel = isMemberHub ? 'My projects' : 'Projects';

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);
  const [budgetBurn, setBudgetBurn] = useState<ProjectBudgetBurn | undefined>();
  const [budgetBurnPeriodLabel, setBudgetBurnPeriodLabel] = useState('');
  const [burnPeriod, setBurnPeriod] = useState<BurnPeriod>('all');
  const [loading, setLoading] = useState(true);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'basic' | 'brief'>('basic');
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  const loadProject = useCallback(async () => {
    if (!id) return;
    try {
      const res = await projectsApi.get(id);
      setProject(res.data);
      setNotFound(false);
      setError(null);
    } catch {
      setProject(null);
      setNotFound(true);
    }
  }, [id]);

  const loadTasks = useCallback(async () => {
    if (!id) return;
    try {
      const res = await projectTasksApi.getAll({ projectId: id });
      setTasks(sortProjectTasksByOrder(res.data || []));
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  }, [id]);

  const loadEntries = useCallback(async () => {
    if (!id) return;
    setEntriesLoading(true);
    try {
      const [entriesRes, timerRes] = await Promise.all([
        timeEntriesApi.getAll({ projectIds: [id] }),
        timeEntriesApi.getActive(),
      ]);
      setEntries((entriesRes.data || []).filter((e) => !e.isRunning));
      setActiveTimer(timerRes.data);
    } catch (err) {
      console.error('Failed to load entries:', err);
    } finally {
      setEntriesLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      await Promise.all([
        loadProject(),
        loadTasks(),
        loadEntries(),
        taskTypesApi.getAll().then((res) => {
          if (!cancelled) setTaskTypes(res.data || []);
        }),
        isAdmin
          ? clientsApi.getAll().then((res) => {
              if (!cancelled) setClients(res.data || []);
            })
          : Promise.resolve(),
      ]);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isAdmin, loadProject, loadTasks, loadEntries]);

  useEffect(() => {
    if (!id || !isAdmin || !project) return;
    if ((project.billingMode ?? 'HOURLY') !== 'HOURLY') {
      setBudgetBurn(undefined);
      setBudgetBurnPeriodLabel('');
      return;
    }
    if (project.budget == null || project.budget <= 0) {
      setBudgetBurn(undefined);
      setBudgetBurnPeriodLabel('');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const range = getBurnDateRange(burnPeriod);
        const res = await projectsApi.getBudgetBurn({
          projectIds: [id],
          ...range,
        });
        if (!cancelled) {
          setBudgetBurn(res.data.byProject[id]);
          setBudgetBurnPeriodLabel(res.data.periodLabel);
        }
      } catch {
        if (!cancelled) {
          setBudgetBurn(undefined);
          setBudgetBurnPeriodLabel('');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isAdmin, project, burnPeriod]);

  useEffect(() => {
    if (loading || notFound) return;
    const hash = location.hash.replace('#', '');
    if (!hash) return;
    const timer = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [loading, notFound, location.hash]);

  const handleSaveProject = async (data: ProjectModalSaveData) => {
    if (!id) return;
    try {
      await projectsApi.update(id, data);
      setModalOpen(false);
      await loadProject();
    } catch (err) {
      console.error('Failed to save project:', err);
      setError('Failed to save project');
    }
  };

  const handleArchive = async () => {
    if (!project) return;
    if (!window.confirm(`Archive "${project.title}"? It will move to the Archived tab.`)) {
      return;
    }
    try {
      await projectsApi.archive(project._id);
      await loadProject();
    } catch (err) {
      console.error('Failed to archive project:', err);
      setError('Failed to archive project');
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    if (!window.confirm(`Are you sure you want to delete "${project.title}"?`)) {
      return;
    }
    try {
      await projectsApi.delete(project._id);
      navigate(listPath);
    } catch (err) {
      console.error('Failed to delete project:', err);
      setError('Failed to delete project');
    }
  };

  const handleCreateTask = async (data: {
    projectId: string;
    title: string;
    description?: string;
    status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
    estimatedHours?: number;
    clientVisible?: boolean;
    assigneeAuth0Id?: string;
  }) => {
    try {
      const res = await projectTasksApi.create(data);
      setTasks((prev) =>
        sortProjectTasksByOrder([
          res.data,
          ...prev.map((t) => ({ ...t, order: (t.order ?? 0) + 1 })),
        ])
      );
    } catch (err) {
      console.error('Failed to create task:', err);
      setError('Failed to create task');
    }
  };

  const handleUpdateTask = async (taskId: string, data: Partial<ProjectTask>) => {
    try {
      const res = await projectTasksApi.update(taskId, data);
      setTasks((prev) => prev.map((t) => (t._id === taskId ? res.data : t)));
    } catch (err) {
      console.error('Failed to update task:', err);
      setError('Failed to update task');
    }
  };

  const handleToggleTaskStatus = async (taskId: string, status: string) => {
    try {
      const res = await projectTasksApi.updateStatus(taskId, status);
      setTasks((prev) => prev.map((t) => (t._id === taskId ? res.data : t)));
    } catch (err) {
      console.error('Failed to toggle task status:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await projectTasksApi.delete(taskId);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError('Failed to delete task');
    }
  };

  const handleReorderTasks = async (projectId: string, taskIds: string[]) => {
    try {
      const res = await projectTasksApi.reorder(projectId, taskIds);
      setTasks(sortProjectTasksByOrder(res.data || []));
    } catch (err) {
      console.error('Failed to reorder tasks:', err);
      setError('Failed to reorder tasks');
    }
  };

  const handleStart = async (
    projectId: string,
    taskTypeId: string,
    projectTaskId?: string,
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
      setError(null);
    } catch (err) {
      console.error('Failed to start timer:', err);
      setError('Failed to start timer');
    }
  };

  const handleStop = async () => {
    try {
      const res = await timeEntriesApi.stop();
      setActiveTimer(null);
      setEntries((prev) => [res.data, ...prev]);
    } catch (err) {
      console.error('Failed to stop timer:', err);
      setError('Failed to stop timer');
    }
  };

  const handleContinueEntry = async (entry: TimeEntry) => {
    try {
      const res = await timeEntriesApi.continue(entry._id);
      setActiveTimer(res.data);
      setEntries((prev) => prev.filter((e) => e._id !== entry._id));
    } catch (err) {
      console.error('Failed to continue entry:', err);
      setError('Failed to continue entry');
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await timeEntriesApi.delete(entryId);
      setEntries((prev) => prev.filter((e) => e._id !== entryId));
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  const handleSaveEntry = async (data: {
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
        setEntries((prev) => prev.map((e) => (e._id === editingEntry._id ? res.data : e)));
      } else {
        const res = await timeEntriesApi.create(data);
        setEntries((prev) => [res.data, ...prev]);
      }
      setEntryModalOpen(false);
      setEditingEntry(null);
    } catch (err) {
      console.error('Failed to save entry:', err);
      setError('Failed to save time entry');
    }
  };

  const openEdit = (tab: 'basic' | 'brief' = 'basic') => {
    setModalTab(tab);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <p className="text-[var(--admin-text-2)]">Project not found</p>
        <Link to={listPath} className="mt-4 inline-block text-primary-600 underline">
          Back to {listLabel.toLowerCase()}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[960px]">
      <ProjectHubHeader
        project={project}
        listPath={listPath}
        listLabel={listLabel}
        showBilling={isAdmin}
        canEdit={isAdmin}
        onEdit={() => openEdit('basic')}
        onArchive={() => void handleArchive()}
        onDelete={() => void handleDelete()}
      />

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <section id="team" className="scroll-mt-24">
          <AdminPanel
            title="Team"
            headerActions={
              isAdmin ? (
                <button type="button" onClick={() => openEdit('basic')} className="link text-sm">
                  Edit
                </button>
              ) : undefined
            }
          >
            <ProjectTeamStrip
              members={project.assignedMembers || []}
              canEdit={isAdmin}
              onEditAssignments={() => openEdit('basic')}
            />
          </AdminPanel>
        </section>

        <section id="brief" className="scroll-mt-24">
          <AdminPanel
            title="Brief"
            headerActions={
              isAdmin ? (
                <button type="button" onClick={() => openEdit('brief')} className="link text-sm">
                  Edit brief
                </button>
              ) : undefined
            }
          >
            <SanitizedBrief html={project.brief} fallback={project.description} />
          </AdminPanel>
        </section>

        {isAdmin && (
          <section id="budget" className="scroll-mt-24">
            <AdminPanel title="Budget & billing">
              <ProjectBudgetPanel
                project={project}
                budgetBurn={budgetBurn}
                budgetBurnPeriodLabel={budgetBurnPeriodLabel}
                burnPeriod={burnPeriod}
                onBurnPeriodChange={setBurnPeriod}
                entries={entries}
              />
            </AdminPanel>
          </section>
        )}

        <section id="tasks" className="scroll-mt-24">
          <AdminPanel title="Tasks">
            <ProjectTaskList
              tasks={tasks}
              projectId={project._id}
              projectTitle={project.title}
              onCreateTask={handleCreateTask}
              onUpdateTask={handleUpdateTask}
              onToggleStatus={handleToggleTaskStatus}
              onDeleteTask={handleDeleteTask}
              canEdit
              canDelete={isAdmin}
              canReorder={isAdmin}
              onReorderTasks={handleReorderTasks}
              memberMode={!isAdmin}
              embedded
            />
          </AdminPanel>
        </section>

        <section id="entries" className="scroll-mt-24">
          <AdminPanel title="Time entries">
            <ProjectEntriesSection
              project={project}
              entries={entries}
              taskTypes={taskTypes}
              projectTasks={tasks}
              activeTimer={activeTimer}
              showAmount={isAdmin}
              showRate={isAdmin}
              loading={entriesLoading}
              onStart={handleStart}
              onStop={handleStop}
              onAddEntry={() => {
                setEditingEntry(null);
                setEntryModalOpen(true);
              }}
              onEdit={(entry) => {
                setEditingEntry(entry);
                setEntryModalOpen(true);
              }}
              onDelete={handleDeleteEntry}
              onContinue={handleContinueEntry}
            />
          </AdminPanel>
        </section>

        <section id="messages" className="scroll-mt-24">
          <AdminPanel title="Messages" padded={false}>
            <div className="p-4">
              <ProjectMessagesPanel
                projectId={project._id}
                memberMode={!isAdmin}
                defaultExpanded
                hideToggle
              />
            </div>
          </AdminPanel>
        </section>
      </div>

      {isAdmin && (
        <ProjectModal
          project={project}
          clients={clients}
          isOpen={modalOpen}
          initialTab={modalTab}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveProject}
        />
      )}

      <EntryModal
        entry={editingEntry}
        projects={[project]}
        taskTypes={taskTypes}
        projectTasks={tasks}
        isOpen={entryModalOpen}
        showRate={isAdmin}
        defaultProjectId={project._id}
        onClose={() => {
          setEntryModalOpen(false);
          setEditingEntry(null);
        }}
        onSave={handleSaveEntry}
      />
    </div>
  );
}

export default ProjectHub;
