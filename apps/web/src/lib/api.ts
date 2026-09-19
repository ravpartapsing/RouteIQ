import type { ErrorBody, TokenPair } from '@routeiq/contracts';

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8180';

// The refresh token survives a reload; the access token lives only in memory.
// Fine for UAT on one Mac. Before a public launch, move the refresh token to an httpOnly cookie
// on an API domain the portal shares.
const REFRESH_KEY = 'routeiq.refresh';

let accessToken: string | null = null;

function readRefresh(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function setTokens(t: TokenPair | null) {
  accessToken = t?.accessToken ?? null;
  try {
    if (t) localStorage.setItem(REFRESH_KEY, t.refreshToken);
    else localStorage.removeItem(REFRESH_KEY);
  } catch {
    /* storage blocked — the session just won't survive a reload */
  }
}

export const hasSession = () => !!accessToken || !!readRefresh();

export class ApiFailure extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

async function raw(method: string, path: string, body?: unknown, token?: string | null): Promise<Response> {
  return fetch(new URL(path, API_BASE_URL), {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15_000),
  });
}

async function toFailure(res: Response): Promise<ApiFailure> {
  const json = (await res.json().catch(() => null)) as ErrorBody | null;
  return new ApiFailure(
    res.status,
    json?.error.code ?? 'HTTP_ERROR',
    json?.error.message ?? `Request failed (${res.status})`,
    json?.error.fields ?? {},
  );
}

// Several requests can hit a 401 at once; they must share one refresh, or the second refresh would
// present an already-rotated token and trip reuse detection.
let refreshing: Promise<boolean> | null = null;

export function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    const rt = readRefresh();
    if (!rt) return false;
    const res = await raw('POST', '/v1/auth/refresh', { refreshToken: rt });
    if (!res.ok) {
      setTokens(null);
      return false;
    }
    setTokens((await res.json()) as TokenPair);
    return true;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/** Authenticated call. Refreshes once on a 401, then gives up. */
export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!accessToken && readRefresh()) await refreshSession();
  let res = await raw(method, path, body, accessToken);
  if (res.status === 401 && readRefresh() && (await refreshSession())) {
    res = await raw(method, path, body, accessToken);
  }
  if (!res.ok) throw await toFailure(res);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

/** Unauthenticated call for sign-in endpoints. */
export async function publicRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await raw(method, path, body);
  if (!res.ok) throw await toFailure(res);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export async function signOut(): Promise<void> {
  const rt = readRefresh();
  setTokens(null);
  if (rt) await raw('POST', '/v1/auth/logout', { refreshToken: rt }).catch(() => undefined);
}
