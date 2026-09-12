import type { CostBreakdownEntry, InvoiceLineItem } from '../types';

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
