import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import api, { setAuthToken } from '../services/api';

interface ApiAuthContextValue {
  tokenReady: boolean;
  refetchToken: () => Promise<void>;
}

const ApiAuthContext = createContext<ApiAuthContextValue | null>(null);

/**
 * Provides the Auth0 access token to API requests and exposes tokenReady.
 * Protected routes should wait for tokenReady before making API calls.
 */
export function ApiAuthProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [tokenReady, setTokenReady] = useState(false);

  const setupToken = useCallback(async () => {
    if (!isAuthenticated) {
      setAuthToken(null);
      setTokenReady(false);
      return;
    }
    try {
      const token = await getAccessTokenSilently();
      setAuthToken(token);
      setTokenReady(true);
    } catch (error) {
      console.error('Error getting access token:', error);
      setAuthToken(null);
      setTokenReady(false);
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  useEffect(() => {
    setupToken();
  }, [setupToken]);

  const value: ApiAuthContextValue = {
    tokenReady: isAuthenticated ? tokenReady : true,
    refetchToken: setupToken,
  };

  return (
    <ApiAuthContext.Provider value={value}>
      {children}
    </ApiAuthContext.Provider>
  );
}

export function useApiAuth(): ApiAuthContextValue {
  const ctx = useContext(ApiAuthContext);
  if (!ctx) {
    throw new Error('useApiAuth must be used within ApiAuthProvider');
  }
  return ctx;
}

export { api };
