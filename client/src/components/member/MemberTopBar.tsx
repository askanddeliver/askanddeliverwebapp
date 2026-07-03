import { Link, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Menu } from 'lucide-react';
import { memberCrumbForPath } from '../../lib/memberBreadcrumbs';

interface MemberTopBarProps {
  onToggleMobile: () => void;
}

function MemberTopBar({ onToggleMobile }: MemberTopBarProps) {
  const { logout, user } = useAuth0();
  const { pathname } = useLocation();
  const current = memberCrumbForPath(pathname);

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
              to="/member"
              className="truncate font-medium text-[var(--admin-text-3)] transition-colors duration-150 hover:text-[var(--admin-text)]"
            >
              Member
            </Link>
            {pathname !== '/member' && (
              <>
                <span className="shrink-0 text-[var(--admin-text-4)]" aria-hidden>
                  /
                </span>
                <span className="truncate font-medium text-[var(--admin-text)]">
                  {current}
                </span>
              </>
            )}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {user?.picture && (
            <img
              src={user.picture}
              alt=""
              className="hidden h-7 w-7 rounded-full sm:block"
              referrerPolicy="no-referrer"
            />
          )}
          <button
            type="button"
            onClick={() =>
              logout({ logoutParams: { returnTo: window.location.origin } })
            }
            className="rounded-md px-2.5 py-1.5 text-[12.5px] font-medium text-[var(--admin-text-2)] transition-colors duration-150 hover:bg-[var(--admin-app-bg)] hover:text-[var(--admin-text)]"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

export default MemberTopBar;
