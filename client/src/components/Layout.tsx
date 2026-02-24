import { ReactNode, useState, useCallback } from 'react';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import { useUserRole } from '../contexts/UserContext';

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

function Layout({ children }: LayoutProps) {
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
    <div className="min-h-screen flex flex-col">
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

        <div className="flex-1 flex flex-col min-w-0 overflow-auto">
          <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 max-w-6xl w-full mx-auto">
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

          <footer className="bg-white border-t border-gray-200 py-6 print:hidden">
            <div className="px-4 text-center text-gray-500 text-sm">
              <p>
                &copy; {new Date().getFullYear()} Ask &amp; Deliver. Time Tracking &amp;
                Invoicing for Creative Services.
              </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default Layout;
