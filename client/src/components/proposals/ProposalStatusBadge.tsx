import type { ProposalStatus } from '../../types';

interface ProposalStatusBadgeProps {
  status: ProposalStatus;
}

export function ProposalStatusBadge({ status }: ProposalStatusBadgeProps) {
  const styles =
    status === 'FINALIZED'
      ? 'bg-emerald-100 text-emerald-800'
      : 'bg-gray-100 text-gray-700';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles}`}>
      {status === 'FINALIZED' ? 'Finalized' : 'Draft'}
    </span>
  );
}
