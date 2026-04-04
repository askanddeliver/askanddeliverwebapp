import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { usersApi } from '../services/api';
import type { User, UserRole } from '../types';

interface UserContextValue {
  user: User | null;
  role: UserRole | null;
  isAdmin: boolean;
  isMember: boolean;
  isPending: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth0();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    if (!isAuthenticated) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const res = await usersApi.getMe();
      setUser(res.data);
    } catch (err) {
      console.error('Failed to fetch user:', err);
      setError('Failed to load user profile');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const role = user?.role ?? null;
  const value: UserContextValue = {
    user,
    role,
    isAdmin: role === 'admin',
    isMember: role === 'member',
    isPending: role === 'pending',
    isLoading,
    error,
    refetch: fetchUser,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserRole(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useUserRole must be used within UserProvider');
  }
  return ctx;
}
