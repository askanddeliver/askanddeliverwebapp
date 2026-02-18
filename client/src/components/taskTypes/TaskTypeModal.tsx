import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { TaskType } from '../../types';

interface TaskTypeModalProps {
  taskType?: TaskType | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; rate: number; color: string }) => void;
}

const COLOR_OPTIONS = [
  '#3B82F6',
  '#10B981',
  '#8B5CF6',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#6B7280',
  '#14B8A6',
  '#F97316',
  '#06B6D4',
];

export function TaskTypeModal({
  taskType,
  isOpen,
  onClose,
  onSave,
}: TaskTypeModalProps) {
  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  const [color, setColor] = useState('#3B82F6');

  useEffect(() => {
    if (taskType) {
      setName(taskType.name);
      setRate(taskType.rate.toString());
      setColor(taskType.color);
    } else {
      setName('');
      setRate('');
      setColor('#3B82F6');
    }
  }, [taskType, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      rate: parseFloat(rate) || 0,
      color,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {taskType ? 'Edit Task Type' : 'New Task Type'}
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
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="e.g., Design, Development"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hourly Rate ($) *
            </label>
            <input
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="input"
              placeholder="0.00"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === c
                      ? 'border-gray-900 scale-110'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">
              {taskType ? 'Update' : 'Create'}
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
