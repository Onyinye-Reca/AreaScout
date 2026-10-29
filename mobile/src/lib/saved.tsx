import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';
import { api, errorMessage } from './api';
import { useAuth } from './auth';
import type { Listing } from './types';

interface SavedState { ids: Set<number>; toggle(id: number): Promise<void> }
const Ctx = createContext<SavedState | null>(null);

export function SavedProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Tagged with the user it belongs to, so a different (or signed-out) user never sees someone else's saves.
  const [state, setState] = useState<{ userId: number; ids: Set<number> } | null>(null);
  const ids = useMemo(() => (user && state?.userId === user.id ? state.ids : new Set<number>()), [user, state]);
  const setIds = useCallback((next: Set<number>) => { if (user) setState({ userId: user.id, ids: next }); }, [user]);

  useEffect(() => {
    if (!user) return;
    api<{ listings: Listing[] }>('/saved').then((r) => setIds(new Set(r.listings.map((l) => l.id)))).catch(() => {});
  }, [user, setIds]);

  const toggle = useCallback(async (id: number) => {
    const was = ids.has(id);
    const next = new Set(ids);
    if (was) next.delete(id);
    else next.add(id);
    setIds(next); // optimistic; rolled back if the server refuses
    try { await api(`/saved/${id}`, { method: was ? 'DELETE' : 'POST' }); }
    catch (e) { setIds(ids); Alert.alert('Couldn’t update saved homes', errorMessage(e)); }
  }, [ids, setIds]);

  const value = useMemo(() => ({ ids, toggle }), [ids, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSaved(): SavedState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSaved must be used inside SavedProvider');
  return v;
}
