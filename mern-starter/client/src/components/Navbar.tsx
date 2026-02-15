import { Link, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Clock,
  FileText,
  Users,
  FolderOpen,
  Tag,
  BarChart3,
  Image,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

const navLinks = [
  { to: '/dashboard', label: 'Timer', icon: Clock },
  { to: '/entries', label: 'Entries', icon: FileText },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/projects', label: 'Projects', icon: FolderOpen },
  { to: '/task-types', label: 'Tasks', icon: Tag },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/portfolio-admin', label: 'Portfolio', icon: Image },
];

function Navbar() {
  const { isAuthenticated, loginWithRedirect, logout, user } = useAuth0();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 flex-shrink-0">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A&D</span>
            </div>
            <span className="font-semibold text-gray-900 hidden sm:inline">
              Ask & Deliver
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          {isAuthenticated && (
            <div className="hidden lg:flex items-center space-x-1">
              {navLinks.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive(to)
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}
            </div>
          )}

          {/* Right Side */}
          <div className="flex items-center space-x-3">
            {isAuthenticated ? (
              <>
                <div className="hidden sm:flex items-center space-x-2">
                  {user?.picture && (
                    <img
                      src={user.picture}
                      alt={user.name || 'User'}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <span className="text-sm font-medium text-gray-700 hidden md:inline">
                    {user?.name}
                  </span>
                </div>
                <button
                  onClick={() =>
                    logout({
                      logoutParams: { returnTo: window.location.origin },
                    })
                  }
                  className="btn-secondary text-sm"
                >
                  Log Out
                </button>

                {/* Mobile menu button */}
                <button
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
                >
                  {mobileOpen ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Menu className="w-5 h-5" />
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={() => loginWithRedirect()}
                className="btn-primary text-sm"
              >
                Log In
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {isAuthenticated && mobileOpen && (
          <div className="lg:hidden border-t border-gray-100 py-3">
            <div className="space-y-1">
              {navLinks.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    isActive(to)
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
