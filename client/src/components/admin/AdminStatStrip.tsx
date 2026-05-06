import type { ReactNode } from 'react';

export interface AdminStatStripItem {
  label: string;
  value: ReactNode;
  /** Optional second line, e.g. trend (green/red per handoff) */
  delta?: { text: string; tone: 'positive' | 'negative' | 'neutral' };
}

interface AdminStatStripProps {
  items: AdminStatStripItem[];
}

/**
 * Design handoff: one bordered surface, columns divided, label 11px uppercase / text-3,
 * value 20px mono semibold / tnum.
 */
export function AdminStatStrip({ items }: AdminStatStripProps) {
  if (items.length === 0) return null;

  const gridClass =
    items.length >= 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3';

  return (
    <div
      className="mb-4 overflow-hidden rounded-lg border bg-[var(--admin-border)] sm:mb-6"
      style={{
        borderColor: 'var(--admin-border)',
        boxShadow: 'var(--admin-shadow-sm)',
      }}
    >
      <div className={`grid gap-px ${gridClass}`}>
      {items.map((item, i) => (
        <div
          key={i}
          className="flex min-w-0 flex-col gap-0.5 bg-[var(--admin-surface)] px-4 py-3 sm:px-5"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--admin-text-3)]">
            {item.label}
          </p>
          <p className="font-mono text-xl font-semibold leading-tight tracking-[-0.02em] text-[var(--admin-text)] tabular-nums">
            {item.value}
          </p>
          {item.delta && (
            <p
              className={
                item.delta.tone === 'positive'
                  ? 'text-[11.5px] text-primary-600'
                  : item.delta.tone === 'negative'
                    ? 'text-[11.5px] text-red-600'
                    : 'text-[11.5px] text-[var(--admin-text-3)]'
              }
            >
              {item.delta.text}
            </p>
          )}
        </div>
      ))}
      </div>
    </div>
  );
}
