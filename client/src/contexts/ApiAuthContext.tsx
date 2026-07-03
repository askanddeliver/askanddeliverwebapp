import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
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

const RECOVERABLE_AUTH_ERRORS = new Set([
  'login_required',
  'consent_required',
  'missing_refresh_token',
  'invalid_grant',
]);

/** Same-tab relative path only (avoid open redirects after Auth0 callback). */
function safeReturnTo(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//')) {
    return '/';
  }
  return path;
}

function isRecoverableAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('error' in error)) {
    return false;
  }
  const code = (error as { error?: unknown }).error;
  return typeof code === 'string' && RECOVERABLE_AUTH_ERRORS.has(code);
}

/**
 * Provides Auth0 access tokens to axios via registerAccessTokenGetter (no localStorage).
 * Protected routes should wait for tokenReady before making API calls.
 */
export function ApiAuthProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, getAccessTokenSilently, loginWithRedirect } = useAuth0();
  const [tokenReady, setTokenReady] = useState(false);
  const reloginStarted = useRef(false);

  useEffect(() => {
    reloginStarted.current = false;
  }, [isAuthenticated]);

  const promptReLogin = useCallback(() => {
    if (reloginStarted.current) return;
    reloginStarted.current = true;

    const returnTo = safeReturnTo(
      `${window.location.pathname}${window.location.search}`
    );
    loginWithRedirect({
      appState: { returnTo },
      authorizationParams: { screen_hint: 'login' },
    });
  }, [loginWithRedirect]);

  const handleTokenError = useCallback(
    (error: unknown): boolean => {
      if (!isRecoverableAuthError(error)) {
        console.error('Error getting access token:', error);
        return false;
      }
      console.warn('Session expired — redirecting to login');
      promptReLogin();
      return true;
    },
    [promptReLogin]
  );

  const getToken = useCallback(async (): Promise<string | null> => {
    if (!isAuthenticated) return null;
    try {
      return await getAccessTokenSilently();
    } catch (error) {
      handleTokenError(error);
      return null;
    }
  }, [isAuthenticated, getAccessTokenSilently, handleTokenError]);

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
      setTokenReady(false);
      handleTokenError(error);
    }
  }, [isAuthenticated, getAccessTokenSilently, handleTokenError]);

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
