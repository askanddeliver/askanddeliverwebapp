/**
 * RRULE helpers aligned with `server/src/lib/expandTimeBlocks.ts` parseSimpleRRule subset:
 * FREQ=DAILY | WEEKLY, INTERVAL, BYDAY (MO,TU,…), UNTIL, COUNT.
 */

const WEEKDAY_MAP: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

const JS_DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

export interface ParsedRRule {
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

export type RepeatEndsMode = 'never' | 'until' | 'count';

export interface RecurrenceFormModel {
  mode: 'none' | 'daily' | 'weekly';
  interval: number;
  /** Length 7, index = JS getDay() (Sun=0 … Sat=6); used when mode === 'weekly' */
  weeklyDays: boolean[];
  ends: RepeatEndsMode;
  /** yyyy-mm-dd for <input type="date"> when ends === 'until' */
  untilInput: string;
  count: number;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function emptyWeeklyDays(anchor: Date): boolean[] {
  const days = Array(7).fill(false);
  days[anchor.getDay()] = true;
  return days;
}

/** Which preset applies — `custom` means show raw RRULE textarea (unsupported or advanced rule). */
export function repeatPresetFromRule(rule: string): 'none' | 'daily' | 'weekly' | 'custom' {
  const t = rule.trim();
  if (!t) return 'none';
  const p = parseSimpleRRule(t);
  if (!p) return 'custom';
  return p.freq === 'DAILY' ? 'daily' : 'weekly';
}

/** When the rule is non-empty but not in the supported subset, return null (use raw RRULE textarea). */
export function ruleToFormModel(rule: string, anchor: Date): RecurrenceFormModel | null {
  const t = rule.trim();
  if (!t) {
    return {
      mode: 'none',
      interval: 1,
      weeklyDays: emptyWeeklyDays(anchor),
      ends: 'never',
      untilInput: '',
      count: 5,
    };
  }
  const parsed = parseSimpleRRule(t);
  if (!parsed) return null;

  const weeklyDays =
    parsed.freq === 'WEEKLY'
      ? (() => {
          const days = Array(7).fill(false);
          const keys =
            parsed.byday && parsed.byday.length > 0
              ? parsed.byday
              : [anchor.getDay()];
          for (const k of keys) {
            if (k >= 0 && k <= 6) days[k] = true;
          }
          return days;
        })()
      : emptyWeeklyDays(anchor);

  let ends: RepeatEndsMode = 'never';
  let untilInput = '';
  let count = 5;
  if (parsed.count != null) {
    ends = 'count';
    count = parsed.count;
  } else if (parsed.until) {
    ends = 'until';
    const u = parsed.until;
    untilInput = `${u.getUTCFullYear()}-${pad(u.getUTCMonth() + 1)}-${pad(u.getUTCDate())}`;
  }

  return {
    mode: parsed.freq === 'DAILY' ? 'daily' : 'weekly',
    interval: parsed.interval,
    weeklyDays,
    ends,
    untilInput,
    count,
  };
}

function serializeWeeklyDays(days: boolean[]): string | undefined {
  const codes: string[] = [];
  for (let i = 0; i < 7; i++) {
    if (days[i]) codes.push(JS_DAY_CODES[i]);
  }
  if (codes.length === 0) return undefined;
  return codes.join(',');
}

/** Serialize UI model to RRULE string stored on TimeBlock */
export function formModelToRule(model: RecurrenceFormModel, anchor: Date): string {
  if (model.mode === 'none') return '';

  const interval = Math.max(1, model.interval || 1);
  let body = '';

  if (model.mode === 'daily') {
    body = `RRULE:FREQ=DAILY;INTERVAL=${interval}`;
  } else {
    let wd = model.weeklyDays;
    const selected = wd.some(Boolean);
    if (!selected) {
      wd = emptyWeeklyDays(anchor);
    }
    const by = serializeWeeklyDays(wd);
    body = `RRULE:FREQ=WEEKLY;INTERVAL=${interval}`;
    if (by) body += `;BYDAY=${by}`;
  }

  if (model.ends === 'count' && model.count >= 1) {
    body += `;COUNT=${Math.floor(model.count)}`;
  } else if (model.ends === 'until' && model.untilInput) {
    const p = model.untilInput.replace(/\D/g, '');
    if (p.length === 8) body += `;UNTIL=${p}`;
  }

  return body;
}
