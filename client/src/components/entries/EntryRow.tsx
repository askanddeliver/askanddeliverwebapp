import { Play, Pencil, Trash2 } from 'lucide-react';
import type { TimeEntry, Project, TaskType, Client, ProjectTask } from '../../types';
import {
  formatDurationHuman,
  formatDate,
  formatCurrency,
  getEffectiveRate,
  secondsToHours,
} from '../../utils/calculations';

interface EntryRowProps {
  entry: TimeEntry;
  onEdit: (entry: TimeEntry) => void;
  onDelete: (id: string) => void;
  onContinue?: (entry: TimeEntry) => void;
  showAmount?: boolean;
  showDescription?: boolean;
}

export function EntryRow({
  entry,
  onEdit,
  onDelete,
  onContinue,
  showAmount = true,
  showDescription = true,
}: EntryRowProps) {
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
  const projectTask =
    entry.projectTaskId && typeof entry.projectTaskId === 'object'
      ? (entry.projectTaskId as ProjectTask)
      : null;

  // Calculate amount using effective rate (with client discount)
  let amount: number | null = null;
  if (showAmount && taskType && client) {
    const effectiveRate = getEffectiveRate(taskType, client);
    const hours = secondsToHours(entry.duration);
    amount = Math.round(hours * effectiveRate * 100) / 100;
  } else if (showAmount && taskType) {
    // No client data available, use base rate
    const hours = secondsToHours(entry.duration);
    amount = Math.round(hours * taskType.rate * 100) / 100;
  }

  return (
    <div className="flex items-start gap-4 py-4 px-4 hover:bg-gray-50 rounded-lg transition-colors print:gap-2 print:py-1.5 print:px-0">
      {taskType && (
        <div
          className="w-3 h-3 rounded-full flex-shrink-0 mt-1.5 print:w-2 print:h-2 print:mt-1"
          style={{ backgroundColor: taskType.color }}
        />
      )}

      <div className="flex-1 min-w-0">
        <div className="font-bold text-gray-900 text-sm print:text-xs">
          {project?.title || 'Unknown project'}
          {projectTask && (
            <span className="font-normal text-gray-500">
              {' '}
              &rsaquo; {projectTask.title}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-0.5 print:text-[10px] print:mt-0">
          {client && <span>{client.name}</span>}
          {taskType && <span>{client ? ` (${taskType.name})` : taskType.name}</span>}
          <span> &middot; {formatDate(entry.startTime)}</span>
        </div>
        {showDescription && entry.description && (
          <div className="text-xs text-gray-400 mt-1 line-clamp-2 print:text-[10px] print:mt-0 print:line-clamp-1">
            {entry.description}
          </div>
        )}
      </div>

      <div className="text-right flex-shrink-0">
        <div className="font-bold text-gray-800 text-sm print:text-xs">
          {formatDurationHuman(entry.duration)}
        </div>
        {amount !== null && (
          <div className="text-xs text-gray-500 mt-0.5 print:text-[10px] print:mt-0">
            {formatCurrency(amount)}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0 print:hidden">
        {onContinue && (
          <button
            onClick={() => onContinue(entry)}
            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
            title="Continue this task"
          >
            <Play className="w-3.5 h-3.5" />
          </button>
        )}
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
