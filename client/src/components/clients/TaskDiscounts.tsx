import type { TaskType } from '../../types';

interface TaskDiscountsProps {
  taskTypes: TaskType[];
  discounts: Record<string, number>;
  onChange: (discounts: Record<string, number>) => void;
}

export function TaskDiscounts({
  taskTypes,
  discounts,
  onChange,
}: TaskDiscountsProps) {
  const updateDiscount = (taskTypeId: string, discount: number) => {
    onChange({
      ...discounts,
      [taskTypeId]: Math.min(100, Math.max(0, discount)),
    });
  };

  const setAllDiscounts = (percent: number) => {
    const newDiscounts: Record<string, number> = {};
    taskTypes.forEach((tt) => {
      newDiscounts[tt._id] = percent;
    });
    onChange(newDiscounts);
  };

  if (taskTypes.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">
        No task types configured yet. Create task types first to set discounts.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAllDiscounts(0)}
          className="text-xs px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
        >
          Clear All
        </button>
        <button
          type="button"
          onClick={() => setAllDiscounts(25)}
          className="text-xs px-3 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
        >
          25% All
        </button>
        <button
          type="button"
          onClick={() => setAllDiscounts(50)}
          className="text-xs px-3 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
        >
          50% All
        </button>
        <button
          type="button"
          onClick={() => setAllDiscounts(100)}
          className="text-xs px-3 py-1 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors"
        >
          Pro-bono
        </button>
      </div>

      <div className="space-y-3">
        {taskTypes.map((taskType) => {
          const discount = discounts[taskType._id] || 0;
          const effectiveRate = taskType.rate * (1 - discount / 100);

          return (
            <div
              key={taskType._id}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 text-sm"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: taskType.color }}
                />
                <div className="font-medium text-gray-800 truncate">
                  {taskType.name}
                </div>
                <div className="text-gray-500 w-20 flex-shrink-0 text-right">
                  ${taskType.rate}/hr
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-1 flex-1 sm:flex-initial">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discount}
                  onChange={(e) =>
                    updateDiscount(taskType._id, Number(e.target.value))
                  }
                  className="input w-full min-w-0 sm:w-24 text-center text-sm py-1.5"
                />
                <span className="text-gray-500 text-xs flex-shrink-0">%</span>
                <div className="font-bold text-green-600 w-24 flex-shrink-0 text-right">
                  ${effectiveRate.toFixed(2)}/hr
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
