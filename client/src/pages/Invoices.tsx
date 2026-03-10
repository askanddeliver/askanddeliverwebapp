import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, DollarSign, Send, Clock } from 'lucide-react';
import { InvoiceStatusBadge } from '../components/invoices/InvoiceStatusBadge';
import { InvoiceDetail } from '../components/invoices/InvoiceDetail';
import { invoicesApi, clientsApi } from '../services/api';
import { formatCurrency, formatDate } from '../utils/calculations';
import type { SavedInvoice, InvoiceStatus, InvoiceStats, Client } from '../types';

type TabFilter = 'ALL' | InvoiceStatus;

function Invoices() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<SavedInvoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<TabFilter>('ALL');
  const [clientFilter, setClientFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedInvoice, setSelectedInvoice] = useState<SavedInvoice | null>(null);

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string> = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (clientFilter) params.clientId = clientFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [invoicesRes, statsRes] = await Promise.all([
        invoicesApi.getAll(params as Parameters<typeof invoicesApi.getAll>[0]),
        invoicesApi.getStats(),
      ]);

      setInvoices(invoicesRes.data || []);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load invoices:', err);
      setError('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, clientFilter, searchQuery]);

  useEffect(() => {
    clientsApi.getAll().then((res) => setClients(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // Handle navigation from Reports page after creating an invoice
  useEffect(() => {
    const createdId = searchParams.get('created');
    if (createdId && invoices.length > 0) {
      const inv = invoices.find((i) => i._id === createdId);
      if (inv) {
        setSelectedInvoice(inv);
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, invoices, setSearchParams]);

  const handleUpdated = (updated: SavedInvoice) => {
    setInvoices((prev) => prev.map((i) => (i._id === updated._id ? updated : i)));
    setSelectedInvoice(updated);
    invoicesApi.getStats().then((res) => setStats(res.data)).catch(() => {});
  };

  const handleDeleted = (id: string) => {
    setInvoices((prev) => prev.filter((i) => i._id !== id));
    setSelectedInvoice(null);
    invoicesApi.getStats().then((res) => setStats(res.data)).catch(() => {});
  };

  const tabs: { id: TabFilter; label: string; count?: number }[] = [
    { id: 'ALL', label: 'All', count: invoices.length },
    { id: 'DRAFT', label: 'Draft', count: stats?.draft.count },
    { id: 'SENT', label: 'Sent', count: stats?.sent.count },
    { id: 'PAID', label: 'Paid', count: stats?.paid.count },
  ];

  return (
    <div className="max-w-5xl mx-auto print:hidden">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
        <p className="text-gray-500 mt-1">
          Manage invoice records, track payment status, and view history
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Drafts</p>
              <p className="text-xl font-bold text-gray-700">{stats.draft.count}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Send className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Outstanding</p>
              <p className="text-xl font-bold text-amber-700">
                {formatCurrency(stats.sent.total)}
              </p>
              <p className="text-xs text-gray-400">{stats.sent.count} invoice{stats.sent.count !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Collected</p>
              <p className="text-xl font-bold text-green-700">
                {formatCurrency(stats.paid.total)}
              </p>
              <p className="text-xs text-gray-400">{stats.paid.count} invoice{stats.paid.count !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
              {tab.count != null && (
                <span className="ml-1.5 text-xs text-gray-400">({tab.count})</span>
              )}
            </button>
          ))}
        </div>

        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="input text-sm py-1.5 max-w-[200px]"
        >
          <option value="">All Clients</option>
          {clients.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search invoice #..."
          className="input text-sm py-1.5 max-w-[200px]"
        />
      </div>

      {/* Invoice List */}
      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        </div>
      ) : invoices.length === 0 ? (
        <div className="card text-center py-12">
          <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No invoices found.</p>
          <p className="text-gray-400 text-sm mt-1">
            Create invoices from the Reports page.
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-100">
          {invoices.map((inv) => (
            <button
              key={inv._id}
              onClick={() => setSelectedInvoice(inv)}
              className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-gray-900 text-sm">
                    {inv.invoiceNumber}
                  </span>
                  <InvoiceStatusBadge status={inv.status} />
                </div>
                <p className="text-sm text-gray-600 truncate">
                  {inv.clientInfo.name}
                </p>
                {inv.notes && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {inv.notes}
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-gray-900">{formatCurrency(inv.total)}</p>
                <p className="text-xs text-gray-400">
                  {formatDate(inv.dateRange.start)} &ndash; {formatDate(inv.dateRange.end)}
                </p>
              </div>
              <div className="text-xs text-gray-400 flex-shrink-0 w-20 text-right">
                {formatDate(inv.createdAt)}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <InvoiceDetail
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}

export default Invoices;
