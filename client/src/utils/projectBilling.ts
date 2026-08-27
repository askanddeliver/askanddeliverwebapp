import type { Project } from '../types';
import { getDaysAgoString, getTodayString, toUTCEndOfDay, toUTCStartOfDay } from './calculations';

export type BurnPeriod = 'all' | 'month' | '30d';

export function projectBillingSummary(project: Project, showAmounts: boolean): string {
  const mode = project.billingMode ?? 'HOURLY';
  if (!showAmounts) {
    if (mode === 'FIXED_PRICE') return 'Fixed price';
    if (mode === 'HOUR_RETAINER') return 'Hour retainer';
    return 'Hourly';
  }
  if (mode === 'FIXED_PRICE' && project.agreedAmount != null) {
    return `Fixed · $${project.agreedAmount.toLocaleString()}`;
  }
  if (mode === 'HOUR_RETAINER' && project.retainerHoursTotal != null) {
    const adj =
      project.retainerHoursAdjustment != null && project.retainerHoursAdjustment !== 0
        ? ` · ${project.retainerHoursAdjustment > 0 ? '+' : ''}${project.retainerHoursAdjustment}h adj`
        : '';
    return `Retainer · ${project.retainerHoursTotal} hrs${adj}`;
  }
  if (mode === 'HOURLY' && project.budget) {
    return `Hourly · Budget $${project.budget.toLocaleString()}`;
  }
  return 'Hourly';
}

export function getBurnDateRange(period: BurnPeriod): { startDate?: string; endDate?: string } {
  if (period === 'all') return {};
  const endDate = toUTCEndOfDay(getTodayString());
  if (period === '30d') {
    return { startDate: toUTCStartOfDay(getDaysAgoString(30)), endDate };
  }
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth();
  const firstLocal = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return { startDate: toUTCStartOfDay(firstLocal), endDate };
}
