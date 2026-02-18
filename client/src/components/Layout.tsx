import { ReactNode, useState, useCallback } from 'react';
import TopBar from './TopBar';
import Sidebar from './Sidebar';

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
            {children}
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
