import { ChevronDown } from 'lucide-react';
import type { Project, ProjectBudgetBurn, TimeEntry } from '../../types';
import { formatCurrency, secondsToHours } from '../../utils/calculations';
import { type BurnPeriod } from '../../utils/projectBilling';

interface ProjectBudgetPanelProps {
  project: Project;
  budgetBurn?: ProjectBudgetBurn;
  budgetBurnPeriodLabel?: string;
  burnPeriod: BurnPeriod;
  onBurnPeriodChange: (period: BurnPeriod) => void;
  entries: TimeEntry[];
}

export function ProjectBudgetPanel({
  project,
  budgetBurn,
  budgetBurnPeriodLabel,
  burnPeriod,
  onBurnPeriodChange,
  entries,
}: ProjectBudgetPanelProps) {
  const mode = project.billingMode ?? 'HOURLY';

  if (mode === 'FIXED_PRICE') {
    return (
      <div>
        <p className="text-sm text-[var(--admin-text-2)]">
          Agreed fee{' '}
          <span className="font-semibold text-[var(--admin-text)]">
            {project.agreedAmount != null
              ? formatCurrency(project.agreedAmount)
              : '—'}
          </span>
        </p>
        {project.fixedPriceInvoiceLabel && (
          <p className="mt-1 text-xs text-[var(--admin-text-3)]">
            Invoice label: {project.fixedPriceInvoiceLabel}
          </p>
        )}
      </div>
    );
  }

  if (mode === 'HOUR_RETAINER') {
    const pool = project.retainerHoursTotal ?? 0;
    const adj = project.retainerHoursAdjustment ?? 0;
    const used = secondsToHours(
      entries.reduce((sum, e) => sum + (e.duration || 0), 0)
    );
    const remaining = Math.round((pool + adj - used) * 100) / 100;
    const denom = pool + adj;
    const percent = denom > 0 ? Math.min(100, (used / denom) * 100) : 0;

    return (
      <div>
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full ${
              percent >= 100 ? 'bg-red-500' : percent >= 85 ? 'bg-amber-500' : 'bg-primary-500'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-2 text-sm leading-snug text-[var(--admin-text-2)]">
          {used.toFixed(1)}h used of {pool}h pool
          {adj !== 0 ? ` (${adj > 0 ? '+' : ''}${adj}h adj)` : ''}
          {' · '}
          {remaining.toFixed(1)}h remaining
        </p>
      </div>
    );
  }

  const hasBudget = project.budget != null && project.budget > 0;

  return (
    <div>
      <div className="mb-3 flex items-center justify-end">
        <div className="relative">
          <label htmlFor="hub-burn-period" className="sr-only">
            Budget burn period
          </label>
          <select
            id="hub-burn-period"
            value={burnPeriod}
            onChange={(e) => onBurnPeriodChange(e.target.value as BurnPeriod)}
            className="appearance-none rounded-lg border border-gray-200 bg-white py-1.5 pl-3 pr-8 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All time</option>
            <option value="month">This month</option>
            <option value="30d">Last 30 days</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
      </div>
      {!hasBudget && (
        <p className="text-sm italic text-[var(--admin-text-3)]">
          No standing budget set for this hourly project.
        </p>
      )}
      {hasBudget && budgetBurn && (
        <div title="Billable amount from time entries × effective rates">
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full ${
                budgetBurn.percentUsed >= 100
                  ? 'bg-red-500'
                  : budgetBurn.percentUsed >= 85
                    ? 'bg-amber-500'
                    : 'bg-primary-500'
              }`}
              style={{ width: `${Math.min(100, budgetBurn.percentUsed)}%` }}
            />
          </div>
          <p className="mt-2 text-sm leading-snug text-[var(--admin-text-2)]">
            Budget burn {budgetBurn.percentUsed.toFixed(0)}% ·{' '}
            {formatCurrency(budgetBurn.billed)} / {formatCurrency(budgetBurn.budget)}
            {budgetBurnPeriodLabel ? ` · ${budgetBurnPeriodLabel}` : ''}
          </p>
        </div>
      )}
      {hasBudget && !budgetBurn && (
        <p className="text-sm text-[var(--admin-text-3)]">Loading burn…</p>
      )}
    </div>
  );
}
