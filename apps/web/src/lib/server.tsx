import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type Health, type ServerConfig } from './api';

type ServerState =
  | { kind: 'loading' }
  | { kind: 'ok'; health: Health; config: ServerConfig }
  | { kind: 'down'; reason: string };

const ServerContext = createContext<{ state: ServerState; retry: () => void } | null>(null);

/** Fetches health + feature switches once; every screen reads the same answer. */
export function ServerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ServerState>({ kind: 'loading' });

  const load = useCallback(() => {
    setState({ kind: 'loading' });
    Promise.all([api.health(), api.config()])
      .then(([health, config]) => setState({ kind: 'ok', health, config }))
      .catch((e: unknown) => setState({ kind: 'down', reason: e instanceof Error ? e.message : String(e) }));
  }, []);

  useEffect(load, [load]);

  return <ServerContext.Provider value={{ state, retry: load }}>{children}</ServerContext.Provider>;
}

export function useServer() {
  const ctx = useContext(ServerContext);
  if (!ctx) throw new Error('useServer outside ServerProvider');
  return ctx;
}
