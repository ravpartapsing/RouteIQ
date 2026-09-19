import { SignJWT, jwtVerify, errors as joseErrors } from 'jose';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import type { UserRole } from '@routeiq/contracts';
import { randomSecret } from './crypto.js';

export const ACCESS_TTL_SECONDS = 15 * 60;
export const USER_REFRESH_DAYS = Number(process.env['REFRESH_TOKEN_TTL_DAYS'] ?? 30);
export const DRIVER_REFRESH_DAYS = Number(process.env['DRIVER_REFRESH_TOKEN_TTL_DAYS'] ?? 180);

const ISSUER = 'routeiq';
const AUDIENCE = 'routeiq-api';

export interface AuthContext {
  kind: 'USER' | 'DRIVER';
  id: string;
  tenantId: string;
  role: UserRole | null;
}

/**
 * Locally the secret is an env var. Deployed it lives in SSM Parameter Store (SecureString) and is
 * fetched once per Lambda container — so it is never in the function's configuration.
 */
let secret: Promise<Uint8Array> | undefined;
function signingKey(): Promise<Uint8Array> {
  secret ??= (async () => {
    const param = process.env['JWT_SECRET_PARAM'];
    let value = process.env['JWT_SECRET'];
    if (param) {
      const out = await new SSMClient({}).send(new GetParameterCommand({ Name: param, WithDecryption: true }));
      value = out.Parameter?.Value;
    }
    if (!value || value.length < 32) throw new Error('JWT secret missing or shorter than 32 characters');
    return new TextEncoder().encode(value);
  })();
  return secret;
}

export async function signAccessToken(ctx: AuthContext): Promise<string> {
  return new SignJWT({ tid: ctx.tenantId, knd: ctx.kind === 'USER' ? 'U' : 'D', ...(ctx.role ? { rol: ctx.role } : {}) })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(ctx.id)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
    .sign(await signingKey());
}

export async function verifyAccessToken(token: string): Promise<AuthContext | null> {
  try {
    const { payload } = await jwtVerify(token, await signingKey(), { issuer: ISSUER, audience: AUDIENCE });
    if (typeof payload.sub !== 'string' || typeof payload['tid'] !== 'string') return null;
    return {
      kind: payload['knd'] === 'D' ? 'DRIVER' : 'USER',
      id: payload.sub,
      tenantId: payload['tid'],
      role: (payload['rol'] as UserRole | undefined) ?? null,
    };
  } catch (error) {
    if (error instanceof joseErrors.JOSEError) return null;
    throw error;
  }
}

/**
 * Refresh token: `rt1.<U|D>.<principalId>.<sessionId>.<secret>`. The ids let the server fetch the
 * session with one GetItem; only the secret's hash is stored, so a table dump yields no tokens.
 */
export interface RefreshParts {
  kind: 'USER' | 'DRIVER';
  principalId: string;
  sessionId: string;
  secret: string;
}

export function encodeRefreshToken(p: Omit<RefreshParts, 'secret'>, secretValue = randomSecret()) {
  return {
    token: `rt1.${p.kind === 'USER' ? 'U' : 'D'}.${p.principalId}.${p.sessionId}.${secretValue}`,
    secret: secretValue,
  };
}

export function decodeRefreshToken(token: string): RefreshParts | null {
  const parts = token.split('.');
  if (parts.length !== 5 || parts[0] !== 'rt1' || (parts[1] !== 'U' && parts[1] !== 'D')) return null;
  const [, k, principalId, sessionId, secretValue] = parts as [string, string, string, string, string];
  if (!principalId || !sessionId || !secretValue) return null;
  return { kind: k === 'U' ? 'USER' : 'DRIVER', principalId, sessionId, secret: secretValue };
}
