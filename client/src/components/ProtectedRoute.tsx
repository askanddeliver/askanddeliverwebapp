import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import Loading from './Loading';
import { useApiAuth } from '../contexts/ApiAuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { pathname, search } = useLocation();
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const { tokenReady } = useApiAuth();

  if (isLoading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    loginWithRedirect({
      appState: { returnTo: `${pathname}${search}` },
      authorizationParams: { screen_hint: 'login' },
    });
    return <Loading />;
  }

  // Wait for API token before allowing API calls (prevents 400/403 from missing token)
  if (!tokenReady) {
    return <Loading />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
