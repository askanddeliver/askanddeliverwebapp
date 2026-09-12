export type ReportColumnId =
  | 'date'
  | 'start'
  | 'end'
  | 'hours'
  | 'durationHuman'
  | 'member'
  | 'client'
  | 'project'
  | 'billingMode'
  | 'projectTask'
  | 'taskType'
  | 'description'
  | 'baseRate'
  | 'discount'
  | 'effectiveRate'
  | 'billed'
  | 'earnedRate'
  | 'earned'
  | 'margin'
  | 'invoiced'
  | 'invoiceNumber'
  | 'running';

export type ReportColumnGroupId =
  | 'when'
  | 'who'
  | 'where'
  | 'what'
  | 'clientMoney'
  | 'internalMoney'
  | 'status';

export interface ReportColumnDef {
  id: ReportColumnId;
  label: string;
  group: ReportColumnGroupId;
  align: 'left' | 'right';
  /** Never printed on a client-facing PDF */
  internalOnly?: boolean;
  requiresDescriptions?: boolean;
}

export const REPORT_COLUMN_GROUPS: { id: ReportColumnGroupId; label: string; hint?: string }[] = [
  { id: 'when', label: 'When' },
  { id: 'who', label: 'Who' },
  { id: 'where', label: 'Where' },
  { id: 'what', label: 'What' },
  { id: 'clientMoney', label: 'Client $' },
  {
    id: 'internalMoney',
    label: 'Internal $',
    hint: 'Admin preview and CSV only — never on the client PDF',
  },
  { id: 'status', label: 'Status' },
];

export const REPORT_COLUMNS: ReportColumnDef[] = [
  { id: 'date', label: 'Date', group: 'when', align: 'left' },
  { id: 'start', label: 'Start', group: 'when', align: 'right' },
  { id: 'end', label: 'End', group: 'when', align: 'right' },
  { id: 'hours', label: 'Hours', group: 'when', align: 'right' },
  { id: 'durationHuman', label: 'Duration', group: 'when', align: 'right' },
  { id: 'member', label: 'Member', group: 'who', align: 'left' },
  { id: 'client', label: 'Client', group: 'where', align: 'left' },
  { id: 'project', label: 'Project', group: 'where', align: 'left' },
  { id: 'billingMode', label: 'Billing mode', group: 'where', align: 'left' },
  { id: 'projectTask', label: 'Project task', group: 'where', align: 'left' },
  { id: 'taskType', label: 'Task type', group: 'what', align: 'left' },
  { id: 'description', label: 'Description', group: 'what', align: 'left', requiresDescriptions: true },
  { id: 'baseRate', label: 'Base rate', group: 'clientMoney', align: 'right' },
  { id: 'discount', label: 'Discount', group: 'clientMoney', align: 'right' },
  { id: 'effectiveRate', label: 'Effective rate', group: 'clientMoney', align: 'right' },
  { id: 'billed', label: 'Billed', group: 'clientMoney', align: 'right' },
  { id: 'earnedRate', label: 'Earned rate', group: 'internalMoney', align: 'right', internalOnly: true },
  { id: 'earned', label: 'Earned', group: 'internalMoney', align: 'right', internalOnly: true },
  { id: 'margin', label: 'Margin', group: 'internalMoney', align: 'right', internalOnly: true },
  { id: 'invoiced', label: 'Invoiced', group: 'status', align: 'left' },
  { id: 'invoiceNumber', label: 'Invoice #', group: 'status', align: 'left' },
  { id: 'running', label: 'Running', group: 'status', align: 'left', internalOnly: true },
];

const COLUMN_BY_ID = new Map(REPORT_COLUMNS.map((col) => [col.id, col]));

/** Matches the current timesheet CSV. Member and internal $ are opt-in. */
export const DEFAULT_REPORT_COLUMN_IDS: ReportColumnId[] = [
  'date',
  'client',
  'project',
  'projectTask',
  'taskType',
  'hours',
  'baseRate',
  'effectiveRate',
  'billed',
  'description',
];

export function isReportColumnId(value: string): value is ReportColumnId {
  return COLUMN_BY_ID.has(value as ReportColumnId);
}

export function sanitizeReportColumnIds(ids: string[]): ReportColumnId[] {
  const seen = new Set<ReportColumnId>();
  const next: ReportColumnId[] = [];
  for (const id of ids) {
    if (!isReportColumnId(id) || seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  return next.length > 0 ? next : [...DEFAULT_REPORT_COLUMN_IDS];
}

export function visibleReportColumns(
  selectedIds: ReportColumnId[],
  opts: { includeDescriptions: boolean; forClientPdf?: boolean }
): ReportColumnDef[] {
  const selected = new Set(sanitizeReportColumnIds(selectedIds));
  return REPORT_COLUMNS.filter((col) => {
    if (!selected.has(col.id)) return false;
    if (col.requiresDescriptions && !opts.includeDescriptions) return false;
    if (opts.forClientPdf && col.internalOnly) return false;
    return true;
  });
}
