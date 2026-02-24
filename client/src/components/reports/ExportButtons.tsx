import { useState } from 'react';
import { Download, Printer, Database } from 'lucide-react';
import { exportApi } from '../../services/api';
interface ExportButtonsProps {
  clientId?: string;
  projectId?: string;
  projectIds?: string[];
  startDate?: string;
  endDate?: string;
  disabled?: boolean;
}

export function ExportButtons({
  clientId,
  projectId,
  projectIds,
  startDate,
  endDate,
  disabled,
}: ExportButtonsProps) {
  const [backupLoading, setBackupLoading] = useState(false);

  const handleBackupExport = async () => {
    try {
      setBackupLoading(true);
      const response = await exportApi.backup();

      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `askanddeliver-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export backup:', error);
      alert('Failed to export backup. Please try again.');
    } finally {
      setBackupLoading(false);
    }
  };
  const handleCsvExport = async () => {
    try {
      const response = await exportApi.csv({
        clientId: clientId || undefined,
        projectId: (projectIds?.length ? undefined : projectId) || undefined,
        projectIds: projectIds?.length ? projectIds : undefined,
        startDate,
        endDate,
      });

      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `timesheet-${startDate}-${endDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Failed to export CSV. Please try again.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex gap-3">
      <button
        onClick={handleCsvExport}
        disabled={disabled}
        className="btn-secondary flex items-center gap-2 disabled:opacity-50"
      >
        <Download className="w-4 h-4" />
        Export CSV
      </button>
      <button
        onClick={handlePrint}
        disabled={disabled}
        className="btn-secondary flex items-center gap-2 disabled:opacity-50"
      >
        <Printer className="w-4 h-4" />
        Print / PDF
      </button>
      <button
        onClick={handleBackupExport}
        disabled={backupLoading}
        className="btn-secondary flex items-center gap-2 disabled:opacity-50"
        title="Export all clients, projects, task types, entries, and line items as JSON"
      >
        {backupLoading ? (
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Database className="w-4 h-4" />
        )}
        Backup Data
      </button>
    </div>
  );
}
