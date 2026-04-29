/** Grid and week layout — align with Claude Design prototype (`docs/block time ui ux updates/`) */
export const HOUR_START = 7;
export const HOUR_END = 21;
export const PX_PER_HR = 64;
export const TIME_GUTTER_PX = 52;

export const gridTotalPx = (HOUR_END - HOUR_START) * PX_PER_HR;

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Monday-based week (ISO-style), local midnight */
export function startOfWeekMonday(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  r.setDate(r.getDate() + diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function fmtTimeShort(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, '0')}${ap}` : `${h12}${ap}`;
}

export function fmtDurationMs(start: Date, end: Date): string {
  const mins = Math.round((end.getTime() - start.getTime()) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function snapMinutesTo15(m: number): number {
  return Math.round(m / 15) * 15;
}

/**
 * Move block to another calendar day while preserving duration (local wall-clock times).
 * `startLocal` / `endLocal` match editor format `yyyy-mm-ddTHH:mm`.
 */
export function shiftBlockToCalendarDate(
  startLocal: string,
  endLocal: string,
  dateYmd: string
): { startTime: string; endTime: string } {
  const dur = new Date(endLocal).getTime() - new Date(startLocal).getTime();
  const startBase = new Date(startLocal);
  const [y, mo, d] = dateYmd.split('-').map((x) => parseInt(x, 10));
  if (!y || !mo || !d) return { startTime: startLocal, endTime: endLocal };
  const newStart = new Date(y, mo - 1, d, startBase.getHours(), startBase.getMinutes(), 0, 0);
  const newEnd = new Date(newStart.getTime() + Math.max(60000, dur));
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (dt: Date) =>
    `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  return { startTime: fmt(newStart), endTime: fmt(newEnd) };
}
