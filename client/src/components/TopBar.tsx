import { Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Menu, PanelLeftClose, PanelLeft } from 'lucide-react';

interface TopBarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onToggleMobile: () => void;
}

function TopBar({ sidebarCollapsed, onToggleSidebar, onToggleMobile }: TopBarProps) {
  const { logout, user } = useAuth0();

  return (
    <header
      className="sticky top-0 z-50 print:hidden border-b transition-colors duration-200"
      style={{
        backgroundColor: 'var(--admin-cream, #F7F5F2)',
        borderColor: 'color-mix(in srgb, var(--admin-charcoal, #2A2A2A) 8%, transparent)',
      }}
    >
      <div className="flex items-center justify-between h-16 px-5 lg:px-6">
        {/* Left: Logo + sidebar toggle */}
        <div className="flex items-center gap-4">
          {/* Mobile hamburger */}
          <button
            onClick={onToggleMobile}
            className="lg:hidden p-2 -ml-1 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-white/60 transition-colors"
            aria-label="Toggle mobile menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop sidebar toggle */}
          <button
            onClick={onToggleSidebar}
            className="hidden lg:flex p-2 -ml-1 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-white/60 transition-colors"
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? (
              <PanelLeft className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>

          <Link
            to="/dashboard"
            className="flex items-center gap-3 group"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-[1.02]"
              style={{ backgroundColor: 'var(--primary-600)' }}
            >
              <span className="text-white font-bold text-sm">A&D</span>
            </div>
            <span className="font-semibold text-gray-900 hidden sm:inline tracking-tight">
              Ask &amp; Deliver
            </span>
          </Link>
        </div>

        {/* Right: User info + logout */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3">
            {user?.picture && (
              <img
                src={user.picture}
                alt={user.name || 'User'}
                className="w-9 h-9 rounded-xl object-cover ring-1 ring-black/5"
                referrerPolicy="no-referrer"
              />
            )}
            <span className="text-sm font-medium text-gray-700 max-w-[140px] truncate">
              {user?.name}
            </span>
          </div>
          <button
            onClick={() =>
              logout({ logoutParams: { returnTo: window.location.origin } })
            }
            className="btn-secondary text-sm !py-2 !px-4 rounded-xl"
          >
            Log Out
          </button>
        </div>
      </div>
    </header>
  );
}

export default TopBar;
