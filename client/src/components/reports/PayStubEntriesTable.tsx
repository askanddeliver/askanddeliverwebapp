import type { TimeEntry, Project, TaskType, Client, ProjectTask, InvoiceLineItem } from '../../types';
import { formatCurrency, formatDate, secondsToHours } from '../../utils/calculations';
import { payStubRateByTaskType, payStubRateForEntry } from '../../utils/payStub';

interface PayStubEntriesTableProps {
  entries: TimeEntry[];
  items: InvoiceLineItem[];
  showDescription?: boolean;
}

export function PayStubEntriesTable({
  entries,
  items,
  showDescription = false,
}: PayStubEntriesTableProps) {
  const rates = payStubRateByTaskType(items);
  const sorted = [...entries].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  if (sorted.length === 0) {
    return <p className="text-gray-500 py-6 text-center text-sm">No time entries on this stub.</p>;
  }

  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="w-full text-sm print:text-xs">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="text-left py-2 font-bold text-gray-600">Date</th>
            <th className="text-left py-2 font-bold text-gray-600">Client</th>
            <th className="text-left py-2 font-bold text-gray-600">Project</th>
            <th className="text-left py-2 font-bold text-gray-600">Task</th>
            {showDescription && (
              <th className="text-left py-2 font-bold text-gray-600">Description</th>
            )}
            <th className="text-right py-2 font-bold text-gray-600">Hours</th>
            <th className="text-right py-2 font-bold text-gray-600">Rate</th>
            <th className="text-right py-2 font-bold text-gray-600">Amount</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry) => {
            const project =
              typeof entry.projectId === 'object' ? (entry.projectId as Project) : null;
            const taskType =
              typeof entry.taskTypeId === 'object' ? (entry.taskTypeId as TaskType) : null;
            const client =
              project && typeof project.clientId === 'object'
                ? (project.clientId as Client)
                : null;
            const projectTask =
              entry.projectTaskId && typeof entry.projectTaskId === 'object'
                ? (entry.projectTaskId as ProjectTask)
                : null;
            const hours = secondsToHours(entry.duration);
            const rate = payStubRateForEntry(entry, rates);
            const amount = Math.round(hours * rate * 100) / 100;

            return (
              <tr key={entry._id} className="border-b border-gray-100 align-top">
                <td className="py-2 pr-2 text-gray-700 whitespace-nowrap">
                  {formatDate(entry.startTime)}
                </td>
                <td className="py-2 pr-2 text-gray-700">{client?.name || '—'}</td>
                <td className="py-2 pr-2 text-gray-900">
                  {project?.title || 'Unknown project'}
                  {projectTask?.title ? (
                    <span className="block text-gray-500 font-normal">{projectTask.title}</span>
                  ) : null}
                </td>
                <td className="py-2 pr-2 text-gray-700">{taskType?.name || '—'}</td>
                {showDescription && (
                  <td className="py-2 pr-2 text-gray-500">{entry.description || ''}</td>
                )}
                <td className="py-2 px-1 text-right tabular-nums text-gray-700">
                  {hours.toFixed(2)}
                </td>
                <td className="py-2 px-1 text-right tabular-nums text-gray-700">
                  {formatCurrency(rate)}
                </td>
                <td className="py-2 pl-1 text-right tabular-nums font-medium text-gray-900">
                  {formatCurrency(amount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
