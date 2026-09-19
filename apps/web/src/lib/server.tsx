import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ClientConfigResponse } from '@routeiq/contracts';
import { hasSession, publicRequest, request } from './api';

interface Health {
  status: string;
  stage: string;
  time: string;
}

type ServerState =
  | { kind: 'loading' }
  | { kind: 'ok'; health: Health; config: ClientConfigResponse }
  | { kind: 'down'; reason: string };

const ServerContext = createContext<{ state: ServerState; reload: () => void } | null>(null);

/**
 * Health plus feature switches. Signed in, `/config` includes the carrier's own overrides — so
 * this reloads after sign-in and after a switch changes in Settings.
 */
export function ServerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ServerState>({ kind: 'loading' });

  const reload = useCallback(() => {
    Promise.all([
      publicRequest<Health>('GET', '/health'),
      hasSession()
        ? request<ClientConfigResponse>('GET', '/config')
        : publicRequest<ClientConfigResponse>('GET', '/config'),
    ])
      .then(([health, config]) => setState({ kind: 'ok', health, config }))
      .catch((e: unknown) => setState({ kind: 'down', reason: e instanceof Error ? e.message : String(e) }));
  }, []);

  useEffect(reload, [reload]);

  return <ServerContext.Provider value={{ state, reload }}>{children}</ServerContext.Provider>;
}

export function useServer() {
  const ctx = useContext(ServerContext);
  if (!ctx) throw new Error('useServer outside ServerProvider');
  return ctx;
}
