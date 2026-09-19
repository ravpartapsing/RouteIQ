export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8180';

export interface ServerConfig {
  features: { maps: boolean; routing: boolean; mapMatching: boolean };
  /** Null when maps are off — the portal then never loads a tile style. */
  map: { styleUrl: string; attribution: string } | null;
}

export interface Health {
  status: string;
  stage: string;
  time: string;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(new URL(path, API_BASE_URL), { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${path}`);
  return (await res.json()) as T;
}

export const api = {
  health: () => getJson<Health>('/health'),
  config: () => getJson<ServerConfig>('/config'),
};
