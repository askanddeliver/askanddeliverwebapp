import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Archive } from 'lucide-react';
import { InvoiceDetail } from '../components/invoices/InvoiceDetail';
import { invoicesApi, reportsApi } from '../services/api';
import { formatDate } from '../utils/calculations';
import type { InvoiceDocumentKind, SavedInvoice, UnfiledRetainerHoursRow } from '../types';

type KindFilter = 'ALL' | 'RETAINER_REPORT' | 'DATA_REPORT' | 'BUDGET_REPORT';

function documentKindLabel(kind?: InvoiceDocumentKind): string {
  switch (kind) {
    case 'RETAINER_REPORT':
      return 'Utilization';
    case 'DATA_REPORT':
      return 'Data report';
    case 'BUDGET_REPORT':
      return 'Budget report';
    default:
      return 'Report';
  }
}

function SavedReports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [reports, setReports] = useState<SavedInvoice[]>([]);
  const [unfiled, setUnfiled] = useState<UnfiledRetainerHoursRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [kindFilter, setKindFilter] = useState<KindFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<SavedInvoice | null>(null);

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: {
        documentKind: InvoiceDocumentKind | 'library';
        search?: string;
      } = {
        documentKind: kindFilter === 'ALL' ? 'library' : kindFilter,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const listRes = await invoicesApi.getAll(params);
      setReports(listRes.data || []);
    } catch (err) {
      console.error('Failed to load saved reports:', err);
      setError('Failed to load saved reports');
    } finally {
      setLoading(false);
    }
  }, [kindFilter, searchQuery]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    reportsApi
      .getUnfiledRetainerHours()
      .then((res) => setUnfiled(res.data || []))
      .catch(() => setUnfiled([]));
  }, []);

  useEffect(() => {
    const createdId = searchParams.get('created');
    if (createdId && reports.length > 0) {
      const found = reports.find((r) => r._id === createdId);
      if (found) {
        setSelected(found);
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, reports, setSearchParams]);

  const handleUpdated = (updated: SavedInvoice) => {
    setReports((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
    setSelected(updated);
  };

  const handleDeleted = (id: string) => {
    setReports((prev) => prev.filter((r) => r._id !== id));
    setSelected(null);
    reportsApi.getUnfiledRetainerHours().then((res) => setUnfiled(res.data || [])).catch(() => {});
  };

  const tabs: { id: KindFilter; label: string }[] = [
    { id: 'ALL', label: 'All' },
    { id: 'RETAINER_REPORT', label: 'Utilization' },
    { id: 'DATA_REPORT', label: 'Data' },
    { id: 'BUDGET_REPORT', label: 'Budget' },
  ];

  return (
    <>
      <div className="w-full print:hidden">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Saved reports</h1>
          <p className="text-gray-500 mt-1">
            Utilization, data, and budget snapshots from the Reports workbench. Payable invoices stay on Invoices.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {unfiled.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 mb-6">
            <p className="font-medium">Retainer hours not yet on a utilization report</p>
            <ul className="mt-2 space-y-1">
              {unfiled.map((row) => (
                <li key={row.projectId}>
                  {row.clientName ? `${row.clientName} · ` : ''}
                  {row.title}: {row.unfiledHours.toFixed(2)} h
                  {row.unfiledEntryCount === 1 ? ' (1 entry)' : ` (${row.unfiledEntryCount} entries)`}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setKindFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  kindFilter === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search document #..."
            className="input text-sm py-1.5 max-w-[200px]"
          />
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          </div>
        ) : reports.length === 0 ? (
          <div className="card text-center py-12">
            <Archive className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No saved reports yet.</p>
            <p className="text-gray-400 text-sm mt-1">
              Save a retainer or data report from the Reports workbench.
            </p>
          </div>
        ) : (
          <div className="card divide-y divide-gray-100">
            {reports.map((doc) => (
              <button
                key={doc._id}
                onClick={() => setSelected(doc)}
                className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-gray-900 text-sm">
                      {doc.invoiceNumber}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {documentKindLabel(doc.documentKind)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {doc.clientInfo.name}
                  </p>
                  {doc.notes && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {doc.notes}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900 tabular-nums">
                    {doc.totalHours.toFixed(2)} h
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDate(doc.dateRange.start)} &ndash; {formatDate(doc.dateRange.end)}
                  </p>
                </div>
                <div className="text-xs text-gray-400 flex-shrink-0 w-20 text-right">
                  {formatDate(doc.createdAt)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <InvoiceDetail
          invoice={selected}
          libraryMode
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}

export default SavedReports;
