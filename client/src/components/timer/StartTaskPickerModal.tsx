import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, X } from 'lucide-react';
import type { Project, ProjectTask, TaskType } from '../../types';
import { projectClientId, uniqueClientsFromProjects } from '../../utils/projectClient';
import { sortProjectTasksByOrder, taskProjectId } from '../../utils/projectTasks';

const STORAGE_KEY_PREFIX = 'aad_last_task_type_project_';

interface StartTaskPickerModalProps {
  isOpen: boolean;
  projects: Project[];
  projectTasks: ProjectTask[];
  taskTypes: TaskType[];
  showRate?: boolean;
  isTimerRunning: boolean;
  onClose: () => void;
  onStart: (
    projectId: string,
    taskTypeId: string,
    projectTaskId: string,
    description?: string
  ) => void | Promise<void>;
}

export function StartTaskPickerModal({
  isOpen,
  projects,
  projectTasks,
  taskTypes,
  showRate = true,
  isTimerRunning,
  onClose,
  onStart,
}: StartTaskPickerModalProps) {
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [projectTaskId, setProjectTaskId] = useState('');
  const [taskTypeId, setTaskTypeId] = useState('');
  const [description, setDescription] = useState('');

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === 'ACTIVE' || p.status === 'PAUSED'),
    [projects]
  );

  const openTasks = useMemo(
    () =>
      sortProjectTasksByOrder(
        projectTasks.filter((task) => task.status === 'TODO' || task.status === 'IN_PROGRESS')
      ),
    [projectTasks]
  );

  const clients = useMemo(
    () => uniqueClientsFromProjects(activeProjects),
    [activeProjects]
  );

  const clientProjects = useMemo(
    () =>
      clientId
        ? activeProjects.filter((project) => projectClientId(project) === clientId)
        : [],
    [activeProjects, clientId]
  );

  const tasksForProject = useMemo(
    () => openTasks.filter((task) => taskProjectId(task) === projectId),
    [openTasks, projectId]
  );

  useEffect(() => {
    if (!isOpen) return;
    setClientId('');
    setProjectId('');
    setProjectTaskId('');
    setTaskTypeId('');
    setDescription('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !projectId) {
      setTaskTypeId('');
      return;
    }
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${projectId}`);
    if (stored && taskTypes.some((taskType) => taskType._id === stored)) {
      setTaskTypeId(stored);
    } else {
      setTaskTypeId('');
    }
  }, [isOpen, projectId, taskTypes]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !projectTaskId || !taskTypeId || isTimerRunning) return;
    await onStart(projectId, taskTypeId, projectTaskId, description.trim() || undefined);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${projectId}`, taskTypeId);
    } catch {
      /* ignore quota */
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Start task</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {openTasks.length === 0 ? (
            <p className="text-sm text-gray-600">
              No open tasks on active projects. Add a task on a project, then start it here.
            </p>
          ) : taskTypes.length === 0 ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
              Configure{' '}
              <Link to="/task-types" className="font-medium underline">
                task types
              </Link>{' '}
              before starting a task.
            </p>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                <select
                  value={clientId}
                  onChange={(e) => {
                    setClientId(e.target.value);
                    setProjectId('');
                    setProjectTaskId('');
                  }}
                  disabled={isTimerRunning}
                  className="input"
                  required
                >
                  <option value="">Select client...</option>
                  {clients.map((client) => (
                    <option key={client._id} value={client._id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
                <select
                  value={projectId}
                  onChange={(e) => {
                    setProjectId(e.target.value);
                    setProjectTaskId('');
                  }}
                  disabled={isTimerRunning || !clientId}
                  className="input disabled:opacity-50"
                  required
                >
                  <option value="">
                    {clientId ? 'Select project...' : 'Select a client first'}
                  </option>
                  {clientProjects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task *</label>
                <select
                  value={projectTaskId}
                  onChange={(e) => setProjectTaskId(e.target.value)}
                  disabled={isTimerRunning || !projectId}
                  className="input disabled:opacity-50"
                  required
                >
                  <option value="">
                    {!projectId
                      ? 'Select a project first'
                      : tasksForProject.length === 0
                        ? 'No open tasks on this project'
                        : 'Select task...'}
                  </option>
                  {tasksForProject.map((task) => (
                    <option key={task._id} value={task._id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task type *</label>
                <select
                  value={taskTypeId}
                  onChange={(e) => setTaskTypeId(e.target.value)}
                  disabled={isTimerRunning}
                  className="input"
                  required
                >
                  <option value="">Select task type...</option>
                  {taskTypes.map((taskType) => (
                    <option key={taskType._id} value={taskType._id}>
                      {showRate
                        ? `${taskType.name} — $${taskType.rate}/hr`
                        : taskType.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isTimerRunning}
                  placeholder="What are you working on?"
                  className="input"
                />
              </div>
            </>
          )}

          {isTimerRunning && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3">
              Stop the current timer before starting a new task.
            </p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-outline">
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                !projectId ||
                !projectTaskId ||
                !taskTypeId ||
                isTimerRunning ||
                taskTypes.length === 0 ||
                openTasks.length === 0
              }
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-5 h-5" />
              Start task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
