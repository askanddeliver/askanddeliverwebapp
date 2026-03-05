import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Receipt,
  Users,
  FolderOpen,
  Inbox,
  Image,
  Tag,
  UserCircle,
  Palette,
  UserCog,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useUserRole } from '../contexts/UserContext';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
  adminOnly?: boolean;
}

const mainLink: NavItem = {
  to: '/dashboard',
  label: 'Dashboard',
  icon: LayoutDashboard,
};

const navSections: NavSection[] = [
  {
    label: 'Time Tracking',
    items: [
      { to: '/entries', label: 'Entries', icon: FileText },
      { to: '/reports', label: 'Reports', icon: BarChart3, adminOnly: true },
      { to: '/invoices', label: 'Invoices', icon: Receipt, adminOnly: true },
    ],
  },
  {
    label: 'Manage',
    items: [
      { to: '/clients', label: 'Clients', icon: Users, adminOnly: true },
      { to: '/projects', label: 'Projects', icon: FolderOpen },
    ],
  },
  {
    label: 'Business',
    adminOnly: true,
    items: [
      { to: '/leads', label: 'Leads', icon: Inbox },
      { to: '/portfolio-admin', label: 'Portfolio', icon: Image },
    ],
  },
];

const settingsSection: NavSection = {
  label: 'Settings',
  items: [
    { to: '/users', label: 'Team', icon: UserCog, adminOnly: true },
    { to: '/task-types', label: 'Task Types', icon: Tag, adminOnly: true },
    { to: '/site-config', label: 'Site Config', icon: Palette, adminOnly: true },
    { to: '/profile', label: 'Profile', icon: UserCircle },
  ],
};

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

function Sidebar({ collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const location = useLocation();
  const { isAdmin } = useUserRole();

  const isActive = (path: string) => location.pathname === path;

  const filterItems = (items: NavItem[]) =>
    items.filter((item) => !item.adminOnly || isAdmin);

  const filterSection = (section: NavSection) => {
    if (section.adminOnly && !isAdmin) return null;
    const filtered = filterItems(section.items);
    if (filtered.length === 0) return null;
    return { ...section, items: filtered };
  };

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.to);

    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={onCloseMobile}
        title={collapsed ? item.label : undefined}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
          active
            ? 'bg-primary-600 text-white shadow-sm'
            : 'text-gray-600 hover:bg-white/70 hover:text-gray-900'
        } ${collapsed ? 'justify-center' : ''}`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );
  };

  const renderSection = (section: NavSection) => {
    const filtered = filterSection(section);
    if (!filtered) return null;
    return (
      <div key={section.label}>
        {!collapsed && (
          <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            {section.label}
          </p>
        )}
        {collapsed && <div className="h-px bg-gray-200/80 mx-3 my-2" />}
        <div className="space-y-1">
          {filtered.items.map(renderNavItem)}
        </div>
      </div>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Main nav link */}
      <div className="px-3 pt-5 pb-3">
        {renderNavItem(mainLink)}
      </div>

      {/* Nav sections */}
      <nav className="flex-1 px-3 space-y-5 overflow-y-auto py-2">
        {navSections.map(renderSection).filter(Boolean)}
      </nav>

      {/* Settings section pinned to bottom */}
      <div className="px-3 pb-5 mt-auto pt-2 border-t border-gray-200/60">
        {renderSection(settingsSection)}
      </div>
    </div>
  );

  const sidebarBg = 'var(--admin-cream-dark, #EDE9E3)';
  const sidebarBorder = 'color-mix(in srgb, var(--admin-charcoal, #2A2A2A) 10%, transparent)';

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col transition-all duration-200 ease-out print:hidden`}
        style={{
          width: collapsed ? 72 : 256,
          backgroundColor: sidebarBg,
          borderRight: `1px solid ${sidebarBorder}`,
        }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/25 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Drawer */}
          <aside
            className="fixed inset-y-0 left-0 w-72 flex flex-col animate-slide-in shadow-2xl z-50"
            style={{
              backgroundColor: sidebarBg,
              borderRight: `1px solid ${sidebarBorder}`,
            }}
          >
            <div
              className="flex items-center justify-between h-16 px-5 border-b"
              style={{ borderColor: sidebarBorder }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'var(--primary-600)' }}
                >
                  <span className="text-white font-bold text-sm">A&D</span>
                </div>
                <span className="font-semibold text-gray-900">Ask &amp; Deliver</span>
              </div>
              <button
                onClick={onCloseMobile}
                className="p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-white/60 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}

export default Sidebar;
