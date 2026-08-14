import { Link, useLocation } from 'react-router-dom';
import { Home, FolderOpen, Settings } from 'lucide-react';

const navItems = [
  { to: '/portal', label: 'Home', icon: Home, end: true },
  { to: '/portal/projects', label: 'Projects', icon: FolderOpen, end: false },
  { to: '/portal/settings', label: 'Email', icon: Settings, end: false },
];

function PortalNav() {
  const { pathname } = useLocation();

  const isActive = (to: string, end: boolean) => {
    if (end) return pathname === to;
    return pathname.startsWith(to);
  };

  return (
    <nav className="flex items-center gap-1 border-t border-neutral-200 bg-white px-4 py-2 sm:gap-2 sm:px-6">
      {navItems.map(({ to, label, icon: Icon, end }) => {
        const active = isActive(to, end);
        return (
          <Link
            key={to}
            to={to}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-brand-sage/10 text-brand-sage-dark'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-brand-charcoal'
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export default PortalNav;
