import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserRole } from '../contexts/UserContext';
import Loading from './Loading';

interface MemberOrAdminRouteProps {
  children: ReactNode;
}

/** Admin app routes — blocks client portal users. */
function MemberOrAdminRoute({ children }: MemberOrAdminRouteProps) {
  const { isClient, isLoading, homeRoute } = useUserRole();

  if (isLoading) {
    return <Loading />;
  }

  if (isClient) {
    return <Navigate to={homeRoute} replace />;
  }

  return <>{children}</>;
}

export default MemberOrAdminRoute;
