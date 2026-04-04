import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, X } from 'lucide-react';
import type { Project, ProjectTask, TaskType } from '../../types';

const STORAGE_KEY_PREFIX = 'aad_last_task_type_project_';

interface StartTaskTimerModalProps {
  isOpen: boolean;
  project: Project | null;
  projectTask: ProjectTask | null;
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

export function StartTaskTimerModal({
  isOpen,
  project,
  projectTask,
  taskTypes,
  showRate = true,
  isTimerRunning,
  onClose,
  onStart,
}: StartTaskTimerModalProps) {
  const [taskTypeId, setTaskTypeId] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!isOpen || !project) return;
    const key = `${STORAGE_KEY_PREFIX}${project._id}`;
    const stored = localStorage.getItem(key);
    if (stored && taskTypes.some((t) => t._id === stored)) {
      setTaskTypeId(stored);
    } else {
      setTaskTypeId('');
    }
    setDescription('');
  }, [isOpen, project, projectTask, taskTypes]);

  if (!isOpen || !project || !projectTask) return null;

  const clientLabel =
    typeof project.clientId === 'object' ? project.clientId.name : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTypeId || isTimerRunning) return;
    await onStart(project._id, taskTypeId, projectTask._id, description.trim() || undefined);
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${project._id}`, taskTypeId);
    } catch {
      /* ignore quota */
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Start timer</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="rounded-lg bg-gray-50 border border-gray-100 p-4 space-y-1 text-sm">
            {clientLabel && (
              <p className="text-gray-500">
                <span className="font-medium text-gray-700">Client:</span>{' '}
                {clientLabel}
              </p>
            )}
            <p className="text-gray-500">
              <span className="font-medium text-gray-700">Project:</span>{' '}
              {project.title}
            </p>
            <p className="text-gray-900 font-medium pt-1">{projectTask.title}</p>
          </div>

          {taskTypes.length === 0 ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">
              Configure{' '}
              <Link to="/task-types" className="font-medium underline">
                task types
              </Link>{' '}
              before starting the timer.
            </p>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task type *
                </label>
                <select
                  value={taskTypeId}
                  onChange={(e) => setTaskTypeId(e.target.value)}
                  disabled={isTimerRunning}
                  className="input"
                  required
                >
                  <option value="">Select task type...</option>
                  {taskTypes.map((tt) => (
                    <option key={tt._id} value={tt._id}>
                      {showRate ? `${tt.name} — $${tt.rate}/hr` : tt.name}
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
              Stop the current timer before starting a new one.
            </p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-outline">
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                !taskTypeId || isTimerRunning || taskTypes.length === 0
              }
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-5 h-5" />
              Start timer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
