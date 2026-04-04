import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import api, { registerAccessTokenGetter } from '../services/api';

interface ApiAuthContextValue {
  tokenReady: boolean;
  refetchToken: () => Promise<void>;
}

const ApiAuthContext = createContext<ApiAuthContextValue | null>(null);

/**
 * Provides Auth0 access tokens to axios via registerAccessTokenGetter (no localStorage).
 * Protected routes should wait for tokenReady before making API calls.
 */
export function ApiAuthProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [tokenReady, setTokenReady] = useState(false);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (!isAuthenticated) return null;
    try {
      return await getAccessTokenSilently();
    } catch {
      return null;
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  useEffect(() => {
    registerAccessTokenGetter(getToken);
    return () => registerAccessTokenGetter(null);
  }, [getToken]);

  const setupToken = useCallback(async () => {
    if (!isAuthenticated) {
      setTokenReady(false);
      return;
    }
    try {
      await getAccessTokenSilently();
      setTokenReady(true);
    } catch (error) {
      console.error('Error getting access token:', error);
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
