import type { ProjectStatus } from '../types';

export function portalProjectStatusLabel(status: ProjectStatus | string): string {
  switch (status) {
    case 'ACTIVE':
      return 'Active';
    case 'PAUSED':
      return 'On hold';
    case 'COMPLETED':
      return 'Complete';
    default:
      return status;
  }
}

export function portalTaskStatusLabel(status: string): string {
  switch (status) {
    case 'TODO':
      return 'Open';
    case 'IN_PROGRESS':
      return 'In progress';
    case 'COMPLETED':
      return 'Complete';
    default:
      return status;
  }
}

export function portalTaskStatusClass(status: string): string {
  switch (status) {
    case 'TODO':
      return 'border-neutral-300 bg-neutral-50 text-neutral-700';
    case 'IN_PROGRESS':
      return 'border-brand-sage/40 bg-brand-sage/10 text-brand-sage-dark';
    case 'COMPLETED':
      return 'border-neutral-200 bg-neutral-100 text-neutral-500';
    default:
      return 'border-neutral-200 bg-neutral-50 text-neutral-600';
  }
}

export function portalProjectStatusClass(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'border-brand-sage/40 bg-brand-sage/10 text-brand-sage-dark';
    case 'PAUSED':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'COMPLETED':
      return 'border-neutral-200 bg-neutral-100 text-neutral-600';
    default:
      return 'border-neutral-200 bg-neutral-50 text-neutral-600';
  }
}
