import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from './api';

export interface Loaded<T> { data: T | null; error: ApiError | null; loading: boolean; reload(): void }

/**
 * Loads on mount and again each time the screen regains focus (so saves and messages stay fresh).
 * `deps` are values the request depends on; changing any of them loads again.
 */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []): Loaded<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; }); // after each render, so a load always uses the latest closure
  const key = JSON.stringify(deps);

  const run = useCallback(() => {
    setError(null);
    fnRef.current()
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e : new ApiError(String(e?.message ?? e), -1)))
      .finally(() => setLoading(false));
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps -- `key` stands in for `deps`

  useFocusEffect(run);
  return { data, error, loading, reload: () => { setLoading(true); run(); } };
}
