import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Receipt,
  FileStack,
  Users,
  FolderOpen,
  Inbox,
  Image,
  Tag,
  UserCircle,
  Palette,
  UserCog,
  X,
  CalendarClock,
  Briefcase,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useUserRole } from '../contexts/UserContext';

const RAIL_WIDTH = 56;

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
      { to: '/time-blocks', label: 'Block Time', icon: CalendarClock, adminOnly: true },
      { to: '/reports', label: 'Reports', icon: BarChart3, adminOnly: true },
      { to: '/invoices', label: 'Invoices', icon: Receipt, adminOnly: true },
      { to: '/proposals', label: 'Proposals', icon: FileStack, adminOnly: true },
    ],
  },
  {
    label: 'Manage',
    items: [
      { to: '/clients', label: 'Clients', icon: Users, adminOnly: true },
      { to: '/internal-workspace', label: 'Internal Workspace', icon: Briefcase, adminOnly: true },
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
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
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

  const railItemClass = (active: boolean) =>
    [
      'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-150 ease-out',
      active
        ? 'bg-primary-50 text-primary-700 before:absolute before:left-[-10px] before:top-2 before:bottom-2 before:w-0.5 before:rounded-r before:bg-primary-600'
        : 'text-[var(--admin-text-3)] hover:bg-[var(--admin-app-bg)] hover:text-[var(--admin-text)]',
    ].join(' ');

  const renderRailItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.to);

    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={onCloseMobile}
        title={item.label}
        aria-label={item.label}
        className={railItemClass(active)}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
      </Link>
    );
  };

  const renderMobileRow = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.to);

    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={onCloseMobile}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
          active
            ? 'bg-primary-50 text-primary-700'
            : 'text-[var(--admin-text-2)] hover:bg-[var(--admin-app-bg)] hover:text-[var(--admin-text)]'
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
        <span>{item.label}</span>
      </Link>
    );
  };

  const RailDivider = () => (
    <div
      className="my-2 h-px w-6 shrink-0"
      style={{ backgroundColor: 'var(--admin-border)' }}
      aria-hidden
    />
  );

  const desktopRail = (
    <div className="flex h-full flex-col items-center pt-2.5 pb-3">
      <Link
        to="/dashboard"
        onClick={onCloseMobile}
        className="mb-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold tracking-tight text-white transition-transform duration-150 hover:scale-[1.02]"
        style={{ backgroundColor: 'var(--primary-600)' }}
        title="Ask & Deliver — Dashboard"
        aria-label="Go to dashboard"
      >
        A&amp;D
      </Link>

      <div className="flex w-full flex-1 flex-col items-center gap-0.5 overflow-y-auto overflow-x-hidden px-2.5">
        {renderRailItem(mainLink)}
        <RailDivider />
        {navSections.map((section) => {
          const filtered = filterSection(section);
          if (!filtered) return null;
          return (
            <div key={section.label} className="flex flex-col items-center gap-0.5">
              {filtered.items.map(renderRailItem)}
              <RailDivider />
            </div>
          );
        })}
        <div className="min-h-2 flex-1" aria-hidden />
        {(filterSection(settingsSection)?.items ?? []).map(renderRailItem)}
      </div>
    </div>
  );

  const mobileNav = (
    <div className="flex h-full flex-col">
      <div className="px-3 pt-5 pb-2">{renderMobileRow(mainLink)}</div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {navSections.map((section) => {
          const filtered = filterSection(section);
          if (!filtered) return null;
          return (
            <div key={section.label}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--admin-text-3)]">
                {section.label}
              </p>
              <div className="space-y-1">{filtered.items.map(renderMobileRow)}</div>
            </div>
          );
        })}
      </nav>
      <div className="mt-auto border-t pt-2 pb-5" style={{ borderColor: 'var(--admin-border)' }}>
        <div className="px-3">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--admin-text-3)]">
            {settingsSection.label}
          </p>
          <div className="space-y-1">
            {(filterSection(settingsSection)?.items ?? []).map(renderMobileRow)}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className="hidden h-full shrink-0 flex-col border-r print:hidden lg:flex"
        style={{
          width: RAIL_WIDTH,
          backgroundColor: 'var(--admin-surface)',
          borderColor: 'var(--admin-border)',
        }}
      >
        {desktopRail}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-black/25 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
            aria-hidden
          />
          <aside
            className="animate-slide-in fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col shadow-2xl"
            style={{
              backgroundColor: 'var(--admin-surface)',
              borderRight: '1px solid var(--admin-border)',
            }}
          >
            <div
              className="flex h-14 items-center justify-between border-b px-4"
              style={{ borderColor: 'var(--admin-border)' }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                  style={{ backgroundColor: 'var(--primary-600)' }}
                >
                  A&amp;D
                </div>
                <span className="truncate font-semibold text-[var(--admin-text)]">
                  Ask &amp; Deliver
                </span>
              </div>
              <button
                type="button"
                onClick={onCloseMobile}
                className="rounded-lg p-2 text-[var(--admin-text-3)] transition-colors hover:bg-[var(--admin-app-bg)] hover:text-[var(--admin-text)]"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {mobileNav}
          </aside>
        </div>
      )}
    </>
  );
}

export default Sidebar;
