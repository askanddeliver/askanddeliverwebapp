import { Link, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Bell, Menu, Search } from 'lucide-react';
import { adminCrumbForPath } from '../lib/adminBreadcrumbs';

interface TopBarProps {
  onToggleMobile: () => void;
}

function TopBar({ onToggleMobile }: TopBarProps) {
  const { logout, user } = useAuth0();
  const { pathname } = useLocation();
  const current = adminCrumbForPath(pathname);

  return (
    <header
      className="sticky top-0 z-50 shrink-0 border-b transition-colors duration-150 print:hidden"
      style={{
        backgroundColor: 'var(--admin-surface)',
        borderColor: 'var(--admin-border)',
      }}
    >
      <div className="flex h-12 items-center justify-between gap-3 px-4 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={onToggleMobile}
            className="-ml-1 rounded-md p-2 text-[var(--admin-text-2)] transition-colors duration-150 hover:bg-[var(--admin-app-bg)] hover:text-[var(--admin-text)] lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--admin-text)] sm:hidden">
            {current}
          </span>

          <nav
            className="hidden min-w-0 items-center gap-1.5 text-[12.5px] text-[var(--admin-text-3)] sm:flex"
            aria-label="Breadcrumb"
          >
            <Link
              to="/dashboard"
              className="truncate font-medium text-[var(--admin-text-3)] transition-colors duration-150 hover:text-[var(--admin-text)]"
            >
              Workspace
            </Link>
            <span className="shrink-0 text-[var(--admin-text-4)]" aria-hidden>
              /
            </span>
            <span className="truncate font-medium text-[var(--admin-text)]">{current}</span>
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="hidden min-w-[220px] items-center gap-2 rounded-md border px-3 text-left text-[12.5px] text-[var(--admin-text-3)] transition-colors duration-150 hover:border-[var(--admin-border-strong)] md:inline-flex"
            style={{
              height: 30,
              backgroundColor: 'var(--admin-app-bg)',
              borderColor: 'var(--admin-border)',
            }}
            aria-label="Search (coming soon)"
          >
            <Search className="h-[13px] w-[13px] shrink-0" strokeWidth={2} />
            <span className="truncate">Search or jump to…</span>
            <kbd
              className="ml-auto inline-flex items-center rounded border px-1.5 font-mono text-[10.5px] text-[var(--admin-text-3)]"
              style={{
                backgroundColor: 'var(--admin-surface)',
                borderColor: 'var(--admin-border)',
              }}
            >
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            className="hidden h-[30px] w-[30px] items-center justify-center rounded-md text-[var(--admin-text-2)] transition-colors duration-150 hover:bg-[var(--admin-app-bg)] sm:inline-flex"
            style={{ border: '1px solid transparent' }}
            aria-label="Notifications"
          >
            <Bell className="h-3.5 w-3.5" strokeWidth={2} />
          </button>

          <div className="hidden items-center gap-2 sm:flex sm:gap-3">
            {user?.picture && (
              <img
                src={user.picture}
                alt={user.name || 'User'}
                className="h-8 w-8 rounded-full object-cover ring-1 ring-black/5"
                referrerPolicy="no-referrer"
              />
            )}
            <span className="max-w-[140px] truncate text-sm font-medium text-[var(--admin-text-2)]">
              {user?.name}
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              logout({ logoutParams: { returnTo: window.location.origin } })
            }
            className="btn-secondary text-sm !min-h-[30px] !rounded-md !px-3 !py-0"
          >
            Log Out
          </button>
        </div>
      </div>
    </header>
  );
}

export default TopBar;
