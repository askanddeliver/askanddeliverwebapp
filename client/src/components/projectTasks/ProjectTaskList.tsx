import { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Pencil,
  Trash2,
  Plus,
  ListTodo,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { ProjectTask } from '../../types';
import { ProjectTaskModal } from './ProjectTaskModal';

interface ProjectTaskListProps {
  tasks: ProjectTask[];
  projectId: string;
  projectTitle: string;
  canEdit?: boolean;
  onCreateTask: (data: {
    projectId: string;
    title: string;
    description?: string;
    status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
    estimatedHours?: number;
  }) => void;
  onUpdateTask: (
    id: string,
    data: Partial<ProjectTask>
  ) => void;
  onToggleStatus: (id: string, status: string) => void;
  onDeleteTask: (id: string) => void;
}

const statusIcons: Record<string, React.ReactNode> = {
  TODO: <Circle className="w-5 h-5 text-gray-400" />,
  IN_PROGRESS: <Clock className="w-5 h-5 text-blue-500" />,
  COMPLETED: <CheckCircle2 className="w-5 h-5 text-green-500" />,
};

const statusLabels: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};

export function ProjectTaskList({
  tasks,
  projectId,
  projectTitle,
  canEdit = true,
  onCreateTask,
  onUpdateTask,
  onToggleStatus,
  onDeleteTask,
}: ProjectTaskListProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [expanded, setExpanded] = useState(true);

  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const totalCount = tasks.length;

  const handleSave = (data: {
    projectId: string;
    title: string;
    description?: string;
    status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
    estimatedHours?: number;
  }) => {
    if (editingTask) {
      onUpdateTask(editingTask._id, data);
    } else {
      onCreateTask(data);
    }
    setModalOpen(false);
    setEditingTask(null);
  };

  const handleEdit = (task: ProjectTask) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const cycleStatus = (task: ProjectTask) => {
    const nextStatus: Record<string, string> = {
      TODO: 'IN_PROGRESS',
      IN_PROGRESS: 'COMPLETED',
      COMPLETED: 'TODO',
    };
    onToggleStatus(task._id, nextStatus[task.status]);
  };

  return (
    <div className="mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-gray-900 transition-colors"
        >
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          <ListTodo className="w-4 h-4" />
          Tasks
          {totalCount > 0 && (
            <span className="text-xs font-normal text-gray-500">
              ({completedCount}/{totalCount})
            </span>
          )}
        </button>
        {canEdit && (
        <button
          onClick={() => {
            setEditingTask(null);
            setModalOpen(true);
          }}
          className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Task
        </button>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
          <div
            className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
            style={{
              width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
            }}
          />
        </div>
      )}

      {/* Task list */}
      {expanded && (
        <div className="space-y-1">
          {tasks.length === 0 && (
            <p className="text-xs text-gray-400 py-2">
              No tasks yet. Add tasks to track deliverables.
            </p>
          )}

          {tasks.map((task) => (
            <div
              key={task._id}
              className={`group flex items-start gap-2 py-2 px-2 rounded-lg hover:bg-gray-50 transition-colors ${
                task.status === 'COMPLETED' ? 'opacity-60' : ''
              }`}
            >
              {/* Status toggle */}
              {canEdit ? (
              <button
                onClick={() => cycleStatus(task)}
                className="flex-shrink-0 mt-0.5 hover:scale-110 transition-transform"
                title={`Status: ${statusLabels[task.status]} — Click to change`}
              >
                {statusIcons[task.status]}
              </button>
              ) : (
                <span className="flex-shrink-0 mt-0.5">
                  {statusIcons[task.status]}
                </span>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm font-medium ${
                    task.status === 'COMPLETED'
                      ? 'line-through text-gray-400'
                      : 'text-gray-900'
                  }`}
                >
                  {task.title}
                </div>
                {task.description && (
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                    {task.description}
                  </p>
                )}
                {task.estimatedHours && (
                  <span className="text-xs text-gray-400">
                    Est: {task.estimatedHours}h
                  </span>
                )}
              </div>

              {/* Actions */}
              {canEdit && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                  onClick={() => handleEdit(task)}
                  className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                  title="Edit task"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete task "${task.title}"?`)) {
                      onDeleteTask(task._id);
                    }
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ProjectTaskModal
        task={editingTask}
        projectId={projectId}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}
