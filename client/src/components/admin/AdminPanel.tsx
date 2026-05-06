import type { ReactNode } from 'react';

interface AdminPanelProps {
  title?: ReactNode;
  /** Optional count chip / meta in header */
  headerExtra?: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
  /** Default padding on body; set false for full-bleed tables etc. */
  padded?: boolean;
}

/**
 * Design handoff: white surface, 1px border, 8px radius; header surface-2, 10px×14px padding.
 */
export function AdminPanel({
  title,
  headerExtra,
  headerActions,
  children,
  padded = true,
}: AdminPanelProps) {
  const hasHeader = title != null || headerExtra != null || headerActions != null;

  return (
    <div
      className="overflow-hidden rounded-lg border bg-[var(--admin-surface)]"
      style={{ borderColor: 'var(--admin-border)', boxShadow: 'var(--admin-shadow-sm)' }}
    >
      {hasHeader && (
        <div
          className="flex items-center justify-between gap-3 border-b px-3.5 py-2.5"
          style={{
            borderColor: 'var(--admin-border)',
            backgroundColor: 'var(--admin-surface-2)',
          }}
        >
          <div className="flex min-w-0 items-center gap-2">
            {title != null && (
              <h2 className="text-[13px] font-semibold text-[var(--admin-text)]">{title}</h2>
            )}
            {headerExtra}
          </div>
          {headerActions != null && (
            <div className="flex shrink-0 items-center gap-2">{headerActions}</div>
          )}
        </div>
      )}
      <div className={padded ? 'p-4' : undefined}>{children}</div>
    </div>
  );
}
