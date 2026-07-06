import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  UserCircle,
  CalendarDays,
  X,
  PanelLeft,
  PanelLeftClose,
  ArrowLeft,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useUserRole } from '../../contexts/UserContext';

const RAIL_WIDTH_COLLAPSED = 56;
const RAIL_WIDTH_EXPANDED = 248;

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { to: '/member', label: 'Hub', icon: LayoutDashboard },
  { to: '/member/projects', label: 'Projects', icon: FolderOpen },
  { to: '/member/schedule', label: 'Schedule', icon: CalendarDays },
  { to: '/member/entries', label: 'Entries', icon: FileText },
  { to: '/member/profile', label: 'Profile', icon: UserCircle },
  { to: '/dashboard', label: 'Admin dashboard', icon: ArrowLeft, adminOnly: true },
];

interface MemberSidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  railExpanded: boolean;
  onToggleRailExpanded: () => void;
}

function MemberSidebar({
  mobileOpen,
  onCloseMobile,
  railExpanded,
  onToggleRailExpanded,
}: MemberSidebarProps) {
  const location = useLocation();
  const { isAdmin } = useUserRole();
  const expanded = railExpanded;

  const items = navItems.filter((item) => !item.adminOnly || isAdmin);

  const isActive = (path: string) => {
    if (path === '/member') return location.pathname === '/member';
    return location.pathname.startsWith(path);
  };

  const railIconOnlyClass = (active: boolean) =>
    [
      'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-150 ease-out',
      active
        ? 'bg-primary-50 text-primary-700 before:absolute before:left-[-10px] before:top-2 before:bottom-2 before:w-0.5 before:rounded-r before:bg-primary-600'
        : 'text-[var(--admin-text-3)] hover:bg-[var(--admin-app-bg)] hover:text-[var(--admin-text)]',
    ].join(' ');

  const railWideClass = (active: boolean) =>
    [
      'relative flex min-h-9 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ease-out',
      active
        ? 'bg-primary-50 text-primary-700 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-r before:bg-primary-600'
        : 'text-[var(--admin-text-2)] hover:bg-[var(--admin-app-bg)] hover:text-[var(--admin-text)]',
    ].join(' ');

  const renderIconOnlyItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.to);
    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={onCloseMobile}
        title={item.label}
        aria-label={item.label}
        className={railIconOnlyClass(active)}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
      </Link>
    );
  };

  const renderWideItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.to);
    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={onCloseMobile}
        title={item.label}
        className={railWideClass(active)}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
        <span className="truncate">{item.label}</span>
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

  const desktopRailWidth = expanded ? RAIL_WIDTH_EXPANDED : RAIL_WIDTH_COLLAPSED;

  const desktopRail = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={`flex shrink-0 items-center gap-2 border-b px-3 py-3 ${expanded ? 'justify-start' : 'flex-col justify-center gap-0 border-0 pb-0 pt-2.5'}`}
        style={{ borderColor: 'var(--admin-border)' }}
      >
        <Link
          to="/member"
          onClick={onCloseMobile}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold tracking-tight text-white transition-transform duration-150 hover:scale-[1.02] ${expanded ? '' : 'mb-3'}`}
          style={{ backgroundColor: 'var(--primary-600)' }}
          title="Member hub"
          aria-label="Go to member hub"
        >
          A&amp;D
        </Link>
        {expanded && (
          <span className="truncate text-sm font-semibold text-[var(--admin-text)]">
            Member
          </span>
        )}
      </div>

      <div
        className={`flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden py-2 ${
          expanded ? 'px-2' : 'items-center px-2.5'
        }`}
      >
        {expanded ? (
          <div className="flex flex-col gap-0.5">
            {items.map(renderWideItem)}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-0.5">
            {items.map(renderIconOnlyItem)}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t" style={{ borderColor: 'var(--admin-border)' }}>
        <button
          type="button"
          onClick={onToggleRailExpanded}
          className={`flex w-full items-center gap-2 py-2.5 text-[var(--admin-text-3)] transition-colors duration-150 hover:bg-[var(--admin-app-bg)] hover:text-[var(--admin-text)] ${
            expanded ? 'justify-start px-3' : 'justify-center px-0'
          }`}
          title={expanded ? 'Collapse navigation' : 'Expand navigation'}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse sidebar labels' : 'Expand sidebar labels'}
        >
          {expanded ? (
            <PanelLeftClose className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
          ) : (
            <PanelLeft className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
          )}
          {expanded && (
            <span className="text-xs font-medium text-[var(--admin-text-2)]">Collapse</span>
          )}
        </button>
      </div>
    </div>
  );

  const mobileNav = (
    <div className="flex h-full min-h-0 flex-col">
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map(renderMobileRow)}
      </nav>
    </div>
  );

  return (
    <>
      <aside
        className="hidden min-h-0 shrink-0 flex-col border-r print:hidden lg:flex lg:self-stretch"
        style={{
          width: desktopRailWidth,
          minWidth: desktopRailWidth,
          backgroundColor: 'var(--admin-surface)',
          borderColor: 'var(--admin-border)',
          transition: 'width 200ms ease, min-width 200ms ease',
        }}
      >
        {desktopRail}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-black/25 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
            onKeyDown={(e) => e.key === 'Escape' && onCloseMobile()}
            role="presentation"
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
              className="flex h-14 shrink-0 items-center justify-between border-b px-4"
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
                  Member
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

export default MemberSidebar;
