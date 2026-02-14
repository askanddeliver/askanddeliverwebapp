import { Pencil, Trash2 } from 'lucide-react';
import type { TimeEntry, Project, TaskType, Client } from '../../types';
import { formatDuration, formatDate } from '../../utils/calculations';

interface EntryRowProps {
  entry: TimeEntry;
  onEdit: (entry: TimeEntry) => void;
  onDelete: (id: string) => void;
}

export function EntryRow({ entry, onEdit, onDelete }: EntryRowProps) {
  const project =
    typeof entry.projectId === 'object'
      ? (entry.projectId as Project)
      : null;
  const taskType =
    typeof entry.taskTypeId === 'object'
      ? (entry.taskTypeId as TaskType)
      : null;
  const client =
    project && typeof project.clientId === 'object'
      ? (project.clientId as Client)
      : null;

  return (
    <div className="flex items-center gap-4 py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors">
      {taskType && (
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: taskType.color }}
        />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 text-sm truncate">
            {project?.title || 'Unknown project'}
          </span>
          {client && (
            <span className="text-xs text-gray-400">({client.name})</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
          <span>{taskType?.name || 'Unknown task'}</span>
          {entry.description && (
            <>
              <span className="text-gray-300">|</span>
              <span className="truncate">{entry.description}</span>
            </>
          )}
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <div className="font-mono text-sm font-semibold text-gray-800">
          {formatDuration(entry.duration)}
        </div>
        <div className="text-xs text-gray-400">
          {formatDate(entry.startTime)}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onEdit(entry)}
          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
          title="Edit entry"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            if (window.confirm('Delete this time entry?')) {
              onDelete(entry._id);
            }
          }}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Delete entry"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
