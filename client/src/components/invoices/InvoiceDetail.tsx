import { useState, useEffect } from 'react';
import { X, Printer, Send, CheckCircle, RotateCcw, Trash2, Edit3, ChevronDown, ChevronUp } from 'lucide-react';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { InvoicePreview } from '../reports/InvoicePreview';
import { EntryRow } from '../entries/EntryRow';
import { invoicesApi, timeEntriesApi } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/calculations';
import type { SavedInvoice, Invoice, InvoiceStatus, TimeEntry } from '../../types';

interface InvoiceDetailProps {
  invoice: SavedInvoice;
  onClose: () => void;
  onUpdated: (invoice: SavedInvoice) => void;
  onDeleted: (id: string) => void;
}

export function InvoiceDetail({ invoice, onClose, onUpdated, onDeleted }: InvoiceDetailProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingNumber, setEditingNumber] = useState(false);
  const [editNumber, setEditNumber] = useState(invoice.invoiceNumber);
  const [editingNotes, setEditingNotes] = useState(false);
  const [editNotes, setEditNotes] = useState(invoice.notes || '');
  const [showEntryIds, setShowEntryIds] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRevert, setConfirmRevert] = useState<InvoiceStatus | null>(null);

  // Time entries for PDF
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [includeTimeEntries, setIncludeTimeEntries] = useState(true);
  const [includeDescriptions, setIncludeDescriptions] = useState(false);

  useEffect(() => {
    if (invoice.timeEntryIds.length > 0) {
      setLoadingEntries(true);
      timeEntriesApi
        .getByIds(invoice.timeEntryIds)
        .then((res) => setEntries(res.data || []))
        .catch((err) => console.error('Failed to load entries:', err))
        .finally(() => setLoadingEntries(false));
    }
  }, [invoice.timeEntryIds]);

  const handleStatusChange = async (newStatus: InvoiceStatus) => {
    try {
      setLoading(true);
      setError(null);
      const res = await invoicesApi.updateStatus(invoice._id, newStatus);
      onUpdated(res.data);
      setConfirmRevert(null);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveField = async (field: 'invoiceNumber' | 'notes', value: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await invoicesApi.update(invoice._id, { [field]: value });
      onUpdated(res.data);
      if (field === 'invoiceNumber') setEditingNumber(false);
      if (field === 'notes') setEditingNotes(false);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg || 'Failed to update invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      setError(null);
      await invoicesApi.delete(invoice._id);
      onDeleted(invoice._id);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg || 'Failed to delete invoice');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const previewInvoice: Invoice = {
    invoiceNumber: invoice.invoiceNumber,
    client: {
      _id: typeof invoice.clientId === 'object' ? invoice.clientId._id : invoice.clientId,
      name: invoice.clientInfo.name,
      company: invoice.clientInfo.company,
      email: invoice.clientInfo.email,
      businessEntity: invoice.clientInfo.businessEntity,
      address: invoice.clientInfo.address,
      paymentPreference: invoice.clientInfo.paymentPreference as 'MAILED' | 'ACH' | undefined,
      taskDiscounts: {},
      createdAt: '',
      updatedAt: '',
    },
    companyInfo: invoice.companyInfo,
    items: invoice.items,
    total: invoice.total,
    totalHours: invoice.totalHours,
    totalEarned: invoice.totalEarned,
    totalMargin: invoice.totalMargin,
    entryCount: invoice.timeEntryIds.length,
    lineItemCount: invoice.lineItemIds.length,
    dateRange: invoice.dateRange,
  };

  return (
    <>
      {/* ── Screen-only modal ── */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto print:hidden">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl my-8">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div>
                {editingNumber && invoice.status === 'DRAFT' ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editNumber}
                      onChange={(e) => setEditNumber(e.target.value)}
                      className="input text-lg font-bold py-1"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveField('invoiceNumber', editNumber)}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                      disabled={loading}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setEditingNumber(false); setEditNumber(invoice.invoiceNumber); }}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900">{invoice.invoiceNumber}</h2>
                    {invoice.status === 'DRAFT' && (
                      <button
                        onClick={() => setEditingNumber(true)}
                        className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
                <p className="text-sm text-gray-500">
                  {invoice.clientInfo.name} &middot; Created {formatDate(invoice.createdAt)}
                </p>
              </div>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Status actions */}
          <div className="px-6 py-4 flex flex-wrap items-center gap-3 border-b border-gray-100">
            <button
              onClick={handlePrint}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Printer className="w-4 h-4" />
              Print / PDF
            </button>

            {invoice.status === 'DRAFT' && (
              <>
                <button
                  onClick={() => handleStatusChange('SENT')}
                  disabled={loading}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  <Send className="w-4 h-4" />
                  Mark as Sent
                </button>
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="btn-secondary text-red-600 hover:text-red-700 flex items-center gap-2 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-red-600">Delete this draft?</span>
                    <button
                      onClick={handleDelete}
                      disabled={loading}
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Yes, delete
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </>
            )}

            {invoice.status === 'SENT' && (
              <>
                <button
                  onClick={() => handleStatusChange('PAID')}
                  disabled={loading}
                  className="btn-primary flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark as Paid
                </button>
                {confirmRevert !== 'DRAFT' ? (
                  <button
                    onClick={() => setConfirmRevert('DRAFT')}
                    className="btn-secondary flex items-center gap-2 text-sm"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Revert to Draft
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-amber-600">Revert to draft? Entries will be unlinked.</span>
                    <button
                      onClick={() => handleStatusChange('DRAFT')}
                      disabled={loading}
                      className="text-sm font-medium text-amber-600 hover:text-amber-700"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmRevert(null)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </>
            )}

            {invoice.status === 'PAID' && (
              <>
                {confirmRevert !== 'SENT' ? (
                  <button
                    onClick={() => setConfirmRevert('SENT')}
                    className="btn-secondary flex items-center gap-2 text-sm"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Revert to Sent
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-amber-600">Revert to sent? Entries will return to active views.</span>
                    <button
                      onClick={() => handleStatusChange('SENT')}
                      disabled={loading}
                      className="text-sm font-medium text-amber-600 hover:text-amber-700"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmRevert(null)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </>
            )}

            <div className="ml-auto text-xs text-gray-400 text-right space-y-0.5">
              {invoice.sentAt && <p>Sent {formatDate(invoice.sentAt)}</p>}
              {invoice.paidAt && <p>Paid {formatDate(invoice.paidAt)}</p>}
            </div>
          </div>

          {/* Invoice content */}
          <div className="p-6">
            {/* Notes */}
            <div className="mb-4">
              {editingNotes && invoice.status === 'DRAFT' ? (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={2}
                    className="input resize-none text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveField('notes', editNotes)}
                      disabled={loading}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setEditingNotes(false); setEditNotes(invoice.notes || ''); }}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : invoice.notes ? (
                <div className="flex items-start gap-2">
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 flex-1">
                    {invoice.notes}
                  </p>
                  {invoice.status === 'DRAFT' && (
                    <button
                      onClick={() => setEditingNotes(true)}
                      className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex-shrink-0"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : invoice.status === 'DRAFT' ? (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="text-sm text-gray-400 hover:text-gray-600"
                >
                  + Add notes
                </button>
              ) : null}
            </div>

            {/* Financials summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(invoice.total)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500">Hours</p>
                <p className="text-lg font-bold text-gray-700">{invoice.totalHours.toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500">Entries</p>
                <p className="text-lg font-bold text-gray-700">{invoice.timeEntryIds.length}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500">Date Range</p>
                <p className="text-sm font-medium text-gray-700">
                  {formatDate(invoice.dateRange.start)} &ndash; {formatDate(invoice.dateRange.end)}
                </p>
              </div>
            </div>

            {/* PDF options */}
            {entries.length > 0 && (
              <div className="flex flex-wrap items-center gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">PDF options:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTimeEntries}
                    onChange={(e) => setIncludeTimeEntries(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Include time entries</span>
                </label>
                <label className={`flex items-center gap-2 cursor-pointer ${!includeTimeEntries ? 'opacity-50' : ''}`}>
                  <input
                    type="checkbox"
                    checked={includeDescriptions}
                    onChange={(e) => setIncludeDescriptions(e.target.checked)}
                    disabled={!includeTimeEntries}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Include descriptions</span>
                </label>
                {loadingEntries && (
                  <span className="text-xs text-gray-400">Loading entries...</span>
                )}
              </div>
            )}

            {/* Invoice Preview */}
            <InvoicePreview invoice={previewInvoice} />

            {/* Linked entry IDs */}
            {(invoice.timeEntryIds.length > 0 || invoice.lineItemIds.length > 0) && (
              <div className="mt-4">
                <button
                  onClick={() => setShowEntryIds(!showEntryIds)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                >
                  {showEntryIds ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {invoice.timeEntryIds.length} linked entries, {invoice.lineItemIds.length} linked line items
                </button>
                {showEntryIds && (
                  <div className="mt-2 bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1.5 max-h-48 overflow-y-auto">
                    {invoice.timeEntryIds.length > 0 && (
                      <div>
                        <p className="font-medium text-gray-600 mb-1">Time Entry IDs</p>
                        <p className="font-mono break-all leading-relaxed">
                          {invoice.timeEntryIds.join(', ')}
                        </p>
                      </div>
                    )}
                    {invoice.lineItemIds.length > 0 && (
                      <div>
                        <p className="font-medium text-gray-600 mb-1">Line Item IDs</p>
                        <p className="font-mono break-all leading-relaxed">
                          {invoice.lineItemIds.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Print-only view (rendered outside the modal) ── */}
      <div className="hidden print:block print:overflow-visible print:bg-white">
        <InvoicePreview invoice={previewInvoice} />

        {includeTimeEntries && entries.length > 0 && (
          <div className="mt-6 print:break-before-page">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Time Entries ({entries.length})
            </h3>
            <div className="divide-y divide-gray-100">
              {entries.map((entry) => (
                <EntryRow
                  key={entry._id}
                  entry={entry}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  showAmount={true}
                  showDescription={includeDescriptions}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
