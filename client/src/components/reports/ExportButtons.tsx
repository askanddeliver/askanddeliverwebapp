import { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { exportApi } from '../../services/api';
import { toUTCStartOfDay, toUTCEndOfDay } from '../../utils/calculations';
interface ExportButtonsProps {
  clientId?: string;
  clientIds?: string[];
  projectId?: string;
  projectIds?: string[];
  startDate?: string;
  endDate?: string;
  billingModes?: string[];
  memberAuth0Ids?: string[];
  columns?: string[];
  includeEntryDescriptions?: boolean;
  disabled?: boolean;
  csvDisabled?: boolean;
  printDisabled?: boolean;
}

export function ExportButtons({
  clientId,
  clientIds,
  projectId,
  projectIds,
  startDate,
  endDate,
  billingModes,
  memberAuth0Ids,
  columns,
  includeEntryDescriptions,
  disabled,
  csvDisabled,
  printDisabled,
}: ExportButtonsProps) {
  const handleCsvExport = async () => {
    try {
      const response = await exportApi.csv({
        clientId: clientId || undefined,
        clientIds: clientIds?.length ? clientIds : undefined,
        projectId: (projectIds?.length ? undefined : projectId) || undefined,
        projectIds: projectIds?.length ? projectIds : undefined,
        startDate: startDate ? toUTCStartOfDay(startDate) : undefined,
        endDate: endDate ? toUTCEndOfDay(endDate) : undefined,
        billingModes: billingModes?.length ? billingModes : undefined,
        memberAuth0Ids: memberAuth0Ids?.length ? memberAuth0Ids : undefined,
        columns: columns?.length ? columns : undefined,
        includeEntryDescriptions,
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = startDate && endDate
        ? `timesheet-${startDate}-${endDate}.csv`
        : 'timesheet-all-time.csv';
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
        disabled={disabled || csvDisabled}
        className="btn-secondary flex items-center gap-2 disabled:opacity-50"
      >
        <Download className="w-4 h-4" />
        Export CSV
      </button>
      <button
        onClick={handlePrint}
        disabled={disabled || printDisabled}
        className="btn-secondary flex items-center gap-2 disabled:opacity-50"
      >
        <Printer className="w-4 h-4" />
        Print / PDF
      </button>
    </div>
  );
}
