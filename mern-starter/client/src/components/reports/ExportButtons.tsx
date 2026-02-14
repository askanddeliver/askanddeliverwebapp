import { Download, Printer } from 'lucide-react';
import { exportApi } from '../../services/api';

interface ExportButtonsProps {
  clientId?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
  disabled?: boolean;
}

export function ExportButtons({
  clientId,
  projectId,
  startDate,
  endDate,
  disabled,
}: ExportButtonsProps) {
  const handleCsvExport = async () => {
    try {
      const response = await exportApi.csv({
        clientId: clientId || undefined,
        projectId: projectId || undefined,
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
    </div>
  );
}
