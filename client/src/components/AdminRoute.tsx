import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserRole } from '../contexts/UserContext';
import Loading from './Loading';

interface AdminRouteProps {
  children: ReactNode;
}

/** Admin-only routes. Other roles redirect to their home route. */
function AdminRoute({ children }: AdminRouteProps) {
  const { isAdmin, isLoading, homeRoute } = useUserRole();

  if (isLoading) {
    return <Loading />;
  }

  if (!isAdmin) {
    return <Navigate to={homeRoute} replace />;
  }

  return <>{children}</>;
}

export default AdminRoute;
