export const REPORT_CSV_COLUMN_IDS = [
  'date',
  'start',
  'end',
  'hours',
  'durationHuman',
  'member',
  'client',
  'project',
  'billingMode',
  'projectTask',
  'taskType',
  'description',
  'baseRate',
  'discount',
  'effectiveRate',
  'billed',
  'earnedRate',
  'earned',
  'margin',
  'invoiced',
  'invoiceNumber',
  'running',
] as const;

export type ReportCsvColumnId = (typeof REPORT_CSV_COLUMN_IDS)[number];

export const DEFAULT_REPORT_CSV_COLUMNS: ReportCsvColumnId[] = [
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

export const REPORT_CSV_HEADERS: Record<ReportCsvColumnId, string> = {
  date: 'Date',
  start: 'Start',
  end: 'End',
  hours: 'Hours',
  durationHuman: 'Duration',
  member: 'Member',
  client: 'Client',
  project: 'Project',
  billingMode: 'Billing mode',
  projectTask: 'Project task',
  taskType: 'Task type',
  description: 'Description',
  baseRate: 'Base Rate',
  discount: 'Discount',
  effectiveRate: 'Effective Rate',
  billed: 'Amount',
  earnedRate: 'Earned Rate',
  earned: 'Earned',
  margin: 'Margin',
  invoiced: 'Invoiced',
  invoiceNumber: 'Invoice #',
  running: 'Running',
};

const ALLOWED = new Set<string>(REPORT_CSV_COLUMN_IDS);

export function sanitizeReportCsvColumns(raw: unknown): ReportCsvColumnId[] {
  const list = Array.isArray(raw)
    ? raw.map(String)
    : typeof raw === 'string'
      ? raw.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
  const seen = new Set<ReportCsvColumnId>();
  const ids: ReportCsvColumnId[] = [];
  for (const id of list) {
    if (!ALLOWED.has(id) || seen.has(id as ReportCsvColumnId)) continue;
    const typed = id as ReportCsvColumnId;
    seen.add(typed);
    ids.push(typed);
  }
  return ids.length > 0 ? ids : [...DEFAULT_REPORT_CSV_COLUMNS];
}
