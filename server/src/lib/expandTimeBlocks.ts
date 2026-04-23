import type { TimeBlockKind } from '../models/TimeBlock';

/** Lean or hydrated time block shape used for expansion */
export type TimeBlockExpandSource = {
  _id: { toString(): string };
  startTime: Date;
  endTime: Date;
  title: string;
  projectId?: unknown;
  taskTypeId?: unknown;
  projectTaskId?: unknown;
  kind: TimeBlockKind;
  colorHint?: string;
  recurrenceRule?: string;
  notes?: string;
  launchedTimeEntryIds?: unknown[];
  recurrenceParentId?: unknown;
  exceptionDates?: Date[];
};

export interface ExpandedTimeBlock {
  /** Mongo _id of the stored document (series master) */
  masterId: string;
  /** Unique key for this row (master or expanded instance) */
  instanceKey: string;
  startTime: Date;
  endTime: Date;
  title: string;
  projectId?: unknown;
  taskTypeId?: unknown;
  projectTaskId?: unknown;
  kind: string;
  colorHint?: string;
  recurrenceRule?: string;
  notes?: string;
  launchedTimeEntryIds: unknown[];
  isRecurringInstance: boolean;
}

function startOfUTCDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addUTCDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function utcDayDiff(a: Date, b: Date): number {
  const sa = startOfUTCDay(a).getTime();
  const sb = startOfUTCDay(b).getTime();
  return Math.round((sb - sa) / 86400000);
}

const WEEKDAY_MAP: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

interface ParsedRRule {
  freq: 'DAILY' | 'WEEKLY';
  interval: number;
  byday?: number[];
  until?: Date;
  count?: number;
}

export function parseSimpleRRule(rule: string): ParsedRRule | null {
  const trimmed = rule.trim();
  if (!trimmed.toUpperCase().startsWith('RRULE:')) return null;
  const body = trimmed.slice(6);
  const parts = body.split(';').map((p) => p.trim()).filter(Boolean);
  const map = new Map<string, string>();
  for (const p of parts) {
    const [k, v] = p.split('=');
    if (k && v) map.set(k.toUpperCase(), v.toUpperCase());
  }
  const freq = map.get('FREQ');
  if (freq !== 'DAILY' && freq !== 'WEEKLY') return null;
  const interval = map.has('INTERVAL') ? Math.max(1, parseInt(map.get('INTERVAL')!, 10) || 1) : 1;
  let byday: number[] | undefined;
  if (map.has('BYDAY')) {
    byday = map
      .get('BYDAY')!
      .split(',')
      .map((d) => WEEKDAY_MAP[d.trim()])
      .filter((n) => n !== undefined);
  }
  let until: Date | undefined;
  if (map.has('UNTIL')) {
    const u = map.get('UNTIL')!;
    if (u.length === 8) {
      until = new Date(`${u.slice(0, 4)}-${u.slice(4, 6)}-${u.slice(6, 8)}T23:59:59.999Z`);
    } else {
      until = new Date(u);
    }
  }
  let count: number | undefined;
  if (map.has('COUNT')) {
    count = Math.max(1, parseInt(map.get('COUNT')!, 10) || 1);
  }
  return { freq: freq as 'DAILY' | 'WEEKLY', interval, byday, until, count };
}

function isExceptionDay(block: TimeBlockExpandSource, dayStart: Date): boolean {
  const ex = block.exceptionDates || [];
  for (const e of ex) {
    if (startOfUTCDay(new Date(e)).getTime() === dayStart.getTime()) return true;
  }
  return false;
}

function utcWeekIndex(d: Date): number {
  return Math.floor(startOfUTCDay(d).getTime() / 604800000);
}

function occursOnDay(
  block: TimeBlockExpandSource,
  dayStart: Date,
  parsed: ParsedRRule,
  seriesDay0: Date,
  seriesStart: Date
): boolean {
  if (isExceptionDay(block, dayStart)) return false;
  if (parsed.until && dayStart > startOfUTCDay(parsed.until)) return false;
  if (dayStart < seriesDay0) return false;

  if (parsed.freq === 'DAILY') {
    const diff = utcDayDiff(seriesDay0, dayStart);
    return diff >= 0 && diff % parsed.interval === 0;
  }

  // WEEKLY: BYDAY or same weekday as series start
  const weekdays =
    parsed.byday && parsed.byday.length > 0
      ? parsed.byday
      : [seriesStart.getUTCDay()];
  if (!weekdays.includes(dayStart.getUTCDay())) return false;

  const w0 = utcWeekIndex(seriesDay0);
  const w1 = utcWeekIndex(dayStart);
  const weekDiff = w1 - w0;
  return weekDiff >= 0 && weekDiff % parsed.interval === 0;
}

function shiftTime(baseDay: Date, timeSource: Date): Date {
  return new Date(
    Date.UTC(
      baseDay.getUTCFullYear(),
      baseDay.getUTCMonth(),
      baseDay.getUTCDate(),
      timeSource.getUTCHours(),
      timeSource.getUTCMinutes(),
      timeSource.getUTCSeconds(),
      timeSource.getUTCMilliseconds()
    )
  );
}

function expandOneMaster(
  block: TimeBlockExpandSource,
  rangeStart: Date,
  rangeEnd: Date
): ExpandedTimeBlock[] {
  const masterId = block._id.toString();
  const duration = block.endTime.getTime() - block.startTime.getTime();
  const out: ExpandedTimeBlock[] = [];

  if (!block.recurrenceRule || !block.recurrenceRule.trim()) {
    if (block.endTime >= rangeStart && block.startTime <= rangeEnd) {
      out.push({
        masterId,
        instanceKey: masterId,
        startTime: new Date(block.startTime),
        endTime: new Date(block.endTime),
        title: block.title,
        projectId: block.projectId,
        taskTypeId: block.taskTypeId,
        projectTaskId: block.projectTaskId,
        kind: block.kind,
        colorHint: block.colorHint,
        recurrenceRule: block.recurrenceRule,
        notes: block.notes,
        launchedTimeEntryIds: block.launchedTimeEntryIds || [],
        isRecurringInstance: false,
      });
    }
    return out;
  }

  const parsed = parseSimpleRRule(block.recurrenceRule);
  if (!parsed) {
    if (block.endTime >= rangeStart && block.startTime <= rangeEnd) {
      out.push({
        masterId,
        instanceKey: masterId,
        startTime: new Date(block.startTime),
        endTime: new Date(block.endTime),
        title: block.title,
        projectId: block.projectId,
        taskTypeId: block.taskTypeId,
        projectTaskId: block.projectTaskId,
        kind: block.kind,
        colorHint: block.colorHint,
        recurrenceRule: block.recurrenceRule,
        notes: block.notes,
        launchedTimeEntryIds: block.launchedTimeEntryIds || [],
        isRecurringInstance: false,
      });
    }
    return out;
  }

  const seriesDay0 = startOfUTCDay(block.startTime);
  let emitted = 0;
  for (
    let d = startOfUTCDay(rangeStart);
    d <= rangeEnd;
    d = addUTCDays(d, 1)
  ) {
    if (parsed.count !== undefined && emitted >= parsed.count) break;
    if (!occursOnDay(block, d, parsed, seriesDay0, block.startTime)) continue;

    const start = shiftTime(d, block.startTime);
    const end = new Date(start.getTime() + duration);
    if (end < rangeStart || start > rangeEnd) continue;

    const key = `${masterId}__${start.toISOString()}`;
    out.push({
      masterId,
      instanceKey: key,
      startTime: start,
      endTime: end,
      title: block.title,
      projectId: block.projectId,
      taskTypeId: block.taskTypeId,
      projectTaskId: block.projectTaskId,
      kind: block.kind,
      colorHint: block.colorHint,
      recurrenceRule: block.recurrenceRule,
      notes: block.notes,
      launchedTimeEntryIds: block.launchedTimeEntryIds || [],
      isRecurringInstance: true,
    });
    emitted += 1;
  }

  return out;
}

/**
 * Expand non-recurring blocks and RRULE masters into rows overlapping [rangeStart, rangeEnd].
 */
export function expandTimeBlocksForRange(
  blocks: TimeBlockExpandSource[],
  rangeStart: Date,
  rangeEnd: Date
): ExpandedTimeBlock[] {
  const masters = blocks.filter((b) => !b.recurrenceParentId);
  const rows: ExpandedTimeBlock[] = [];
  for (const m of masters) {
    rows.push(...expandOneMaster(m, rangeStart, rangeEnd));
  }
  rows.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  return rows;
}
