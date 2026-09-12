import { useState, useEffect } from 'react';
import { X, FileText } from 'lucide-react';
import { invoicesApi } from '../../services/api';
import { formatCurrency } from '../../utils/calculations';
import {
  payStubHours,
  payStubItemsFromCostBreakdown,
  payStubTotal,
} from '../../utils/payStub';
import type { Invoice, InvoiceDocumentKind, TimeEntry, LineItem } from '../../types';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  invoice: Invoice;
  filteredEntries: TimeEntry[];
  lineItems: LineItem[];
  /** Reports filter: ensures fixed-price (or other) invoices persist correct projectIds when there are no time entries */
  reportProjectIds?: string[];
  saveKind?: InvoiceDocumentKind;
  payeeName?: string;
  payeeEmail?: string;
  onClose: () => void;
  onCreated: (invoiceId: string) => void;
}

export function CreateInvoiceModal({
  isOpen,
  invoice,
  filteredEntries,
  lineItems,
  reportProjectIds = [],
  saveKind = 'INVOICE',
  payeeName,
  payeeEmail,
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

  const isRetainer = saveKind === 'RETAINER_REPORT';
  const isDataReport = saveKind === 'DATA_REPORT';
  const isPayStub = saveKind === 'PAY_STUB';
  const isLibrary = isRetainer || isDataReport;

  const payStubItems = isPayStub ? payStubItemsFromCostBreakdown(invoice.costBreakdown) : [];
  const payStubAmount = isPayStub ? payStubTotal(payStubItems) : 0;
  const payStubHoursTotal = isPayStub ? payStubHours(payStubItems) : 0;

  const clientId =
    typeof invoice.client?._id === 'string' ? invoice.client._id : '';
  const clientName = isPayStub
    ? (payeeName || 'Team member')
    : invoice.client?.name || (isDataReport ? 'Multiple clients' : 'Unknown Client');
  const dateStart = invoice.dateRange?.start;
  const dateEnd = invoice.dateRange?.end;
  const dateLabel =
    dateStart && dateEnd ? `${dateStart} — ${dateEnd}` : 'All Time';

  const entryProjectIds = [
    ...new Set(
      filteredEntries
        .map((e) => {
          const proj = typeof e.projectId === 'object' ? e.projectId : null;
          return proj?._id;
        })
        .filter(Boolean) as string[]
    ),
  ];
  const projectIds = [
    ...new Set([...reportProjectIds, ...entryProjectIds]),
  ];

  const handleCreate = async () => {
    if (!isDataReport && !isPayStub && !clientId) {
      setError(
        isRetainer
          ? 'A client must be associated with this preview to save a report.'
          : 'A specific client must be selected to create an invoice.'
      );
      return;
    }
    if (isPayStub && !payeeName?.trim()) {
      setError('Select one team member in People to save a pay stub.');
      return;
    }
    if (isPayStub && payStubItems.length === 0) {
      setError('This member has no earned hours in the selected period.');
      return;
    }
    if (!invoiceNumber.trim()) {
      setError('Document number is required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const rangeStart = invoice.dateRange?.start || filteredEntries[0]?.startTime || new Date(0).toISOString();
      const rangeEnd = invoice.dateRange?.end || new Date().toISOString();

      const res = await invoicesApi.create({
        invoiceNumber: invoiceNumber.trim(),
        clientId: isPayStub ? undefined : clientId || undefined,
        projectIds,
        dateRange: { start: rangeStart, end: rangeEnd },
        items: isPayStub ? payStubItems : invoice.items || [],
        subtotal: isPayStub ? payStubAmount : invoice.total,
        total: isPayStub ? payStubAmount : invoice.total,
        totalHours: isPayStub ? payStubHoursTotal : invoice.totalHours,
        totalEarned: isPayStub ? payStubAmount : invoice.totalEarned,
        totalMargin: isPayStub ? 0 : invoice.totalMargin,
        timeEntryIds: filteredEntries.map((e) => e._id),
        lineItemIds: isPayStub ? [] : lineItems.map((li) => li._id),
        notes: notes.trim() || undefined,
        documentKind: saveKind,
        retainerSummary: isRetainer ? invoice.retainerSummary : undefined,
        payeeName: isPayStub ? payeeName : undefined,
        payeeEmail: isPayStub ? payeeEmail : undefined,
      });

      onCreated(res.data._id);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg || 'Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const title = isRetainer
    ? 'Save retainer report'
    : isDataReport
      ? 'Save data report'
      : isPayStub
        ? 'Save pay stub'
        : 'Create Invoice';
  const subtitle = isRetainer
    ? 'Files in the Reports library (no payment link)'
    : isDataReport
      ? 'Snapshot of this slice in the Reports library'
      : isPayStub
        ? 'Earned rates × hours for one member. Files in Payroll.'
        : 'Save as a draft invoice record';
  const submitLabel = saving
    ? 'Saving...'
    : isRetainer
      ? 'Save draft report'
      : isDataReport
        ? 'Save data report'
        : isPayStub
          ? 'Save pay stub'
          : 'Create Draft Invoice';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-500">{subtitle}</p>
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
              <span className="text-gray-500">{isPayStub ? 'Member' : 'Client'}</span>
              <span className="font-medium text-gray-900">{clientName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Date Range</span>
              <span className="text-gray-700">{dateLabel}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Entries</span>
              <span className="text-gray-700">
                {filteredEntries.length} time {filteredEntries.length === 1 ? 'entry' : 'entries'}
                {!isPayStub && lineItems.length > 0 && `, ${lineItems.length} line item${lineItems.length === 1 ? '' : 's'}`}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
              <span className="font-medium text-gray-700">
                {isPayStub ? 'Earned total' : isLibrary ? (isRetainer ? 'Pass-through total' : 'Snapshot total') : 'Total'}
              </span>
              <span className="text-lg font-bold text-gray-900">
                {isPayStub
                  ? formatCurrency(payStubAmount)
                  : isRetainer && invoice.total === 0
                    ? '—'
                    : formatCurrency(invoice.total)}
              </span>
            </div>
            {(isRetainer || isPayStub) && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Hours in period</span>
                <span className="text-gray-700 font-medium tabular-nums">
                  {(isPayStub ? payStubHoursTotal : invoice.totalHours).toFixed(2)} h
                </span>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="create-inv-number" className="block text-sm font-medium text-gray-700 mb-1">
              {isLibrary || isPayStub ? 'Document number' : 'Invoice Number'}
            </label>
            <input
              id="create-inv-number"
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="e.g. 260304-1"
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
              placeholder={
                isPayStub
                  ? 'Internal notes about this pay stub...'
                  : isLibrary
                    ? 'Internal notes about this report...'
                    : 'Internal notes about this invoice...'
              }
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
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
