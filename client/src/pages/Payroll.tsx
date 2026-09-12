import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { InvoiceDetail } from '../components/invoices/InvoiceDetail';
import { invoicesApi } from '../services/api';
import { formatCurrency, formatDate } from '../utils/calculations';
import type { PayoutRecordStatus, SavedInvoice } from '../types';

function Payroll() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [stubs, setStubs] = useState<SavedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [payoutFilter, setPayoutFilter] = useState<'ALL' | PayoutRecordStatus>('ALL');
  const [selected, setSelected] = useState<SavedInvoice | null>(null);

  const loadStubs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: {
        documentKind: 'payroll';
        search?: string;
        payoutStatus?: PayoutRecordStatus;
      } = { documentKind: 'payroll' };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (payoutFilter !== 'ALL') params.payoutStatus = payoutFilter;
      const res = await invoicesApi.getAll(params);
      setStubs(res.data || []);
    } catch (err) {
      console.error('Failed to load pay stubs:', err);
      setError('Failed to load pay stubs');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, payoutFilter]);

  useEffect(() => {
    loadStubs();
  }, [loadStubs]);

  useEffect(() => {
    const createdId = searchParams.get('created');
    if (createdId && stubs.length > 0) {
      const found = stubs.find((s) => s._id === createdId);
      if (found) {
        setSelected(found);
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, stubs, setSearchParams]);

  const handleUpdated = (updated: SavedInvoice) => {
    setStubs((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
    setSelected(updated);
  };

  const handleDeleted = (id: string) => {
    setStubs((prev) => prev.filter((s) => s._id !== id));
    setSelected(null);
  };

  return (
    <>
      <div className="w-full print:hidden">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Payroll</h1>
          <p className="text-gray-500 mt-1">
            Pay stubs from the Reports workbench. Pay outside the app, then mark the stub paid.
          </p>
          <Link
            to="/reports"
            className="inline-block mt-3 text-sm font-medium text-primary-700 hover:text-primary-800"
          >
            Create a stub on Reports →
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stub # or member..."
            className="input text-sm py-1.5 max-w-[240px]"
          />
          {(['ALL', 'UNPAID', 'PAID'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setPayoutFilter(id === 'ALL' ? 'ALL' : id)}
              className={`px-2.5 py-1 rounded-full text-xs ${
                payoutFilter === id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {id === 'ALL' ? 'All' : id === 'UNPAID' ? 'Unpaid' : 'Paid'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          </div>
        ) : stubs.length === 0 ? (
          <div className="card text-center py-12">
            <Wallet className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {searchQuery || payoutFilter !== 'ALL' ? 'No stubs match these filters.' : 'No pay stubs yet.'}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              On Reports: pick a date range (not All Time), check exactly one person in People, Preview, then Save pay stub.
            </p>
            <Link to="/reports" className="inline-block mt-4 text-sm font-medium text-primary-700 hover:text-primary-800">
              Open Reports
            </Link>
          </div>
        ) : (
          <div className="card divide-y divide-gray-100">
            {stubs.map((doc) => (
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
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        doc.payout?.status === 'PAID'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {doc.payout?.status === 'PAID' ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{doc.clientInfo.name}</p>
                  {doc.notes && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{doc.notes}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900">{formatCurrency(doc.total)}</p>
                  <p className="text-xs text-gray-400 tabular-nums">
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

export default Payroll;
