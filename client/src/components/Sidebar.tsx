import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  BarChart3,
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
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          active
            ? 'bg-primary-50 text-primary-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
          <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            {section.label}
          </p>
        )}
        {collapsed && <div className="border-t border-gray-200 mx-3 my-1" />}
        <div className="space-y-0.5">
          {filtered.items.map(renderNavItem)}
        </div>
      </div>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Main nav link */}
      <div className="px-3 pt-4 pb-2">
        {renderNavItem(mainLink)}
      </div>

      {/* Nav sections */}
      <nav className="flex-1 px-3 space-y-4 overflow-y-auto">
        {navSections.map(renderSection).filter(Boolean)}
      </nav>

      {/* Settings section pinned to bottom */}
      <div className="px-3 pb-4 mt-auto">
        {renderSection(settingsSection)}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-gray-200 transition-all duration-200 ease-in-out print:hidden ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Drawer */}
          <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 shadow-xl z-50 flex flex-col animate-slide-in">
            <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">A&D</span>
                </div>
                <span className="font-bold text-gray-900">Ask &amp; Deliver</span>
              </div>
              <button
                onClick={onCloseMobile}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
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
