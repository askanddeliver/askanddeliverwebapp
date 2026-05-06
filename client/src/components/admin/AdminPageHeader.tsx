import type { ReactNode } from 'react';

interface AdminPageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

/** Design handoff: title 20px / 600 / -0.015em; subtitle 13px / --text-3; actions right. */
export function AdminPageHeader({ title, subtitle, actions }: AdminPageHeaderProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1
          className="text-balance text-xl font-semibold tracking-[-0.015em] text-[var(--admin-text)] sm:text-[20px]"
        >
          {title}
        </h1>
        {subtitle != null && subtitle !== '' && (
          <p className="mt-0.5 text-[13px] leading-normal text-[var(--admin-text-3)]">{subtitle}</p>
        )}
      </div>
      {actions != null && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
