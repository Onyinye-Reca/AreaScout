import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

/** In dev the API runs on the same machine as Metro, so reuse the host the phone already reaches. */
function baseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:8000`;
}
export const API_URL = baseUrl();

const TOKEN_KEY = 'areascout-token';
let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const session = {
  async restore(): Promise<string | null> {
    try { token = await SecureStore.getItemAsync(TOKEN_KEY); } catch { token = null; }
    return token;
  },
  async set(value: string | null): Promise<void> {
    token = value;
    try {
      if (value) await SecureStore.setItemAsync(TOKEN_KEY, value);
      else await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch { /* keychain unavailable: the session just won't survive a restart */ }
  },
  onUnauthorized(fn: () => void) { onUnauthorized = fn; },
};

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
  /** True when the server could not be reached at all. */
  get offline(): boolean { return this.status === 0; }
}

export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/v1${path}`, {
      method: opts.method ?? 'GET',
      headers: { ...(opts.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError('Can’t reach AreaScout. Check your connection and try again.', 0);
  }
  let json: any = null;
  try { json = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    if (res.status === 401 && token) { await session.set(null); onUnauthorized?.(); }
    const detail = json?.errors?.length ? json.errors.map((e: { message: string }) => e.message).join(', ') : json?.message;
    throw new ApiError(detail ?? 'Something went wrong. Please try again.', res.status);
  }
  return json?.data as T;
}

export const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : 'Something went wrong');

/** Uploads one listing photo (landlords and agents only) and returns its public URL. */
export async function uploadPhoto(uri: string): Promise<string> {
  const form = new FormData();
  form.append('file', { uri, name: 'photo.jpg', type: 'image/jpeg' } as unknown as Blob);
  let res: Response;
  try {
    res = await fetch(`${API_URL}/v1/uploads`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
  } catch {
    throw new ApiError('Can’t reach AreaScout. Check your connection and try again.', 0);
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(json?.message ?? 'Couldn’t upload that photo', res.status);
  return json.data.url as string;
}
