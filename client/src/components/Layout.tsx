import { ReactNode, useState, useCallback } from 'react';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import { useUserRole } from '../contexts/UserContext';
import { AdminThemeProvider } from '../contexts/AdminThemeContext';

const SIDEBAR_KEY = 'sidebar-collapsed';

function getInitialCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === 'true';
  } catch {
    return false;
  }
}

interface LayoutProps {
  children: ReactNode;
}

function LayoutInner({ children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isPending, isLoading } = useUserRole();

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_KEY, String(next));
      } catch { /* noop */ }
      return next;
    });
  }, []);

  const toggleMobile = useCallback(() => setMobileOpen((p) => !p), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <>
      <TopBar
        sidebarCollapsed={collapsed}
        onToggleSidebar={toggleCollapsed}
        onToggleMobile={toggleMobile}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onCloseMobile={closeMobile}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-auto bg-[var(--admin-cream,var(--brand-cream,#F7F5F2))]">
          <main className="flex-1 w-full max-w-[90rem] mx-auto px-6 py-10 sm:px-8 lg:px-12 xl:px-14 2xl:px-16">
            {!isLoading && isPending ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
                <div className="max-w-md">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Account Pending Approval
                  </h2>
                  <p className="text-gray-600">
                    Your account is awaiting approval from an administrator.
                    Please contact your team admin to get access.
                  </p>
                </div>
              </div>
            ) : (
              children
            )}
          </main>

          <footer className="border-t border-gray-200/70 py-6 print:hidden bg-white/50 backdrop-blur-sm">
            <div className="px-6 text-center text-gray-500 text-sm">
              <p>
                &copy; {new Date().getFullYear()} Ask &amp; Deliver. Time Tracking &amp;
                Invoicing for Creative Services.
              </p>
            </div>
          </footer>
        </div>
      </div>
    </>
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
