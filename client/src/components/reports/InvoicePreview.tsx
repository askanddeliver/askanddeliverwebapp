import type { Invoice, InvoiceLineItem } from '../../types';
import { formatCurrency, formatDate } from '../../utils/calculations';

interface InvoicePreviewProps {
  invoice: Invoice;
}

export function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const timeItems = invoice.items.filter((item) => !item.isFixedCost);
  const fixedItems = invoice.items.filter((item) => item.isFixedCost);
  const showCostMargin = invoice.totalEarned != null && invoice.totalMargin != null;
  const { companyInfo } = invoice;

  return (
    <div className="card print:p-0 print:overflow-visible" id="invoice-preview">
      {/* Invoice Header: Company (left) + Client (right) */}
      <div className="flex justify-between items-start gap-6 mb-6 print:mb-4">
        <div className="flex-1 min-w-0">
          <img
            src="/brand/logo-header.svg"
            alt="Ask+Deliver"
            className="h-8 mb-3 print:h-6 print:mb-2"
          />
          <h2 className="text-xl font-bold text-gray-900 print:text-lg">Invoice</h2>
          {/* Company info for client payments */}
          {(companyInfo?.name || companyInfo?.address || companyInfo?.phone || companyInfo?.email) && (
            <div className="mt-3 text-sm text-gray-600 print:mt-2 print:text-xs space-y-0.5">
              {companyInfo.name && <p className="font-medium text-gray-900">{companyInfo.name}</p>}
              {companyInfo.address && (
                <p className="whitespace-pre-line">{companyInfo.address}</p>
              )}
              {companyInfo.phone && <p>{companyInfo.phone}</p>}
              {companyInfo.email && <p>{companyInfo.email}</p>}
            </div>
          )}
        </div>
        <div className="text-right flex-1 min-w-0">
          {invoice.client && (
            <div className="text-sm">
              <p className="font-bold text-gray-900 text-base">
                {invoice.client.businessEntity || invoice.client.name}
              </p>
              {invoice.client.businessEntity && invoice.client.name !== invoice.client.businessEntity && (
                <p className="text-gray-600 mt-0.5">{invoice.client.name}</p>
              )}
              {invoice.client.company && (
                <p className="text-gray-500">{invoice.client.company}</p>
              )}
              {invoice.client.address && (
                <p className="text-gray-600 mt-1 whitespace-pre-line">{invoice.client.address}</p>
              )}
              {invoice.client.email && (
                <p className="text-gray-500 mt-0.5">{invoice.client.email}</p>
              )}
            </div>
          )}
          {invoice.dateRange && (
            <p className="text-sm text-gray-500 mt-2">
              {formatDate(invoice.dateRange.start)} &mdash; {formatDate(invoice.dateRange.end)}
            </p>
          )}
        </div>
      </div>

      {/* Total Costing Summary - Focused summary at top */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 print:mb-2">
          Summary
        </h3>
        {timeItems.length > 0 && (
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 font-bold text-gray-600">Task Type</th>
                  <th className="text-right py-2 font-bold text-gray-600">Base Rate</th>
                  <th className="text-right py-2 font-bold text-gray-600">Discount</th>
                  <th className="text-right py-2 font-bold text-gray-600">Effective Rate</th>
                  <th className="text-right py-2 font-bold text-gray-600">Hours</th>
                  <th className="text-right py-2 font-bold text-gray-600">Amount</th>
                  {showCostMargin && (
                    <>
                      <th className="text-right py-2 font-bold text-gray-600 print:hidden">Earned</th>
                      <th className="text-right py-2 font-bold text-gray-600 print:hidden">Margin</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {timeItems.map((item, idx) => (
                  <TimeRow key={idx} item={item} showCostMargin={showCostMargin} />
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
                    {showCostMargin && (
                      <>
                        <td className="py-3 text-right font-bold text-gray-700 print:hidden">
                          {formatCurrency(invoice.totalEarned ?? 0)}
                        </td>
                        <td className="py-3 text-right font-bold text-green-600 print:hidden">
                          {formatCurrency(invoice.totalMargin ?? 0)}
                        </td>
                      </>
                    )}
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
                    {showCostMargin && (
                      <>
                        <td className="py-2 text-right font-bold text-gray-700 print:hidden">
                          {formatCurrency(invoice.totalEarned ?? 0)}
                        </td>
                        <td className="py-2 text-right font-bold text-green-600 print:hidden">
                          {formatCurrency(invoice.totalMargin ?? 0)}
                        </td>
                      </>
                    )}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* Fixed-Cost Line Items */}
        {fixedItems.length > 0 && (
          <div className="overflow-x-auto mt-4 print:overflow-visible">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 font-bold text-gray-600">
                    Additional Charges
                  </th>
                  <th className="text-right py-2 font-bold text-gray-600">Amount</th>
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

        {/* Payment info footer on page 1 */}
        {(companyInfo?.email || companyInfo?.phone) && (
          <div className="mt-4 pt-3 border-t border-gray-100 text-sm text-gray-500">
            <p className="font-medium text-gray-700">Payment</p>
            <p>
              Please send payment to the address above. For questions, contact{' '}
              {companyInfo.email || companyInfo.phone}.
            </p>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-3 border-t border-gray-100 text-sm text-gray-500 print:mt-2 print:pt-2">
        <p>
          {invoice.entryCount} time {invoice.entryCount === 1 ? 'entry' : 'entries'}
          {invoice.lineItemCount
            ? ` | ${invoice.lineItemCount} additional charge${invoice.lineItemCount === 1 ? '' : 's'}`
            : ''}{' '}
          | {invoice.totalHours.toFixed(2)} total hours
        </p>
      </div>

      {/* Cost & Margin (internal - hidden when printing for client) */}
      {showCostMargin && (
        <div className="mt-4 pt-3 border-t border-gray-200 print:hidden">
          <h4 className="text-sm font-bold text-gray-700 mb-2">Cost &amp; Margin</h4>
          <div className="grid grid-cols-3 gap-4 text-sm mb-3">
            <div>
              <span className="text-gray-500">Billed</span>
              <p className="font-bold text-gray-900">{formatCurrency(invoice.total)}</p>
            </div>
            <div>
              <span className="text-gray-500">Earned (Cost)</span>
              <p className="font-bold text-gray-700">
                {formatCurrency(invoice.totalEarned ?? 0)}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Margin</span>
              <p className="font-bold text-green-600">
                {formatCurrency(invoice.totalMargin ?? 0)}
              </p>
            </div>
          </div>
          {invoice.costBreakdown && invoice.costBreakdown.length > 0 && (
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-1.5 font-medium text-gray-600">Person</th>
                    <th className="text-left py-1.5 font-medium text-gray-600">Task</th>
                    <th className="text-right py-1.5 font-medium text-gray-600">Hours</th>
                    <th className="text-right py-1.5 font-medium text-gray-600">Billed</th>
                    <th className="text-right py-1.5 font-medium text-gray-600">Earned</th>
                    <th className="text-right py-1.5 font-medium text-gray-600">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.costBreakdown.map((row, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-1.5 text-gray-800">{row.userName}</td>
                      <td className="py-1.5 text-gray-600">{row.taskTypeName}</td>
                      <td className="text-right py-1.5 text-gray-700">
                        {row.hours.toFixed(2)}
                      </td>
                      <td className="text-right py-1.5 text-gray-700">
                        {formatCurrency(row.billed)}
                      </td>
                      <td className="text-right py-1.5 text-gray-600">
                        {formatCurrency(row.earned)}
                      </td>
                      <td className="text-right py-1.5 font-medium text-green-600">
                        {formatCurrency(row.margin)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TimeRow({
  item,
  showCostMargin,
}: {
  item: InvoiceLineItem;
  showCostMargin?: boolean;
}) {
  const earned = item.earnedAmount ?? 0;
  const margin = item.amount - earned;

  return (
    <tr className="border-b border-gray-100">
      <td className="py-2">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: item.taskTypeColor }}
          />
          <span className="font-medium text-gray-900">{item.taskTypeName}</span>
        </div>
      </td>
      <td className="text-right py-2 text-gray-600">
        {formatCurrency(item.baseRate)}/hr
      </td>
      <td className="text-right py-2">
        {item.discount > 0 ? (
          <span className="text-purple-600 font-medium">{item.discount}%</span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="text-right py-2 font-medium text-green-600">
        {formatCurrency(item.effectiveRate)}/hr
      </td>
      <td className="text-right py-2 text-gray-700">{item.hours.toFixed(2)}</td>
      <td className="text-right py-2 font-bold text-gray-900">
        {formatCurrency(item.amount)}
      </td>
      {showCostMargin && (
        <>
          <td className="text-right py-2 text-gray-600 print:hidden">
            {formatCurrency(earned)}
          </td>
          <td className="text-right py-2 font-medium text-green-600 print:hidden">
            {formatCurrency(margin)}
          </td>
        </>
      )}
    </tr>
  );
}
