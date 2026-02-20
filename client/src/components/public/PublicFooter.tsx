import { Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { LogIn, LogOut, LayoutDashboard } from 'lucide-react';

function PublicFooter() {
  const currentYear = new Date().getFullYear();
  const { isAuthenticated, loginWithRedirect, logout, user } = useAuth0();

  return (
    <footer className="bg-brand-charcoal text-white">
      <div className="container-public py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">
          {/* Brand Column */}
          <div className="md:col-span-5">
            <span
              role="img"
              aria-label="Ask+Deliver"
              className="block h-10 w-[113px] mb-6"
              style={{
                backgroundColor: 'white',
                maskImage: 'url(/brand/logo-footer.svg)',
                WebkitMaskImage: 'url(/brand/logo-footer.svg)',
                maskSize: 'contain',
                WebkitMaskSize: 'contain',
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
              }}
            />
            <p className="text-neutral-400 text-sm leading-relaxed max-w-sm mb-8">
              A creative collective where talented professionals collaborate to
              bring exceptional projects to life. From brand strategy to
              experiential design, we build meaningful work.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 text-brand-sage-light hover:text-white transition-colors text-sm font-medium"
            >
              Start a project
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>

          {/* Navigation Column */}
          <div className="md:col-span-3 md:col-start-7">
            <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-500 mb-4">
              Navigate
            </h4>
            <ul className="space-y-3">
              {[
                { to: '/', label: 'Home' },
                { to: '/work', label: 'Work' },
                { to: '/about', label: 'About' },
                { to: '/contact', label: 'Contact' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-neutral-400 hover:text-white transition-colors text-sm"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services Column */}
          <div className="md:col-span-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-500 mb-4">
              Services
            </h4>
            <ul className="space-y-3">
              {[
                'Brand Strategy',
                'Web Design & Development',
                'Marketing Campaigns',
                'Experiential Design',
                'Creative Consulting',
              ].map((service) => (
                <li key={service}>
                  <span className="text-neutral-400 text-sm">{service}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Admin Access */}
        <div className="mt-16 pt-8 border-t border-neutral-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  {user?.picture && (
                    <img
                      src={user.picture}
                      alt={user.name || 'User'}
                      className="w-7 h-7 rounded-full ring-2 ring-neutral-700"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <span className="text-neutral-400 text-xs">
                    Signed in as{' '}
                    <span className="text-neutral-300 font-medium">{user?.name || user?.email}</span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-1.5 text-brand-sage-light hover:text-white transition-colors text-xs font-medium"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Dashboard
                  </Link>
                  <span className="text-neutral-700">|</span>
                  <button
                    onClick={() =>
                      logout({ logoutParams: { returnTo: window.location.origin } })
                    }
                    className="inline-flex items-center gap-1.5 text-neutral-500 hover:text-neutral-300 transition-colors text-xs"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => loginWithRedirect({ authorizationParams: { screen_hint: 'login' } })}
                className="inline-flex items-center gap-1.5 text-neutral-500 hover:text-neutral-300 transition-colors text-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                Admin Login
              </button>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-6 pt-6 border-t border-neutral-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-neutral-500 text-xs">
            &copy; {currentYear} Ask+Deliver. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a
              href="https://misterlinderman.github.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-500 hover:text-neutral-300 transition-colors text-xs"
            >
              Legacy Site
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default PublicFooter;
