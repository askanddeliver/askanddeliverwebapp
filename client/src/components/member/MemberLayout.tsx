import { ReactNode, useState, useCallback } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import MemberTopBar from './MemberTopBar';
import MemberSidebar from './MemberSidebar';
import { useUserRole } from '../../contexts/UserContext';
import { AdminThemeProvider } from '../../contexts/AdminThemeContext';

const RAIL_EXPANDED_KEY = 'member-rail-expanded';

function getInitialRailExpanded(): boolean {
  try {
    return localStorage.getItem(RAIL_EXPANDED_KEY) === 'true';
  } catch {
    return false;
  }
}

interface MemberLayoutProps {
  children?: ReactNode;
}

function MemberLayoutInner({ children }: MemberLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [railExpanded, setRailExpanded] = useState(getInitialRailExpanded);
  const { isPending, isClient, isLoading } = useUserRole();

  if (!isLoading && isClient) {
    return <Navigate to="/portal" replace />;
  }

  const toggleMobile = useCallback(() => setMobileOpen((p) => !p), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const toggleRailExpanded = useCallback(() => {
    setRailExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(RAIL_EXPANDED_KEY, String(next));
      } catch {
        /* noop */
      }
      return next;
    });
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 items-stretch overflow-hidden">
        <MemberSidebar
          mobileOpen={mobileOpen}
          onCloseMobile={closeMobile}
          railExpanded={railExpanded}
          onToggleRailExpanded={toggleRailExpanded}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--admin-app-bg)]">
          <MemberTopBar onToggleMobile={toggleMobile} />

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <main className="w-full min-w-0 flex-1 px-5 py-5 sm:px-6">
              <div className="mx-auto w-full max-w-[1480px]">
                {!isLoading && isPending ? (
                  <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
                    <div className="max-w-md">
                      <h2 className="mb-2 text-xl font-bold text-[var(--admin-text)]">
                        Account Pending Approval
                      </h2>
                      <p className="text-[var(--admin-text-2)]">
                        Your account is awaiting approval from an administrator.
                        Please contact your team admin to get access.
                      </p>
                    </div>
                  </div>
                ) : (
                  children ?? <Outlet />
                )}
              </div>
            </main>

            <footer className="print:hidden border-t border-[var(--admin-border)] bg-[var(--admin-surface-2)] py-5">
              <div className="px-5 text-center text-sm text-[var(--admin-text-3)] sm:px-6">
                <p>
                  &copy; {new Date().getFullYear()} Ask &amp; Deliver. Member workspace.
                </p>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberLayout({ children }: MemberLayoutProps) {
  return (
    <AdminThemeProvider>
      <MemberLayoutInner>{children}</MemberLayoutInner>
    </AdminThemeProvider>
  );
}

export default MemberLayout;
