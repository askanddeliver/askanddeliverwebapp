import { ITaskType } from '../models/TaskType';
import { IClient } from '../models/Client';

/**
 * Get the effective hourly rate after applying client-specific discount
 * Discount is stored as a percentage (0-100)
 * Example: rate=100, discount=50 => effective rate = $50/hr
 */
export function getEffectiveRate(
  taskType: ITaskType,
  client: IClient
): number {
  const taskTypeId = taskType._id.toString();
  const discount = client.taskDiscounts?.get(taskTypeId) || 0;
  // Clamp discount between 0 and 100
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
