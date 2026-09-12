import type { TimeEntry, Project, TaskType, Client, ProjectTask, User } from '../../types';
import {
  formatDate,
  formatCurrency,
  formatDurationHuman,
  getEffectiveRate,
  secondsToHours,
} from '../../utils/calculations';
import type { ReportColumnDef } from '../../utils/reportColumns';
import { Pencil, Trash2 } from 'lucide-react';

interface ReportEntriesTableProps {
  entries: TimeEntry[];
  columns: ReportColumnDef[];
  users: User[];
  onEdit?: (entry: TimeEntry) => void;
  onDelete?: (id: string) => void;
  printMode?: boolean;
}

function billingModeLabel(mode?: string): string {
  if (mode === 'FIXED_PRICE') return 'Fixed price';
  if (mode === 'HOUR_RETAINER') return 'Hour retainer';
  return 'Hourly';
}

function formatClock(value?: string): string {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function invoiceNumberOf(entry: TimeEntry): string {
  const inv = entry.invoiceId;
  if (!inv) return '';
  if (typeof inv === 'object') return inv.invoiceNumber || '';
  return '';
}

function cellValue(
  entry: TimeEntry,
  columnId: ReportColumnDef['id'],
  userMap: Map<string, User>
): string {
  const project = typeof entry.projectId === 'object' ? (entry.projectId as Project) : null;
  const taskType = typeof entry.taskTypeId === 'object' ? (entry.taskTypeId as TaskType) : null;
  const client =
    project && typeof project.clientId === 'object' ? (project.clientId as Client) : null;
  const projectTask =
    entry.projectTaskId && typeof entry.projectTaskId === 'object'
      ? (entry.projectTaskId as ProjectTask)
      : null;
  const member = entry.userId ? userMap.get(entry.userId) : undefined;
  const hours = secondsToHours(entry.duration);
  const effectiveRate = taskType ? (client ? getEffectiveRate(taskType, client) : taskType.rate) : 0;
  const billed = Math.round(hours * effectiveRate * 100) / 100;
  const discount = client && taskType ? client.taskDiscounts?.[taskType._id] || 0 : 0;
  const earnedRate = member?.earnedRates?.[taskType?._id || ''] ?? 0;
  const earned = Math.round(hours * (typeof earnedRate === 'number' ? earnedRate : 0) * 100) / 100;

  switch (columnId) {
    case 'date':
      return formatDate(entry.startTime);
    case 'start':
      return formatClock(entry.startTime);
    case 'end':
      return formatClock(entry.endTime);
    case 'hours':
      return hours.toFixed(2);
    case 'durationHuman':
      return formatDurationHuman(entry.duration);
    case 'member':
      return member?.name || '';
    case 'client':
      return client?.name || '';
    case 'project':
      return project?.title || 'Unknown project';
    case 'billingMode':
      return billingModeLabel(project?.billingMode);
    case 'projectTask':
      return projectTask?.title || '';
    case 'taskType':
      return taskType?.name || '';
    case 'description':
      return entry.description || '';
    case 'baseRate':
      return taskType ? formatCurrency(taskType.rate) : '';
    case 'discount':
      return `${discount}%`;
    case 'effectiveRate':
      return formatCurrency(effectiveRate);
    case 'billed':
      return formatCurrency(billed);
    case 'earnedRate':
      return formatCurrency(typeof earnedRate === 'number' ? earnedRate : 0);
    case 'earned':
      return formatCurrency(earned);
    case 'margin':
      return formatCurrency(billed - earned);
    case 'invoiced':
      return entry.invoiceId ? 'Yes' : 'No';
    case 'invoiceNumber':
      return invoiceNumberOf(entry);
    case 'running':
      return entry.isRunning ? 'Yes' : 'No';
    default:
      return '';
  }
}

export function ReportEntriesTable({
  entries,
  columns,
  users,
  onEdit,
  onDelete,
  printMode = false,
}: ReportEntriesTableProps) {
  const userMap = new Map(users.map((u) => [u.auth0Id, u]));
  const showActions = !printMode && (onEdit || onDelete);

  if (entries.length === 0) {
    return (
      <p className="text-gray-500 py-8 text-center">
        No entries match the selected filters.
      </p>
    );
  }

  if (columns.length === 0) {
    return (
      <p className="text-gray-500 py-8 text-center">
        Select at least one column in the filter rail.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="w-full text-sm print:text-xs">
        <thead>
          <tr className="border-b-2 border-gray-200">
            {columns.map((col) => (
              <th
                key={col.id}
                className={`py-2 font-bold text-gray-600 ${
                  col.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {col.label}
              </th>
            ))}
            {showActions && (
              <th className="py-2 text-right font-bold text-gray-600 print:hidden"> </th>
            )}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry._id} className="border-b border-gray-100 align-top">
              {columns.map((col) => (
                <td
                  key={col.id}
                  className={`py-2 px-1 ${col.align === 'right' ? 'text-right tabular-nums' : 'text-left'}`}
                >
                  {cellValue(entry, col.id, userMap)}
                </td>
              ))}
              {showActions && (
                <td className="py-2 pl-2 text-right whitespace-nowrap print:hidden">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(entry)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                      title="Edit entry"
                    >
                      <Pencil className="w-3.5 h-3.5 inline" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Delete this time entry?')) {
                          onDelete(entry._id);
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5 inline" />
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
