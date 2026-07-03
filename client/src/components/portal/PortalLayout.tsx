import { ReactNode } from 'react';
import { Link, Navigate, Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth0 } from '@auth0/auth0-react';
import { useUserRole } from '../../contexts/UserContext';
import PortalNav from './PortalNav';

interface PortalLayoutProps {
  children?: ReactNode;
}

function PortalLayout({ children }: PortalLayoutProps) {
  const { logout } = useAuth0();
  const { user, isClient, isLoading, homeRoute } = useUserRole();

  if (!isLoading && !isClient) {
    return <Navigate to={homeRoute} replace />;
  }

  return (
    <div className="min-h-screen bg-brand-cream">
      <header className="border-b border-neutral-200 bg-white">
        <div className="container-public flex items-center justify-between py-4">
          <Link to="/portal" className="font-display text-lg text-brand-charcoal">
            Ask &amp; Deliver
          </Link>
          <div className="flex items-center gap-4">
            {user?.name && (
              <span className="hidden text-sm text-neutral-600 sm:inline">{user.name}</span>
            )}
            <button
              type="button"
              onClick={() =>
                logout({ logoutParams: { returnTo: window.location.origin } })
              }
              className="inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-brand-charcoal"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
        <PortalNav />
      </header>
      <main className="container-public py-8">{children ?? <Outlet />}</main>
    </div>
  );
}

export default PortalLayout;
