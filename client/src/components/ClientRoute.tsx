import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserRole } from '../contexts/UserContext';
import Loading from './Loading';

interface ClientRouteProps {
  children: ReactNode;
}

/** Portal routes — client role only. */
function ClientRoute({ children }: ClientRouteProps) {
  const { isClient, isAdmin, isMember, isLoading, homeRoute } = useUserRole();

  if (isLoading) {
    return <Loading />;
  }

  if (!isClient) {
    if (isAdmin) return <Navigate to="/dashboard" replace />;
    if (isMember) return <Navigate to="/member" replace />;
    return <Navigate to={homeRoute} replace />;
  }

  return <>{children}</>;
}

export default ClientRoute;
