import type { Invoice } from '../../types';
import { formatCurrency, formatDate } from '../../utils/calculations';

interface InvoicePreviewProps {
  invoice: Invoice;
}

export function InvoicePreview({ invoice }: InvoicePreviewProps) {
  return (
    <div className="card" id="invoice-preview">
      {/* Invoice Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Invoice</h2>
          <p className="text-gray-500 mt-1">Ask and Deliver</p>
        </div>
        <div className="text-right">
          {invoice.client && (
            <div>
              <p className="font-semibold text-gray-900">
                {invoice.client.name}
              </p>
              {invoice.client.company && (
                <p className="text-sm text-gray-500">
                  {invoice.client.company}
                </p>
              )}
              {invoice.client.email && (
                <p className="text-sm text-gray-500">{invoice.client.email}</p>
              )}
            </div>
          )}
          {invoice.dateRange && (
            <p className="text-sm text-gray-400 mt-2">
              {formatDate(invoice.dateRange.start)} &mdash;{' '}
              {formatDate(invoice.dateRange.end)}
            </p>
          )}
        </div>
      </div>

      {/* Line Items Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 font-semibold text-gray-600">
                Task Type
              </th>
              <th className="text-right py-3 font-semibold text-gray-600">
                Base Rate
              </th>
              <th className="text-right py-3 font-semibold text-gray-600">
                Discount
              </th>
              <th className="text-right py-3 font-semibold text-gray-600">
                Effective Rate
              </th>
              <th className="text-right py-3 font-semibold text-gray-600">
                Hours
              </th>
              <th className="text-right py-3 font-semibold text-gray-600">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-100">
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.taskTypeColor }}
                    />
                    <span className="font-medium text-gray-900">
                      {item.taskTypeName}
                    </span>
                  </div>
                  {item.descriptions.length > 0 && (
                    <div className="text-xs text-gray-400 mt-1 ml-[18px]">
                      {item.descriptions.slice(0, 3).join(', ')}
                      {item.descriptions.length > 3 &&
                        ` +${item.descriptions.length - 3} more`}
                    </div>
                  )}
                </td>
                <td className="text-right py-3 text-gray-600">
                  {formatCurrency(item.baseRate)}/hr
                </td>
                <td className="text-right py-3">
                  {item.discount > 0 ? (
                    <span className="text-purple-600 font-medium">
                      {item.discount}%
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="text-right py-3 font-medium text-green-600">
                  {formatCurrency(item.effectiveRate)}/hr
                </td>
                <td className="text-right py-3 text-gray-700">
                  {item.hours.toFixed(2)}
                </td>
                <td className="text-right py-3 font-semibold text-gray-900">
                  {formatCurrency(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300">
              <td colSpan={4} className="py-4 text-right font-semibold text-gray-600">
                Total
              </td>
              <td className="py-4 text-right font-bold text-gray-700">
                {invoice.totalHours.toFixed(2)}
              </td>
              <td className="py-4 text-right text-xl font-bold text-gray-900">
                {formatCurrency(invoice.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-100 text-sm text-gray-500">
        <p>
          {invoice.entryCount} time{' '}
          {invoice.entryCount === 1 ? 'entry' : 'entries'} |{' '}
          {invoice.totalHours.toFixed(2)} total hours
        </p>
      </div>
    </div>
  );
}
