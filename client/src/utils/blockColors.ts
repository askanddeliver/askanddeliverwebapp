import type { Client, ExpandedTimeBlock, Project, TimeBlockKind } from '../types';

/**
 * Kind colors — match Claude Design prototype (`docs/block time ui ux updates/bt-data.jsx`).
 * Work blocks with a client use the client color; these apply to non-work kinds and work-without-client.
 */
export const KIND_PILL_COLORS: Record<TimeBlockKind, string> = {
  WORK: '#3B82F6',
  PERSONAL: '#F59E0B',
  DOWNTIME: '#94A3B8',
  MEETING: '#EF4444',
  ADMIN: '#A855F7',
};

const CLIENT_PALETTE = [
  '#3B82F6',
  '#8B5CF6',
  '#0EA5E9',
  '#F97316',
  '#EC4899',
  '#10B981',
  '#6366F1',
];

/** Neutral slate for internal / self-work client (prototype) */
const INTERNAL_CLIENT_COLOR = '#64748B';

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
  if (
    block.kind === 'PERSONAL' ||
    block.kind === 'DOWNTIME' ||
    block.kind === 'MEETING' ||
    block.kind === 'ADMIN'
  ) {
    return KIND_PILL_COLORS[block.kind];
  }
  const proj = block.projectId;
  if (proj && typeof proj === 'object') {
    const c =
      typeof proj.clientId === 'object' && proj.clientId
        ? (proj.clientId as Client)
        : null;
    if (c) return clientCalendarColor(c);
  }
  return KIND_PILL_COLORS.WORK;
}

/** Readable text on colored block (WCAG-ish luminance) */
export function contrastTextOnHex(hex: string): string {
  if (!hex || hex.length < 7) return '#ffffff';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const y = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return y > 0.55 ? '#1e293b' : '#ffffff';
}

export function alphaHexToRgba(hex: string, a: number): string {
  if (!hex || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
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

export function clientLabel(block: ExpandedTimeBlock): string {
  const p = block.projectId;
  if (p && typeof p === 'object') {
    const raw = (p as Project).clientId;
    if (typeof raw === 'object' && raw !== null && 'name' in raw) {
      return (raw as Client).name;
    }
  }
  return '';
}
