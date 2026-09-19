import { sessions, users, drivers, credentials, key, type SessionRecord } from '@routeiq/data';
import type { TokenPair, UserRole } from '@routeiq/contracts';
import { newId, sha256, safeEqual } from '../lib/crypto.js';
import {
  ACCESS_TTL_SECONDS,
  DRIVER_REFRESH_DAYS,
  USER_REFRESH_DAYS,
  decodeRefreshToken,
  encodeRefreshToken,
  signAccessToken,
} from '../lib/tokens.js';
import { unauthorized } from '../lib/errors.js';

interface IssueInput {
  kind: 'USER' | 'DRIVER';
  principalId: string;
  tenantId: string;
  role: UserRole | null;
  device?: { id: string; name: string | null };
}

const addDays = (now: Date, days: number) => new Date(now.getTime() + days * 86_400_000).toISOString();

/** Starts a new session: a fresh refresh secret and an access token to go with it. */
export async function issueTokens(input: IssueInput, now = new Date()): Promise<TokenPair> {
  const days = input.kind === 'USER' ? USER_REFRESH_DAYS : DRIVER_REFRESH_DAYS;
  const sessionId = newId();
  const { token, secret } = encodeRefreshToken({ kind: input.kind, principalId: input.principalId, sessionId });
  const record: SessionRecord = {
    id: sessionId,
    principalKind: input.kind,
    principalId: input.principalId,
    tenantId: input.tenantId,
    secretHash: sha256(secret),
    deviceId: input.device?.id ?? null,
    deviceName: input.device?.name ?? null,
    createdAt: now.toISOString(),
    lastUsedAt: now.toISOString(),
    expiresAt: addDays(now, days),
  };
  await sessions.createSession(record, days);
  return {
    accessToken: await signAccessToken({ kind: input.kind, id: input.principalId, tenantId: input.tenantId, role: input.role }),
    expiresIn: ACCESS_TTL_SECONDS,
    refreshToken: token,
  };
}

/**
 * Exchanges a refresh token for a new pair. The old secret stops working immediately.
 *
 * If a token that was already rotated is presented again, someone else has a copy of it — so every
 * session that person has is revoked, the thief's and the real owner's alike. The owner signs in
 * again; the thief cannot.
 */
export async function refreshTokens(refreshToken: string, now = new Date()): Promise<TokenPair> {
  const parts = decodeRefreshToken(refreshToken);
  if (!parts) throw unauthorized('Session expired — sign in again');

  const session = await sessions.getSession(parts.kind, parts.principalId, parts.sessionId);
  if (!session || session.expiresAt <= now.toISOString()) throw unauthorized('Session expired — sign in again');

  const presented = sha256(parts.secret);
  if (!safeEqual(presented, session.secretHash)) {
    await sessions.revokeAllSessions(parts.kind, parts.principalId);
    throw unauthorized('Session was used elsewhere — sign in again');
  }

  const role = await currentStanding(parts.kind, parts.principalId, session);

  const { token, secret } = encodeRefreshToken({
    kind: parts.kind,
    principalId: parts.principalId,
    sessionId: parts.sessionId,
  });
  const rotated = await sessions.rotateSession(
    parts.kind,
    parts.principalId,
    parts.sessionId,
    presented,
    sha256(secret),
    now.toISOString(),
  );
  if (!rotated) {
    await sessions.revokeAllSessions(parts.kind, parts.principalId);
    throw unauthorized('Session was used elsewhere — sign in again');
  }

  return {
    accessToken: await signAccessToken({
      kind: parts.kind,
      id: parts.principalId,
      tenantId: session.tenantId,
      role,
    }),
    expiresIn: ACCESS_TTL_SECONDS,
    refreshToken: token,
  };
}

/**
 * Re-checks the person on every refresh, so deactivating a user or reissuing a driver's code
 * takes effect within one access-token lifetime (15 min) rather than when the session expires.
 */
async function currentStanding(kind: 'USER' | 'DRIVER', principalId: string, session: SessionRecord) {
  if (kind === 'USER') {
    const user = await users.getUser(principalId);
    if (!user || user.status !== 'ACTIVE') throw unauthorized('Account is not active');
    return user.role;
  }
  const driver = await drivers.getDriver(principalId);
  const cred = await credentials.getCredential(key.driverCredential(principalId));
  if (!driver || driver.status !== 'ACTIVE' || !cred || cred.deviceId !== session.deviceId) {
    throw unauthorized('This device is no longer signed in');
  }
  return null;
}

export async function endSession(refreshToken: string): Promise<void> {
  const parts = decodeRefreshToken(refreshToken);
  if (parts) await sessions.deleteSession(parts.kind, parts.principalId, parts.sessionId);
}
