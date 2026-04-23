import type { Client, ExpandedTimeBlock, Project, TimeBlockKind } from '../types';

/** Fixed semantic colors for non-work block kinds (Tailwind-aligned hex) */
const KIND_COLORS: Record<TimeBlockKind, string> = {
  WORK: '#3b82f6',
  PERSONAL: '#8b5cf6',
  DOWNTIME: '#64748b',
  MEETING: '#f59e0b',
  ADMIN: '#0d9488',
};

const CLIENT_PALETTE = [
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#ea580c',
  '#059669',
  '#ca8a04',
  '#4f46e5',
  '#0e7490',
];

const INTERNAL_CLIENT_COLOR = '#6366f1';

function hashToIndex(id: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % mod;
}

export function clientCalendarColor(client: Client | undefined | null): string {
  if (!client) return CLIENT_PALETTE[0];
  const cc = client.calendarColor != null ? String(client.calendarColor).trim() : '';
  if (cc) return cc;
  if (client.isInternal) return INTERNAL_CLIENT_COLOR;
  return CLIENT_PALETTE[hashToIndex(client._id, CLIENT_PALETTE.length)];
}

export function blockBarBackground(block: ExpandedTimeBlock): string {
  if (block.colorHint?.trim()) return block.colorHint.trim();
  if (block.kind === 'PERSONAL' || block.kind === 'DOWNTIME' || block.kind === 'MEETING' || block.kind === 'ADMIN') {
    return KIND_COLORS[block.kind];
  }
  const proj = block.projectId;
  if (proj && typeof proj === 'object') {
    const c =
      typeof proj.clientId === 'object' && proj.clientId
        ? (proj.clientId as Client)
        : null;
    if (c) return clientCalendarColor(c);
  }
  return KIND_COLORS.WORK;
}

export function blockKindLabel(kind: TimeBlockKind): string {
  switch (kind) {
    case 'WORK':
      return 'Work';
    case 'PERSONAL':
      return 'Personal';
    case 'DOWNTIME':
      return 'Downtime';
    case 'MEETING':
      return 'Meeting';
    case 'ADMIN':
      return 'Admin';
    default:
      return kind;
  }
}

export function projectLabel(block: ExpandedTimeBlock): string {
  const p = block.projectId;
  if (p && typeof p === 'object') return (p as Project).title;
  return '';
}
