import {
  portalProjectStatusClass,
  portalProjectStatusLabel,
  portalTaskStatusClass,
  portalTaskStatusLabel,
} from '../../lib/portalLabels';

interface PortalStatusBadgeProps {
  kind: 'project' | 'task';
  status: string;
}

function PortalStatusBadge({ kind, status }: PortalStatusBadgeProps) {
  const label =
    kind === 'project' ? portalProjectStatusLabel(status) : portalTaskStatusLabel(status);
  const className =
    kind === 'project' ? portalProjectStatusClass(status) : portalTaskStatusClass(status);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

export default PortalStatusBadge;
