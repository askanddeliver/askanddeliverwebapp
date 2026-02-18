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
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 print:hidden">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left: Logo + sidebar toggle */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={onToggleMobile}
            className="lg:hidden p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Toggle mobile menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop sidebar toggle */}
          <button
            onClick={onToggleSidebar}
            className="hidden lg:flex p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? (
              <PanelLeft className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>

          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">A&D</span>
            </div>
            <span className="font-bold text-gray-900 hidden sm:inline">
              Ask &amp; Deliver
            </span>
          </Link>
        </div>

        {/* Right: User info + logout */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            {user?.picture && (
              <img
                src={user.picture}
                alt={user.name || 'User'}
                className="w-8 h-8 rounded-full"
              />
            )}
            <span className="text-sm font-medium text-gray-700">
              {user?.name}
            </span>
          </div>
          <button
            onClick={() =>
              logout({ logoutParams: { returnTo: window.location.origin } })
            }
            className="btn-secondary text-sm !py-1.5 !px-3"
          >
            Log Out
          </button>
        </div>
      </div>
    </header>
  );
}

export default TopBar;
