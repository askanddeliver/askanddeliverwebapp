import type { Invoice, InvoiceLineItem } from '../../types';
import { formatCurrency, formatDate } from '../../utils/calculations';

interface InvoicePreviewProps {
  invoice: Invoice;
}

export function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const timeItems = invoice.items.filter((item) => !item.isFixedCost);
  const fixedItems = invoice.items.filter((item) => item.isFixedCost);

  return (
    <div className="card print:p-0" id="invoice-preview">
      {/* Invoice Header */}
      <div className="flex justify-between items-start mb-4 print:mb-3">
        <div>
          <img
            src="/brand/logo-header.svg"
            alt="Ask+Deliver"
            className="h-8 mb-2 print:h-6 print:mb-1"
          />
          <h2 className="text-xl font-bold text-gray-900 print:text-lg">Invoice</h2>
        </div>
        <div className="text-right">
          {invoice.client && (
            <div>
              <p className="font-bold text-gray-900">
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
            <p className="text-sm text-gray-400 mt-1">
              {formatDate(invoice.dateRange.start)} &mdash;{' '}
              {formatDate(invoice.dateRange.end)}
            </p>
          )}
        </div>
      </div>

      {/* Time-Based Line Items */}
      {timeItems.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-2 font-bold text-gray-600">
                  Task Type
                </th>
                <th className="text-right py-2 font-bold text-gray-600">
                  Base Rate
                </th>
                <th className="text-right py-2 font-bold text-gray-600">
                  Discount
                </th>
                <th className="text-right py-2 font-bold text-gray-600">
                  Effective Rate
                </th>
                <th className="text-right py-2 font-bold text-gray-600">
                  Hours
                </th>
                <th className="text-right py-2 font-bold text-gray-600">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {timeItems.map((item, idx) => (
                <TimeRow key={idx} item={item} />
              ))}
            </tbody>
            {fixedItems.length === 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-300">
                  <td colSpan={4} className="py-3 text-right font-bold text-gray-600">
                    Total
                  </td>
                  <td className="py-3 text-right font-bold text-gray-700">
                    {invoice.totalHours.toFixed(2)}
                  </td>
                  <td className="py-3 text-right text-lg font-bold text-gray-900">
                    {formatCurrency(invoice.total)}
                  </td>
                </tr>
              </tfoot>
            )}
            {fixedItems.length > 0 && (
              <tfoot>
                <tr className="border-t border-gray-200">
                  <td colSpan={4} className="py-2 text-right text-sm font-medium text-gray-500">
                    Services Subtotal
                  </td>
                  <td className="py-2 text-right text-sm font-medium text-gray-600">
                    {invoice.totalHours.toFixed(2)}
                  </td>
                  <td className="py-2 text-right font-bold text-gray-800">
                    {formatCurrency(
                      timeItems.reduce((sum, item) => sum + item.amount, 0)
                    )}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* Fixed-Cost Line Items */}
      {fixedItems.length > 0 && (
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-2 font-bold text-gray-600">
                  Additional Charges
                </th>
                <th className="text-right py-2 font-bold text-gray-600">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {fixedItems.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-gray-400" />
                      <span className="font-medium text-gray-900">
                        {item.descriptions[0] || item.taskTypeName}
                      </span>
                      {item.taskTypeName !== 'Fixed Cost' && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                          {item.taskTypeName}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-right py-2 font-bold text-gray-900">
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300">
                <td className="py-3 text-right font-bold text-gray-600">
                  Invoice Total
                </td>
                <td className="py-3 text-right text-lg font-bold text-gray-900">
                  {formatCurrency(invoice.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Summary */}
      <div className="mt-4 pt-3 border-t border-gray-100 text-sm text-gray-500 print:mt-2 print:pt-2">
        <p>
          {invoice.entryCount} time{' '}
          {invoice.entryCount === 1 ? 'entry' : 'entries'}
          {invoice.lineItemCount ? ` | ${invoice.lineItemCount} additional charge${invoice.lineItemCount === 1 ? '' : 's'}` : ''}
          {' '}| {invoice.totalHours.toFixed(2)} total hours
        </p>
      </div>
    </div>
  );
}

function TimeRow({ item }: { item: InvoiceLineItem }) {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-2">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: item.taskTypeColor }}
          />
          <span className="font-medium text-gray-900">
            {item.taskTypeName}
          </span>
        </div>
      </td>
      <td className="text-right py-2 text-gray-600">
        {formatCurrency(item.baseRate)}/hr
      </td>
      <td className="text-right py-2">
        {item.discount > 0 ? (
          <span className="text-purple-600 font-medium">
            {item.discount}%
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="text-right py-2 font-medium text-green-600">
        {formatCurrency(item.effectiveRate)}/hr
      </td>
      <td className="text-right py-2 text-gray-700">
        {item.hours.toFixed(2)}
      </td>
      <td className="text-right py-2 font-bold text-gray-900">
        {formatCurrency(item.amount)}
      </td>
    </tr>
  );
}
