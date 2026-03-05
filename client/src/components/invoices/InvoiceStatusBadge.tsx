import type { InvoiceStatus } from '../../types';

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
};

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  className?: string;
}

export function InvoiceStatusBadge({ status, className = '' }: InvoiceStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[status]} ${className}`}
    >
      {status}
    </span>
  );
}
