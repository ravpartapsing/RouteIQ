import type { FastifyInstance } from 'fastify';
import {
  ActivateDriverRequest,
  ActivateUserRequest,
  LoginRequest,
  RefreshRequest,
  RegisterRequest,
} from '@routeiq/contracts';
import { credentials, drivers, key, tenants, users, type CredentialRecord } from '@routeiq/data';
import { parse } from '../lib/validate.js';
import { ApiError, conflict, unauthorized } from '../lib/errors.js';
import { burnPasswordCheck, hashPassword, newId, sha256, safeEqual, verifyPassword } from '../lib/crypto.js';
import { endSession, issueTokens, refreshTokens } from '../services/sessions.js';

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

// One message for every sign-in failure: which part was wrong is exactly what a guesser wants.
const BAD_LOGIN = 'Email or password is incorrect';
const BAD_CODE = 'Those details do not match an active invitation';

/** A wrong activation code counts against the code; at the limit the code is burned. */
async function failCode(credKey: ReturnType<typeof key.driverCredential>): Promise<never> {
  const failures = await credentials.recordFailure(credKey);
  if (failures >= MAX_FAILURES) {
    await credentials.clearActivation(credKey);
    throw new ApiError(401, 'CODE_LOCKED', 'Too many wrong codes. Ask your dispatcher for a new one.');
  }
  throw unauthorized(BAD_CODE);
}

function codeUsable(cred: CredentialRecord | undefined, nowIso: string): cred is CredentialRecord & { activationHash: string } {
  return !!cred?.activationHash && !!cred.activationExpiresAt && cred.activationExpiresAt > nowIso;
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/v1/auth/register', async (request, reply) => {
    const body = parse(RegisterRequest, request.body);
    const now = new Date().toISOString();
    const result = await tenants.createTenantWithOwner({
      tenantId: newId(),
      name: body.companyName,
      carrierCode: body.carrierCode,
      dotNumber: body.dotNumber ?? null,
      owner: {
        id: newId(),
        email: body.owner.email,
        firstName: body.owner.firstName,
        lastName: body.owner.lastName,
        passwordHash: await hashPassword(body.owner.password),
      },
      now,
    });
    if (!result.ok) {
      throw result.conflict === 'CARRIER_CODE'
        ? conflict('CARRIER_CODE_TAKEN', 'That carrier code is already in use', 'carrierCode')
        : conflict('EMAIL_TAKEN', 'An account with that email already exists', 'owner.email');
    }
    const tokens = await issueTokens({
      kind: 'USER',
      principalId: result.owner.id,
      tenantId: result.tenant.id,
      role: 'OWNER',
    });
    return reply.status(201).send(tokens);
  });

  app.post('/v1/auth/login', async (request) => {
    const body = parse(LoginRequest, request.body);
    const nowIso = new Date().toISOString();
    const user = await users.getUserByEmail(body.email);
    const credKey = user ? key.userCredential(user.id) : null;
    const cred = credKey ? await credentials.getCredential(credKey) : undefined;

    if (!user || !credKey || !cred?.passwordHash) {
      await burnPasswordCheck(body.password);
      throw unauthorized(BAD_LOGIN);
    }
    if (cred.lockedUntil && cred.lockedUntil > nowIso) {
      throw new ApiError(429, 'ACCOUNT_LOCKED', 'Too many attempts. Try again in a few minutes.');
    }
    if (!(await verifyPassword(body.password, cred.passwordHash))) {
      const failures = await credentials.recordFailure(credKey);
      if (failures >= MAX_FAILURES) {
        await credentials.setLockedUntil(credKey, new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString());
      }
      throw unauthorized(BAD_LOGIN);
    }
    if (user.status !== 'ACTIVE') throw unauthorized('This account has been deactivated');

    await credentials.resetFailures(credKey);
    await users.recordUserLogin(user.id, nowIso);
    return issueTokens({ kind: 'USER', principalId: user.id, tenantId: user.tenantId, role: user.role });
  });

  /** An invited web user sets their password with the code their admin gave them. */
  app.post('/v1/auth/activate', async (request) => {
    const body = parse(ActivateUserRequest, request.body);
    const nowIso = new Date().toISOString();
    const user = await users.getUserByEmail(body.email);
    if (!user || user.status === 'INACTIVE') throw unauthorized(BAD_CODE);
    const credKey = key.userCredential(user.id);
    const cred = await credentials.getCredential(credKey);
    if (!codeUsable(cred, nowIso)) throw unauthorized(BAD_CODE);
    if (!safeEqual(sha256(body.code), cred.activationHash)) return failCode(credKey);

    const done = await users.activateUser(user, cred.activationHash, await hashPassword(body.password), nowIso);
    if (!done.ok) throw unauthorized(BAD_CODE); // code was reissued mid-request
    await users.recordUserLogin(user.id, nowIso);
    return issueTokens({ kind: 'USER', principalId: user.id, tenantId: user.tenantId, role: user.role });
  });

  /**
   * Driver sign-in: carrier code + driver code + one-time activation code, from the dispatcher.
   * Binds the driver to this device; there is no driver password. A lost phone means the
   * dispatcher reissues a code, which unbinds the old device and ends its sessions.
   */
  app.post('/v1/auth/driver/activate', async (request) => {
    const body = parse(ActivateDriverRequest, request.body);
    const nowIso = new Date().toISOString();
    const tenant = await tenants.getTenantByCarrierCode(body.carrierCode);
    const driver = tenant ? await drivers.getDriverByCode(tenant.id, body.driverCode) : undefined;
    if (!tenant || !driver || driver.status === 'INACTIVE') throw unauthorized(BAD_CODE);

    const credKey = key.driverCredential(driver.id);
    const cred = await credentials.getCredential(credKey);
    if (!codeUsable(cred, nowIso)) throw unauthorized(BAD_CODE);
    if (!safeEqual(sha256(body.code), cred.activationHash)) return failCode(credKey);

    const device = { id: body.deviceId, name: body.deviceName ?? null };
    const done = await drivers.activateDriver(driver, cred.activationHash, device, nowIso);
    if (!done.ok) throw unauthorized(BAD_CODE);
    return issueTokens({ kind: 'DRIVER', principalId: driver.id, tenantId: tenant.id, role: null, device });
  });

  app.post('/v1/auth/refresh', async (request) => {
    const body = parse(RefreshRequest, request.body);
    return refreshTokens(body.refreshToken);
  });

  app.post('/v1/auth/logout', async (request, reply) => {
    const body = parse(RefreshRequest, request.body);
    await endSession(body.refreshToken);
    return reply.status(204).send();
  });
}
