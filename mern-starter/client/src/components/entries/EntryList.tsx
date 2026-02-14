import { Clock } from 'lucide-react';
import type { TimeEntry } from '../../types';
import { EntryRow } from './EntryRow';

interface EntryListProps {
  entries: TimeEntry[];
  onEdit: (entry: TimeEntry) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

export function EntryList({
  entries,
  onEdit,
  onDelete,
  loading,
}: EntryListProps) {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-gray-500 text-sm">Loading entries...</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-500 mb-2">
          No time entries
        </h3>
        <p className="text-gray-400">
          Start a timer or add a manual entry to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {entries.map((entry) => (
        <EntryRow
          key={entry._id}
          entry={entry}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
