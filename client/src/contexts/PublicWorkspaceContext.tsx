import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getPublicWorkspaceKey,
  resolveInitialPublicWorkspaceKey,
  setPublicWorkspaceKey,
} from '../lib/publicWorkspace';

interface PublicWorkspaceContextValue {
  workspaceKey: string | null;
  setDevWorkspaceOverride: (key: string | null) => void;
}

const PublicWorkspaceContext = createContext<PublicWorkspaceContextValue | null>(
  null
);

interface PublicWorkspaceProviderProps {
  children: ReactNode;
}

export function PublicWorkspaceProvider({ children }: PublicWorkspaceProviderProps) {
  const [devOverride, setDevWorkspaceOverride] = useState<string | null>(null);
  const initialKey = useMemo(() => resolveInitialPublicWorkspaceKey(), []);

  const workspaceKey = devOverride ?? initialKey;

  useEffect(() => {
    setPublicWorkspaceKey(workspaceKey);
    return () => setPublicWorkspaceKey(null);
  }, [workspaceKey]);

  const value = useMemo(
    () => ({
      workspaceKey,
      setDevWorkspaceOverride,
    }),
    [workspaceKey]
  );

  return (
    <PublicWorkspaceContext.Provider value={value}>
      {children}
    </PublicWorkspaceContext.Provider>
  );
}

export function usePublicWorkspace(): PublicWorkspaceContextValue {
  const ctx = useContext(PublicWorkspaceContext);
  if (!ctx) {
    return {
      workspaceKey: getPublicWorkspaceKey(),
      setDevWorkspaceOverride: () => {},
    };
  }
  return ctx;
}
