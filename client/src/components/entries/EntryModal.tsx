import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { TimeEntry, Project, TaskType, ProjectTask } from '../../types';

interface EntryModalProps {
  entry?: TimeEntry | null;
  projects: Project[];
  taskTypes: TaskType[];
  projectTasks: ProjectTask[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    projectId: string;
    taskTypeId: string;
    projectTaskId?: string;
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
  projectTasks,
  isOpen,
  onClose,
  onSave,
}: EntryModalProps) {
  const [projectId, setProjectId] = useState('');
  const [taskTypeId, setTaskTypeId] = useState('');
  const [projectTaskId, setProjectTaskId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');

  // Filter project tasks by selected project
  const filteredTasks = projectId
    ? projectTasks.filter((t) => {
        const pid = typeof t.projectId === 'object' ? t.projectId._id : t.projectId;
        return pid === projectId;
      })
    : [];

  useEffect(() => {
    if (entry) {
      const project =
        typeof entry.projectId === 'object' ? entry.projectId : null;
      const taskType =
        typeof entry.taskTypeId === 'object' ? entry.taskTypeId : null;
      const projectTask =
        entry.projectTaskId && typeof entry.projectTaskId === 'object'
          ? entry.projectTaskId
          : null;

      setProjectId(project?._id || (entry.projectId as string));
      setTaskTypeId(taskType?._id || (entry.taskTypeId as string));
      setProjectTaskId(
        projectTask?._id || (entry.projectTaskId as string) || ''
      );
      setDescription(entry.description || '');

      // Extract date from startTime
      const entryDate = new Date(entry.startTime);
      setDate(entryDate.toISOString().split('T')[0]);

      // Extract hours/minutes from duration (in seconds)
      const totalMinutes = Math.round(entry.duration / 60);
      setHours(Math.floor(totalMinutes / 60).toString());
      setMinutes((totalMinutes % 60).toString());
    } else {
      setProjectId('');
      setTaskTypeId('');
      setProjectTaskId('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setHours('');
      setMinutes('');
    }
  }, [entry, isOpen]);

  // Reset project task when project changes (only for new entries)
  useEffect(() => {
    if (!entry) {
      setProjectTaskId('');
    }
  }, [projectId, entry]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !taskTypeId) return;

    const totalMinutes =
      parseInt(hours || '0') * 60 + parseInt(minutes || '0');
    const durationSeconds = totalMinutes * 60;

    if (durationSeconds <= 0) return;

    // Use selected date with a default start time of 9:00 AM
    const startTime = new Date(`${date}T09:00:00`);
    const endTime = new Date(startTime.getTime() + durationSeconds * 1000);

    onSave({
      projectId,
      taskTypeId,
      projectTaskId: projectTaskId || undefined,
      description: description.trim() || undefined,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: durationSeconds,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {entry ? 'Edit Entry' : 'New Time Entry'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
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

          {/* Project task dropdown */}
          {projectId && filteredTasks.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Task{' '}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                value={projectTaskId}
                onChange={(e) => setProjectTaskId(e.target.value)}
                className="input"
              >
                <option value="">No specific task</option>
                {filteredTasks.map((task) => (
                  <option key={task._id} value={task._id}>
                    {task.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hours
              </label>
              <input
                type="number"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="0"
                min="0"
                max="24"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minutes
              </label>
              <input
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="0"
                min="0"
                max="59"
                className="input"
              />
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

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">
              {entry ? 'Save Changes' : 'Create Entry'}
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
