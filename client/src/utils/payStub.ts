import type { CostBreakdownEntry, InvoiceLineItem, TimeEntry, TaskType } from '../types';

/** Roll cost-breakdown rows into earned-only pay-stub lines (no client rates). */
export function payStubItemsFromCostBreakdown(
  breakdown: CostBreakdownEntry[] | undefined
): InvoiceLineItem[] {
  const grouped = new Map<string, { hours: number; earned: number }>();
  for (const row of breakdown || []) {
    const cur = grouped.get(row.taskTypeName) || { hours: 0, earned: 0 };
    cur.hours += row.hours;
    cur.earned += row.earned;
    grouped.set(row.taskTypeName, cur);
  }
  return Array.from(grouped.entries()).map(([taskTypeName, vals]) => {
    const hours = Math.round(vals.hours * 100) / 100;
    const amount = Math.round(vals.earned * 100) / 100;
    const rate = hours > 0 ? Math.round((amount / hours) * 100) / 100 : 0;
    return {
      taskTypeName,
      taskTypeColor: '#6B7280',
      baseRate: rate,
      discount: 0,
      effectiveRate: rate,
      hours,
      amount,
      earnedAmount: amount,
      descriptions: [],
      isFixedCost: false,
    };
  });
}

export function payStubTotal(items: InvoiceLineItem[]): number {
  return Math.round(items.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
}

export function payStubHours(items: InvoiceLineItem[]): number {
  return Math.round(items.reduce((sum, item) => sum + item.hours, 0) * 100) / 100;
}

/** Snapshot rate by task type name from filed stub lines (not live client rates). */
export function payStubRateByTaskType(items: InvoiceLineItem[]): Map<string, number> {
  const rates = new Map<string, number>();
  for (const item of items) {
    const rate =
      item.hours > 0
        ? Math.round((item.amount / item.hours) * 100) / 100
        : item.effectiveRate;
    rates.set(item.taskTypeName, rate);
  }
  return rates;
}

export function payStubRateForEntry(
  entry: TimeEntry,
  rates: Map<string, number>
): number {
  const taskType =
    typeof entry.taskTypeId === 'object' ? (entry.taskTypeId as TaskType) : null;
  if (!taskType?.name) return 0;
  return rates.get(taskType.name) ?? 0;
}
