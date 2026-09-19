import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type {
  ActivateUserRequest,
  LoginRequest,
  MeResponse,
  RegisterRequest,
  TokenPair,
} from '@routeiq/contracts';
import { hasSession, publicRequest, request, setTokens, signOut } from './api';
import { useServer } from './server';

type AuthState = { kind: 'loading' } | { kind: 'anon' } | { kind: 'authed'; me: MeResponse };

interface AuthApi {
  state: AuthState;
  login: (body: LoginRequest) => Promise<void>;
  register: (body: RegisterRequest) => Promise<void>;
  activate: (body: ActivateUserRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ kind: 'loading' });
  const { reload } = useServer();

  const loadMe = useCallback(async () => {
    try {
      const me = await request<MeResponse>('GET', '/v1/me');
      // The portal is for carrier staff; a driver token has no business here.
      if (me.principal.kind !== 'USER') throw new Error('driver token');
      setState({ kind: 'authed', me });
    } catch {
      setTokens(null);
      setState({ kind: 'anon' });
    }
    reload();
  }, [reload]);

  useEffect(() => {
    if (hasSession()) void loadMe();
    else setState({ kind: 'anon' });
  }, [loadMe]);

  const signedIn = async (tokens: TokenPair) => {
    setTokens(tokens);
    await loadMe();
  };

  const api: AuthApi = {
    state,
    login: async (body) => signedIn(await publicRequest<TokenPair>('POST', '/v1/auth/login', body)),
    register: async (body) => signedIn(await publicRequest<TokenPair>('POST', '/v1/auth/register', body)),
    activate: async (body) => signedIn(await publicRequest<TokenPair>('POST', '/v1/auth/activate', body)),
    logout: async () => {
      await signOut();
      setState({ kind: 'anon' });
      reload();
    },
  };

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}

/** The signed-in user; only call under a route that requires sign-in. */
export function useMe(): MeResponse & { principal: Extract<MeResponse['principal'], { kind: 'USER' }> } {
  const { state } = useAuth();
  if (state.kind !== 'authed' || state.me.principal.kind !== 'USER') throw new Error('not signed in');
  return state.me as never;
}
