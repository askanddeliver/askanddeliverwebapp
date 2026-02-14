import { Play, Square } from 'lucide-react';
import { useState } from 'react';
import type { Project, TaskType } from '../../types';

interface TimerControlsProps {
  projects: Project[];
  taskTypes: TaskType[];
  isRunning: boolean;
  onStart: (
    projectId: string,
    taskTypeId: string,
    description?: string
  ) => void;
  onStop: () => void;
}

export function TimerControls({
  projects,
  taskTypes,
  isRunning,
  onStart,
  onStop,
}: TimerControlsProps) {
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedTaskType, setSelectedTaskType] = useState('');
  const [description, setDescription] = useState('');

  const handleStart = () => {
    if (selectedProject && selectedTaskType) {
      onStart(selectedProject, selectedTaskType, description || undefined);
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
