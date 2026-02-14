import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { TimeEntry, Project, TaskType } from '../../types';
import { toDateTimeLocal } from '../../utils/calculations';

interface EntryModalProps {
  entry?: TimeEntry | null;
  projects: Project[];
  taskTypes: TaskType[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    projectId: string;
    taskTypeId: string;
    description?: string;
    startTime: string;
    endTime: string;
    duration: number;
  }) => void;
}

export function EntryModal({
  entry,
  projects,
  taskTypes,
  isOpen,
  onClose,
  onSave,
}: EntryModalProps) {
  const [projectId, setProjectId] = useState('');
  const [taskTypeId, setTaskTypeId] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    if (entry) {
      const project =
        typeof entry.projectId === 'object' ? entry.projectId : null;
      const taskType =
        typeof entry.taskTypeId === 'object' ? entry.taskTypeId : null;

      setProjectId(project?._id || (entry.projectId as string));
      setTaskTypeId(taskType?._id || (entry.taskTypeId as string));
      setDescription(entry.description || '');
      setStartTime(toDateTimeLocal(entry.startTime));
      setEndTime(entry.endTime ? toDateTimeLocal(entry.endTime) : '');
    } else {
      setProjectId('');
      setTaskTypeId('');
      setDescription('');
      setStartTime('');
      setEndTime('');
    }
  }, [entry, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !taskTypeId || !startTime || !endTime) return;

    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);

    if (duration <= 0) return;

    onSave({
      projectId,
      taskTypeId,
      description: description.trim() || undefined,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      duration,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {entry ? 'Edit Time Entry' : 'New Time Entry'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project *
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="input"
                required
              >
                <option value="">Select project...</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {typeof p.clientId === 'object'
                      ? `${p.clientId.name} — ${p.title}`
                      : p.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Type *
              </label>
              <select
                value={taskTypeId}
                onChange={(e) => setTaskTypeId(e.target.value)}
                className="input"
                required
              >
                <option value="">Select task type...</option>
                {taskTypes.map((tt) => (
                  <option key={tt._id} value={tt._id}>
                    {tt.name} — ${tt.rate}/hr
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
              placeholder="What did you work on? (optional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time *
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time *
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="input"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">
              {entry ? 'Update Entry' : 'Create Entry'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
