import { Play, Square } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Project, TaskType, ProjectTask } from '../../types';

interface TimerControlsProps {
  projects: Project[];
  taskTypes: TaskType[];
  projectTasks: ProjectTask[];
  isRunning: boolean;
  onStart: (
    projectId: string,
    taskTypeId: string,
    projectTaskId?: string,
    description?: string
  ) => void;
  onStop: () => void;
}

export function TimerControls({
  projects,
  taskTypes,
  projectTasks,
  isRunning,
  onStart,
  onStop,
}: TimerControlsProps) {
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedTaskType, setSelectedTaskType] = useState('');
  const [selectedProjectTask, setSelectedProjectTask] = useState('');
  const [description, setDescription] = useState('');

  // Filter project tasks by selected project
  const filteredTasks = selectedProject
    ? projectTasks.filter((t) => {
        const pid = typeof t.projectId === 'object' ? t.projectId._id : t.projectId;
        return pid === selectedProject && t.status !== 'COMPLETED';
      })
    : [];

  // Reset project task when project changes
  useEffect(() => {
    setSelectedProjectTask('');
  }, [selectedProject]);

  const handleStart = () => {
    if (selectedProject && selectedTaskType) {
      onStart(
        selectedProject,
        selectedTaskType,
        selectedProjectTask || undefined,
        description || undefined
      );
      setDescription('');
    }
  };

  const activeProjects = projects.filter(
    (p) => p.status === 'ACTIVE' || p.status === 'PAUSED'
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project
          </label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            disabled={isRunning}
            className="input"
          >
            <option value="">Select project...</option>
            {activeProjects.map((project) => (
              <option key={project._id} value={project._id}>
                {typeof project.clientId === 'object'
                  ? `${project.clientId.name} — ${project.title}`
                  : project.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Task Type
          </label>
          <select
            value={selectedTaskType}
            onChange={(e) => setSelectedTaskType(e.target.value)}
            disabled={isRunning}
            className="input"
          >
            <option value="">Select task type...</option>
            {taskTypes.map((taskType) => (
              <option key={taskType._id} value={taskType._id}>
                {taskType.name} — ${taskType.rate}/hr
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Project task dropdown - only shows when a project is selected and has tasks */}
      {selectedProject && filteredTasks.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project Task{' '}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <select
            value={selectedProjectTask}
            onChange={(e) => setSelectedProjectTask(e.target.value)}
            disabled={isRunning}
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
          disabled={isRunning}
          placeholder="What are you working on?"
          className="input"
        />
      </div>

      <div className="flex gap-4">
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={!selectedProject || !selectedTaskType}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-5 h-5" />
            Start Timer
          </button>
        ) : (
          <button
            onClick={onStop}
            className="btn bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
          >
            <Square className="w-5 h-5" />
            Stop Timer
          </button>
        )}
      </div>
    </div>
  );
}
