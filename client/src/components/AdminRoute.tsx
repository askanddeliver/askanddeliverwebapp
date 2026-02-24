import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserRole } from '../contexts/UserContext';
import Loading from './Loading';

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * Wraps admin-only routes. Redirects members and pending users to /dashboard.
 */
function AdminRoute({ children }: AdminRouteProps) {
  const { isAdmin, isLoading } = useUserRole();

  if (isLoading) {
    return <Loading />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default AdminRoute;
