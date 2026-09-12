import type { Invoice } from '../../types';
import { formatCurrency, formatDate } from '../../utils/calculations';

interface PayStubPreviewProps {
  invoice: Invoice;
}

export function PayStubPreview({ invoice }: PayStubPreviewProps) {
  const { companyInfo } = invoice;
  const memberName = invoice.client?.name || 'Team member';
  const memberEmail = invoice.client?.email;

  return (
    <div className="card print:border-0 print:shadow-none print:rounded-none print:p-0 print:overflow-visible" id="pay-stub-preview">
      <div className="flex justify-between items-start gap-6 mb-6 print:mb-4">
        <div className="flex-1 min-w-0">
          <img
            src="/brand/logo-header.svg"
            alt="Ask+Deliver"
            className="h-8 mb-3 print:h-6 print:mb-2"
          />
          <h2 className="text-xl font-bold text-gray-900 print:text-lg">
            Pay stub
            {invoice.invoiceNumber ? ` #${invoice.invoiceNumber}` : ''}
          </h2>
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
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Member</p>
          <p className="font-bold text-gray-900 text-base mt-0.5">{memberName}</p>
          {memberEmail && <p className="text-sm text-gray-500 mt-0.5">{memberEmail}</p>}
          {invoice.dateRange && (invoice.dateRange.start && invoice.dateRange.end ? (
            <p className="text-sm text-gray-500 mt-2">
              {formatDate(invoice.dateRange.start)} &mdash; {formatDate(invoice.dateRange.end)}
            </p>
          ) : (
            <p className="text-sm text-gray-500 mt-2">All time</p>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-3 print:mb-2">
        Earned rates × hours for this period. Client billed rates are not shown.
      </p>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="text-left py-2 font-bold text-gray-600">Task type</th>
            <th className="text-right py-2 font-bold text-gray-600">Hours</th>
            <th className="text-right py-2 font-bold text-gray-600">Earned rate</th>
            <th className="text-right py-2 font-bold text-gray-600">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, i) => (
            <tr key={`${item.taskTypeName}-${i}`} className="border-b border-gray-100">
              <td className="py-2.5 font-medium text-gray-900">{item.taskTypeName}</td>
              <td className="py-2.5 text-right tabular-nums text-gray-700">{item.hours.toFixed(2)}</td>
              <td className="py-2.5 text-right tabular-nums text-gray-700">
                {formatCurrency(item.effectiveRate)}
              </td>
              <td className="py-2.5 text-right tabular-nums font-medium text-gray-900">
                {formatCurrency(item.amount)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-300">
            <td className="py-3 font-bold text-gray-900">Total</td>
            <td className="py-3 text-right font-bold tabular-nums text-gray-900">
              {invoice.totalHours.toFixed(2)}
            </td>
            <td />
            <td className="py-3 text-right font-bold tabular-nums text-gray-900">
              {formatCurrency(invoice.total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
