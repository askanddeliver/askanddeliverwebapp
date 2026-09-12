import type { TaskType, Client } from '../types';

/**
 * Get effective hourly rate after applying client-specific discount
 */
export function getEffectiveRate(taskType: TaskType, client: Client): number {
  const discount = client.taskDiscounts?.[taskType._id] || 0;
  const clampedDiscount = Math.min(100, Math.max(0, discount));
  return taskType.rate * (1 - clampedDiscount / 100);
}

/**
 * Calculate billable amount (duration in seconds, rate per hour)
 */
export function calculateAmount(
  durationSeconds: number,
  effectiveRate: number
): number {
  const hours = durationSeconds / 3600;
  return Math.round(hours * effectiveRate * 100) / 100;
}

/**
 * Format duration in seconds to HH:MM:SS string
 */
export function formatDuration(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format duration in seconds to a human-readable string (e.g., "2h 30m")
 */
export function formatDurationHuman(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

/**
 * Format a number as USD currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Convert duration in seconds to hours (decimal)
 */
export function secondsToHours(seconds: number): number {
  return Math.round((seconds / 3600) * 100) / 100;
}

/**
 * Format a date string for display
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date string for datetime-local input
 */
export function toDateTimeLocal(dateStr: string): string {
  const date = new Date(dateStr);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

/**
 * Get today's date in YYYY-MM-DD format (local timezone)
 */
export function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Get a date N days ago in YYYY-MM-DD format (local timezone)
 */
export function getDaysAgoString(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Convert a YYYY-MM-DD string to the UTC equivalent of the start of that
 * local day. Used for date range filters so the server queries match the
 * user's timezone rather than the server's.
 */
export function toUTCStartOfDay(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toISOString();
}

/**
 * Convert a YYYY-MM-DD string to the UTC equivalent of the end of that
 * local day (23:59:59.999).
 */
export function toUTCEndOfDay(dateStr: string): string {
  return new Date(dateStr + 'T23:59:59.999').toISOString();
}

export interface DashboardPeriodParams {
  todayStart: string;
  todayEnd: string;
  weekStart: string;
  weekEnd: string;
  lastWeekStart: string;
}

function formatLocalYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDaysToDateString(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return formatLocalYmd(d);
}

/** Sunday of the current local week as YYYY-MM-DD. */
export function getStartOfWeekString(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return formatLocalYmd(d);
}

/** Reports workbench date chips. Weeks are Sunday–Saturday (same as Dashboard). This month is through today. */
export type ReportDatePreset =
  | 'all_time'
  | 'this_month'
  | 'last_month'
  | 'this_week'
  | 'last_week'
  | 'last_7'
  | 'last_30';

export function getReportDateRange(preset: ReportDatePreset): { startDate: string; endDate: string } {
  const today = getTodayString();
  const now = new Date();
  switch (preset) {
    case 'all_time':
      return { startDate: '', endDate: '' };
    case 'this_month': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: formatLocalYmd(first), endDate: today };
    }
    case 'last_month': {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: formatLocalYmd(first), endDate: formatLocalYmd(last) };
    }
    case 'this_week':
      return { startDate: getStartOfWeekString(), endDate: today };
    case 'last_week': {
      const thisWeekStart = getStartOfWeekString();
      return {
        startDate: addDaysToDateString(thisWeekStart, -7),
        endDate: addDaysToDateString(thisWeekStart, -1),
      };
    }
    case 'last_7':
      return { startDate: getDaysAgoString(7), endDate: today };
    case 'last_30':
      return { startDate: getDaysAgoString(30), endDate: today };
    default:
      return { startDate: getDaysAgoString(30), endDate: today };
  }
}

export function matchReportDatePreset(startDate: string, endDate: string): ReportDatePreset | null {
  const presets: ReportDatePreset[] = [
    'all_time',
    'this_month',
    'last_month',
    'this_week',
    'last_week',
    'last_7',
    'last_30',
  ];
  for (const preset of presets) {
    const range = getReportDateRange(preset);
    if (range.startDate === startDate && range.endDate === endDate) return preset;
  }
  return null;
}

/**
 * Local-timezone day/week bounds as UTC ISO strings for dashboard aggregates.
 * The server runs in UTC; without these, "today" rolls over at midnight UTC
 * (7pm Central during CDT).
 */
export function getDashboardPeriodParams(): DashboardPeriodParams {
  const today = getTodayString();
  const weekStart = getStartOfWeekString();
  return {
    todayStart: toUTCStartOfDay(today),
    todayEnd: toUTCStartOfDay(addDaysToDateString(today, 1)),
    weekStart: toUTCStartOfDay(weekStart),
    weekEnd: toUTCStartOfDay(addDaysToDateString(weekStart, 7)),
    lastWeekStart: toUTCStartOfDay(addDaysToDateString(weekStart, -7)),
  };
}
