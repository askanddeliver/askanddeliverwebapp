import { ITaskType } from '../models/TaskType';
import { IClient } from '../models/Client';

/**
 * Read discount percentage for a task type from client.taskDiscounts.
 * Handles both Mongoose Map and plain objects (e.g. .lean() / JSON).
 */
export function getDiscountPercent(
  client: IClient | null | undefined,
  taskTypeId: string
): number {
  if (!client || !client.taskDiscounts) return 0;

  if (typeof client.taskDiscounts.get === 'function') {
    return client.taskDiscounts.get(taskTypeId) || 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const discounts = client.taskDiscounts as any;
  return discounts[taskTypeId] || 0;
}

/**
 * Effective hourly rate after applying client-specific discount.
 * Discount is stored as a percentage (0-100).
 */
export function getEffectiveRate(
  taskType: ITaskType,
  client: IClient | null | undefined
): number {
  const taskTypeId = taskType._id.toString();
  const discount = getDiscountPercent(client, taskTypeId);
  const clampedDiscount = Math.min(100, Math.max(0, discount));
  return taskType.rate * (1 - clampedDiscount / 100);
}

/**
 * Calculate the billable amount for a time entry
 * Duration is in seconds, rate is per hour
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
  const secs = totalSeconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
 * Parse a date-range boundary sent from the frontend.
 * Accepts either a full ISO string (timezone-adjusted by the client, e.g.
 * "2026-03-01T06:00:00.000Z") or a bare YYYY-MM-DD string. For bare dates,
 * falls back to UTC boundaries as a safe default.
 */
export function parseDateStart(dateStr: string): Date {
  if (dateStr.includes('T')) return new Date(dateStr);
  return new Date(dateStr + 'T00:00:00.000Z');
}

export function parseDateEnd(dateStr: string): Date {
  if (dateStr.includes('T')) return new Date(dateStr);
  return new Date(dateStr + 'T23:59:59.999Z');
}
