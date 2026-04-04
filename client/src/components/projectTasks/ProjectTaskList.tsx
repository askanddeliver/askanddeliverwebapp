import { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  GripVertical,
} from 'lucide-react';
import type { ProjectTask } from '../../types';
import { ProjectTaskModal } from './ProjectTaskModal';
import { sortProjectTasksByOrder } from '../../utils/projectTasks';

interface ProjectTaskListProps {
  tasks: ProjectTask[];
  projectId: string;
  projectTitle: string;
  canEdit?: boolean;
  /** Admin-only: drag to set priority (persisted via reorder API). */
  canReorder?: boolean;
  onReorderTasks?: (projectId: string, taskIds: string[]) => void | Promise<void>;
  onCreateTask: (data: {
    projectId: string;
    title: string;
    description?: string;
    status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
    estimatedHours?: number;
  }) => void;
  onUpdateTask: (id: string, data: Partial<ProjectTask>) => void;
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

function SortableTaskRow({
  task,
  canEdit,
  canReorder,
  onCycleStatus,
  onEdit,
  onDelete,
}: {
  task: ProjectTask;
  canEdit: boolean;
  canReorder: boolean;
  onCycleStatus: (task: ProjectTask) => void;
  onEdit: (task: ProjectTask) => void;
  onDelete: (task: ProjectTask) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-start gap-2 py-2 px-2 rounded-lg hover:bg-gray-50 transition-colors ${
        task.status === 'COMPLETED' ? 'opacity-60' : ''
      } ${isDragging ? 'shadow-md ring-2 ring-primary-100 z-10 bg-white relative' : ''}`}
    >
      {canReorder && (
        <button
          type="button"
          className="flex-shrink-0 mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
          aria-label="Drag to set priority"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}

      {canEdit ? (
        <button
          type="button"
          onClick={() => onCycleStatus(task)}
          className="flex-shrink-0 mt-0.5 hover:scale-110 transition-transform"
          title={`Status: ${statusLabels[task.status]} — Click to change`}
        >
          {statusIcons[task.status]}
        </button>
      ) : (
        <span className="flex-shrink-0 mt-0.5">{statusIcons[task.status]}</span>
      )}

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
          <span className="text-xs text-gray-400">Est: {task.estimatedHours}h</span>
        )}
      </div>

      {canEdit && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
            title="Edit task"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Delete task "${task.title}"?`)) {
                onDelete(task);
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
  );
}

function StaticTaskRow({
  task,
  canEdit,
  onCycleStatus,
  onEdit,
  onDelete,
}: {
  task: ProjectTask;
  canEdit: boolean;
  onCycleStatus: (task: ProjectTask) => void;
  onEdit: (task: ProjectTask) => void;
  onDelete: (task: ProjectTask) => void;
}) {
  return (
    <div
      className={`group flex items-start gap-2 py-2 px-2 rounded-lg hover:bg-gray-50 transition-colors ${
        task.status === 'COMPLETED' ? 'opacity-60' : ''
      }`}
    >
      {canEdit ? (
        <button
          type="button"
          onClick={() => onCycleStatus(task)}
          className="flex-shrink-0 mt-0.5 hover:scale-110 transition-transform"
          title={`Status: ${statusLabels[task.status]} — Click to change`}
        >
          {statusIcons[task.status]}
        </button>
      ) : (
        <span className="flex-shrink-0 mt-0.5">{statusIcons[task.status]}</span>
      )}

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
          <span className="text-xs text-gray-400">Est: {task.estimatedHours}h</span>
        )}
      </div>

      {canEdit && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
            title="Edit task"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Delete task "${task.title}"?`)) {
                onDelete(task);
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
  );
}

export function ProjectTaskList({
  tasks,
  projectId,
  projectTitle: _projectTitle,
  canEdit = true,
  canReorder = false,
  onReorderTasks,
  onCreateTask,
  onUpdateTask,
  onToggleStatus,
  onDeleteTask,
}: ProjectTaskListProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [expanded, setExpanded] = useState(true);

  const sortedFromProps = useMemo(() => sortProjectTasksByOrder(tasks), [tasks]);
  const [items, setItems] = useState<ProjectTask[]>(sortedFromProps);

  useEffect(() => {
    setItems(sortedFromProps);
  }, [sortedFromProps]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const totalCount = tasks.length;

  const reorderEnabled = Boolean(canReorder && onReorderTasks && canEdit);

  const handleDragEnd = (event: DragEndEvent) => {
    if (!onReorderTasks) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((t) => t._id === active.id);
    const newIndex = items.findIndex((t) => t._id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    void onReorderTasks(projectId, next.map((t) => t._id));
  };

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

  const listBody = reorderEnabled ? (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((t) => t._id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1">
          {items.map((task) => (
            <SortableTaskRow
              key={task._id}
              task={task}
              canEdit={canEdit}
              canReorder
              onCycleStatus={cycleStatus}
              onEdit={handleEdit}
              onDelete={(t) => onDeleteTask(t._id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  ) : (
    <div className="space-y-1">
      {items.map((task) => (
        <StaticTaskRow
          key={task._id}
          task={task}
          canEdit={canEdit}
          onCycleStatus={cycleStatus}
          onEdit={handleEdit}
          onDelete={(t) => onDeleteTask(t._id)}
        />
      ))}
    </div>
  );

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
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
            type="button"
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

      {reorderEnabled && (
        <p className="text-[11px] text-gray-400 mb-2">
          Drag tasks by the handle to set priority (order shown on the dashboard).
        </p>
      )}

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

      {expanded && (
        <>
          {items.length === 0 && (
            <p className="text-xs text-gray-400 py-2">
              No tasks yet. Add tasks to track deliverables.
            </p>
          )}
          {items.length > 0 && listBody}
        </>
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
