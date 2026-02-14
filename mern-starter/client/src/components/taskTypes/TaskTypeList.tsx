import { Pencil, Trash2, Tag } from 'lucide-react';
import type { TaskType } from '../../types';

interface TaskTypeListProps {
  taskTypes: TaskType[];
  onEdit: (taskType: TaskType) => void;
  onDelete: (id: string) => void;
}

export function TaskTypeList({
  taskTypes,
  onEdit,
  onDelete,
}: TaskTypeListProps) {
  if (taskTypes.length === 0) {
    return (
      <div className="text-center py-12">
        <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-500 mb-2">
          No task types yet
        </h3>
        <p className="text-gray-400">
          Create task types to categorize your work and set hourly rates.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {taskTypes.map((taskType) => (
        <div
          key={taskType._id}
          className="card flex items-center gap-4 py-4 hover:shadow-md transition-shadow"
        >
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: taskType.color }}
          />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{taskType.name}</h3>
          </div>
          <div className="text-lg font-bold text-gray-700">
            ${taskType.rate}
            <span className="text-sm font-normal text-gray-400">/hr</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(taskType)}
              className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              title="Edit task type"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    `Delete "${taskType.name}" task type?`
                  )
                ) {
                  onDelete(taskType._id);
                }
              }}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete task type"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
