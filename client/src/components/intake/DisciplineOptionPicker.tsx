import { ChevronDown, ChevronUp } from 'lucide-react';
import type { DisciplineDefinition } from '../../types';

interface DisciplineOptionPickerProps {
  disciplines: DisciplineDefinition[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function DisciplineOptionPicker({
  disciplines,
  selectedIds,
  onChange,
}: DisciplineOptionPickerProps) {
  const sorted = [...disciplines].sort((a, b) => a.sortOrder - b.sortOrder);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const next = [...selectedIds];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const labelFor = (id: string) =>
    sorted.find((d) => d.id === id)?.name ?? id;

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-medium text-gray-600">
        Discipline options (from Site Config)
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {sorted.map((discipline) => (
          <label
            key={discipline.id}
            className="flex cursor-pointer items-start gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(discipline.id)}
              onChange={() => toggle(discipline.id)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium text-gray-800">{discipline.name}</span>
              {discipline.description && (
                <span className="mt-0.5 block text-xs text-gray-500">
                  {discipline.description}
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
      {selectedIds.length > 0 && (
        <div>
          <p className="mb-2 text-xs text-gray-500">Display order on form</p>
          <ul className="space-y-1">
            {selectedIds.map((id, index) => (
              <li
                key={id}
                className="flex items-center justify-between rounded-md bg-white px-2 py-1.5 text-sm"
              >
                <span>{labelFor(id)}</span>
                <div className="flex gap-0.5">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    className="rounded p-0.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={index === selectedIds.length - 1}
                    onClick={() => move(index, 1)}
                    className="rounded p-0.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
