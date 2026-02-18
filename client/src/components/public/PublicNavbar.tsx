import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Menu, X, LayoutDashboard } from 'lucide-react';

const publicNavLinks = [
  { to: '/work', label: 'Work' },
  { to: '/about', label: 'About' },
];

function PublicNavbar() {
  const { isAuthenticated, logout, user } = useAuth0();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm'
          : isHome
          ? 'bg-transparent'
          : 'bg-brand-cream/95 backdrop-blur-md'
      }`}
    >
      {/* Logo - flush top-left corner, uses mask-image so color follows CSS variable */}
      <Link to="/" className="absolute top-0 left-0 z-10">
        <span
          role="img"
          aria-label="Ask+Deliver"
          className={`block h-16 md:h-20 w-[210px] md:w-[260px] transition-opacity duration-300 ${
            scrolled || !isHome ? 'opacity-100' : 'opacity-90'
          }`}
          style={{
            backgroundColor: 'var(--brand-sage, #5B7765)',
            maskImage: 'url(/brand/logo-header.svg)',
            WebkitMaskImage: 'url(/brand/logo-header.svg)',
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskPosition: 'left top',
            WebkitMaskPosition: 'left top',
          }}
        />
      </Link>

      <div className="container-public">
        <div className="flex items-center justify-end h-20">
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {publicNavLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`text-sm font-medium tracking-wide transition-colors duration-200 ${
                  isActive(to)
                    ? 'text-brand-sage'
                    : scrolled
                    ? 'text-neutral-700 hover:text-brand-sage'
                    : isHome
                    ? 'text-neutral-700 hover:text-brand-sage'
                    : 'text-neutral-700 hover:text-brand-sage'
                }`}
              >
                {label}
              </Link>
            ))}

            <Link
              to="/contact"
              className={`text-sm font-medium px-5 py-2.5 rounded-lg transition-all duration-200 ${
                isActive('/contact')
                  ? 'bg-brand-sage text-white'
                  : 'bg-brand-sage/10 text-brand-sage hover:bg-brand-sage hover:text-white'
              }`}
            >
              Start a Project
            </Link>

            {/* Admin access - only shown when already authenticated */}
            {isAuthenticated && (
              <div className="flex items-center gap-3 ml-2 pl-4 border-l border-neutral-200">
                {user?.picture && (
                  <img
                    src={user.picture}
                    alt={user.name || 'User'}
                    className="w-6 h-6 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                )}
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-1 text-xs font-mono text-neutral-400 hover:text-brand-sage transition-colors"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Dashboard
                </Link>
                <button
                  onClick={() =>
                    logout({ logoutParams: { returnTo: window.location.origin } })
                  }
                  className="text-xs font-mono text-neutral-400 hover:text-red-500 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-neutral-700 hover:text-brand-sage transition-colors"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileOpen && (
          <div className="md:hidden border-t border-neutral-200/50 py-6 bg-white/95 backdrop-blur-md -mx-6 px-6">
            <div className="space-y-1">
              {publicNavLinks.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={`block px-4 py-3 text-base font-medium rounded-lg transition-colors ${
                    isActive(to)
                      ? 'text-brand-sage bg-brand-sage/5'
                      : 'text-neutral-700 hover:text-brand-sage hover:bg-neutral-50'
                  }`}
                >
                  {label}
                </Link>
              ))}
              <Link
                to="/contact"
                className="block px-4 py-3 text-base font-medium text-brand-sage rounded-lg hover:bg-brand-sage/5 transition-colors"
              >
                Start a Project
              </Link>
              {/* Mobile admin access - only shown when already authenticated */}
              {isAuthenticated && (
                <div className="mt-4 pt-4 border-t border-neutral-200/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 px-4 py-2">
                      {user?.picture && (
                        <img
                          src={user.picture}
                          alt={user.name || 'User'}
                          className="w-6 h-6 rounded-full"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <span className="text-xs text-neutral-500">{user?.name || user?.email}</span>
                    </div>
                    <Link
                      to="/dashboard"
                      className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-brand-sage rounded-lg hover:bg-brand-sage/5 transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Admin Dashboard
                    </Link>
                    <button
                      onClick={() =>
                        logout({ logoutParams: { returnTo: window.location.origin } })
                      }
                      className="flex items-center gap-2 w-full text-left px-4 py-3 text-sm font-medium text-neutral-500 rounded-lg hover:bg-neutral-50 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default PublicNavbar;
