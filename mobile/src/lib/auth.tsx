import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, session } from './api';
import type { User } from './types';

interface AuthState {
  user: User | null;
  ready: boolean;
  signIn(email: string, password: string): Promise<void>;
  signUp(input: { name: string; phone: string; email: string; password: string; role: 'tenant' | 'landlord' | 'agent' }): Promise<void>;
  signOut(): Promise<void>;
  /** Replace the signed-in user's details after they've been changed on the server. */
  updateUser(user: User): void;
}

const Ctx = createContext<AuthState | null>(null);
type AuthResult = { user: User; token: string };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    session.onUnauthorized(() => setUser(null));
    (async () => {
      if (await session.restore()) {
        try { setUser((await api<{ user: User }>('/me')).user); } catch { /* expired or offline: show welcome */ }
      }
      setReady(true);
    })();
  }, []);

  const accept = useCallback(async (r: AuthResult) => { await session.set(r.token); setUser(r.user); }, []);

  const value = useMemo<AuthState>(() => ({
    user, ready,
    signIn: async (email, password) => accept(await api<AuthResult>('/auth/login', { method: 'POST', body: { email, password } })),
    signUp: async (input) => accept(await api<AuthResult>('/auth/register', { method: 'POST', body: input })),
    updateUser: setUser,
    signOut: async () => { try { await api('/auth/logout', { method: 'POST' }); } catch { /* ignore */ } await session.set(null); setUser(null); },
  }), [user, ready, accept]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
