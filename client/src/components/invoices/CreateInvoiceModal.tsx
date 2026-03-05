import { useState, useEffect } from 'react';
import { X, FileText } from 'lucide-react';
import { invoicesApi } from '../../services/api';
import { formatCurrency } from '../../utils/calculations';
import type { Invoice, TimeEntry, LineItem } from '../../types';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  invoice: Invoice;
  filteredEntries: TimeEntry[];
  lineItems: LineItem[];
  onClose: () => void;
  onCreated: (invoiceId: string) => void;
}

export function CreateInvoiceModal({
  isOpen,
  invoice,
  filteredEntries,
  lineItems,
  onClose,
  onCreated,
}: CreateInvoiceModalProps) {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setNotes('');
      invoicesApi.getNextNumber().then((res) => {
        setInvoiceNumber(res.data.invoiceNumber);
      }).catch(() => {
        setInvoiceNumber('');
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const clientId =
    typeof invoice.client?._id === 'string' ? invoice.client._id : '';
  const clientName = invoice.client?.name || 'Unknown Client';

  const projectIds = [...new Set(
    filteredEntries
      .map((e) => {
        const proj = typeof e.projectId === 'object' ? e.projectId : null;
        return proj?._id;
      })
      .filter(Boolean) as string[]
  )];

  const handleCreate = async () => {
    if (!clientId) {
      setError('A specific client must be selected to create an invoice.');
      return;
    }
    if (!invoiceNumber.trim()) {
      setError('Invoice number is required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const res = await invoicesApi.create({
        invoiceNumber: invoiceNumber.trim(),
        clientId,
        projectIds,
        dateRange: invoice.dateRange,
        items: invoice.items,
        subtotal: invoice.total,
        total: invoice.total,
        totalHours: invoice.totalHours,
        totalEarned: invoice.totalEarned,
        totalMargin: invoice.totalMargin,
        timeEntryIds: filteredEntries.map((e) => e._id),
        lineItemIds: lineItems.map((li) => li._id),
        notes: notes.trim() || undefined,
      });

      onCreated(res.data._id);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg || 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Create Invoice</h2>
              <p className="text-sm text-gray-500">Save as a draft invoice record</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Client</span>
              <span className="font-medium text-gray-900">{clientName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Date Range</span>
              <span className="text-gray-700">
                {invoice.dateRange.start} &mdash; {invoice.dateRange.end}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Entries</span>
              <span className="text-gray-700">
                {filteredEntries.length} time {filteredEntries.length === 1 ? 'entry' : 'entries'}
                {lineItems.length > 0 && `, ${lineItems.length} line item${lineItems.length === 1 ? '' : 's'}`}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
              <span className="font-medium text-gray-700">Total</span>
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(invoice.total)}
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="create-inv-number" className="block text-sm font-medium text-gray-700 mb-1">
              Invoice Number
            </label>
            <input
              id="create-inv-number"
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="e.g. INV-2026-001"
              className="input"
            />
          </div>

          <div>
            <label htmlFor="create-inv-notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="create-inv-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Internal notes about this invoice..."
              className="input resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !invoiceNumber.trim()}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Draft Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}
