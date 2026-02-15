import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import type { Project, TaskType, ProjectTask } from '../../types';

interface QuickEntryProps {
  projects: Project[];
  taskTypes: TaskType[];
  projectTasks: ProjectTask[];
  onSubmit: (data: {
    projectId: string;
    taskTypeId: string;
    projectTaskId?: string;
    description?: string;
    startTime: string;
    endTime: string;
    duration: number;
  }) => void;
}

export function QuickEntry({ projects, taskTypes, projectTasks, onSubmit }: QuickEntryProps) {
  const [isOpen, setIsOpen] = useState(false);
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
        return pid === projectId && t.status !== 'COMPLETED';
      })
    : [];

  // Reset project task when project changes
  useEffect(() => {
    setProjectTaskId('');
  }, [projectId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !taskTypeId) return;

    const totalMinutes =
      (parseInt(hours || '0') * 60) + parseInt(minutes || '0');
    const durationSeconds = totalMinutes * 60;

    if (durationSeconds <= 0) return;

    const startTime = new Date(`${date}T09:00:00`);
    const endTime = new Date(startTime.getTime() + durationSeconds * 1000);

    onSubmit({
      projectId,
      taskTypeId,
      projectTaskId: projectTaskId || undefined,
      description: description || undefined,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: durationSeconds,
    });

    // Reset form
    setProjectId('');
    setTaskTypeId('');
    setProjectTaskId('');
    setDescription('');
    setHours('');
    setMinutes('');
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="btn-secondary flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Manual Entry
      </button>
    );
  }

  const activeProjects = projects.filter(
    (p) => p.status === 'ACTIVE' || p.status === 'PAUSED'
  );

  return (
    <div className="card border-primary-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Add Manual Entry
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="input"
              required
            >
              <option value="">Select project...</option>
              {activeProjects.map((p) => (
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
              Task Type
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
            Description (optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did you work on?"
            className="input"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
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

        <div className="flex gap-3">
          <button type="submit" className="btn-primary">
            Add Entry
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
