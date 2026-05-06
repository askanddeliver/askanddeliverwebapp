import { ReactNode, useState, useCallback } from 'react';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import { useUserRole } from '../contexts/UserContext';
import { AdminThemeProvider } from '../contexts/AdminThemeContext';

interface LayoutProps {
  children: ReactNode;
}

function LayoutInner({ children }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isPending, isLoading } = useUserRole();

  const toggleMobile = useCallback(() => setMobileOpen((p) => !p), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar mobileOpen={mobileOpen} onCloseMobile={closeMobile} />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--admin-app-bg)]">
          <TopBar onToggleMobile={toggleMobile} />

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <main className="w-full min-w-0 flex-1 px-5 py-5 sm:px-6">
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
                children
              )}
            </main>

            <footer className="print:hidden border-t border-[var(--admin-border)] bg-[var(--admin-surface-2)] py-5">
              <div className="px-5 text-center text-sm text-[var(--admin-text-3)] sm:px-6">
                <p>
                  &copy; {new Date().getFullYear()} Ask &amp; Deliver. Time Tracking &amp;
                  Invoicing for Creative Services.
                </p>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}

function Layout({ children }: LayoutProps) {
  return (
    <AdminThemeProvider>
      <LayoutInner>{children}</LayoutInner>
    </AdminThemeProvider>
  );
}

export default Layout;
