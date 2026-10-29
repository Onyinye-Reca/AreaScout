import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

const KEY = 'areascout-city';
const DEFAULT_CITY = 'Lagos';

interface LocationState { city: string; setCity(name: string): void }
const Ctx = createContext<LocationState | null>(null);

/** "port harcourt" → "Port Harcourt", matching how the API stores city names. */
export const tidyCity = (raw: string): string =>
  raw.trim().replace(/\s+/g, ' ').replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());

/** The city the renter is searching in. It's remembered between launches. */
export function LocationProvider({ children }: { children: ReactNode }) {
  const [city, setCityState] = useState(DEFAULT_CITY);

  useEffect(() => {
    SecureStore.getItemAsync(KEY).then((v) => { if (v) setCityState(v); }).catch(() => {});
  }, []);

  const setCity = useCallback((name: string) => {
    const next = tidyCity(name);
    if (next.length < 2) return;
    setCityState(next);
    SecureStore.setItemAsync(KEY, next).catch(() => {});
  }, []);

  const value = useMemo(() => ({ city, setCity }), [city, setCity]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCity(): LocationState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCity must be used inside LocationProvider');
  return v;
}
