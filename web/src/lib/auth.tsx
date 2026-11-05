import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, get, post } from './api';
import type { Bootstrap, ModuleRecord, User } from './types';

interface AuthContextValue {
  state: Bootstrap | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  can: (action: string) => boolean;
  level: number;
  modules: ModuleRecord[];
  user: User | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Bootstrap | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await get<Bootstrap>('/auth/me');
      setState(data);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setState(null);
      }
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    const handler = () => setState(null);
    window.addEventListener('mmv:unauthorized', handler);
    return () => window.removeEventListener('mmv:unauthorized', handler);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await post<Bootstrap>('/auth/login', { username, password });
    setState(data);
  }, []);

  const logout = useCallback(async () => {
    try {
      await post('/auth/logout');
    } catch {
      // sessão já encerrada
    }
    setState(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      loading,
      login,
      logout,
      refresh,
      can: (action: string) => Boolean(state?.permissions?.includes(action)),
      level: state?.user.level ?? 0,
      modules: state?.modules ?? [],
      user: state?.user ?? null,
    }),
    [state, loading, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}

export function useCan(action: string) {
  return useAuth().can(action);
}
