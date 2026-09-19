import type { FastifyInstance } from 'fastify';
import { InviteUserRequest, UpdateStatusRequest, type InviteUserResponse, type User } from '@routeiq/contracts';
import { sessions, users, type UserRecord } from '@routeiq/data';
import { authOf, requireUser } from '../plugins/auth.js';
import { parse } from '../lib/validate.js';
import { ApiError, conflict, notFound } from '../lib/errors.js';
import { newActivationCode, newId, sha256 } from '../lib/crypto.js';

const CODE_DAYS = 7;
const expiry = () => new Date(Date.now() + CODE_DAYS * 86_400_000).toISOString();

const toUser = (u: UserRecord): User => ({
  id: u.id,
  email: u.email,
  firstName: u.firstName,
  lastName: u.lastName,
  role: u.role,
  status: u.status,
  lastLoginAt: u.lastLoginAt,
  createdAt: u.createdAt,
});

export async function userRoutes(app: FastifyInstance): Promise<void> {
  const admins = requireUser('OWNER', 'ADMIN');

  /** Tenant check lives here, not in the repo: a user id from another carrier is simply "not found". */
  async function load(tenantId: string, id: string) {
    const user = await users.getUser(id);
    if (!user || user.tenantId !== tenantId) throw notFound('User');
    return user;
  }

  app.get('/v1/users', { preHandler: admins }, async (request) => {
    const items = await users.listUsers(authOf(request).tenantId);
    return { items: items.map(toUser) };
  });

  app.post('/v1/users', { preHandler: admins }, async (request, reply) => {
    const body = parse(InviteUserRequest, request.body);
    const { code, display } = newActivationCode();
    const expiresAt = expiry();
    const result = await users.inviteUser({
      id: newId(),
      tenantId: authOf(request).tenantId,
      ...body,
      activationHash: sha256(code),
      activationExpiresAt: expiresAt,
      now: new Date().toISOString(),
    });
    if (!result.ok) throw conflict('EMAIL_TAKEN', 'An account with that email already exists', 'email');
    const out: InviteUserResponse = { user: toUser(result.user), activation: { code: display, expiresAt } };
    return reply.status(201).send(out);
  });

  /** New code, old password cleared, every session ended — for a forgotten password or a leak. */
  app.post('/v1/users/:id/reissue-code', { preHandler: admins }, async (request) => {
    const auth = authOf(request);
    const user = await load(auth.tenantId, (request.params as { id: string }).id);
    if (user.role === 'OWNER' && auth.role !== 'OWNER') throw new ApiError(403, 'FORBIDDEN', 'Only the owner can reset the owner');
    const { code, display } = newActivationCode();
    const expiresAt = expiry();
    await users.reissueUserCode(user, sha256(code), expiresAt, new Date().toISOString());
    await sessions.revokeAllSessions('USER', user.id);
    return { user: toUser({ ...user, status: 'PENDING' }), activation: { code: display, expiresAt } };
  });

  app.patch('/v1/users/:id/status', { preHandler: admins }, async (request) => {
    const auth = authOf(request);
    const { status } = parse(UpdateStatusRequest, request.body);
    const user = await load(auth.tenantId, (request.params as { id: string }).id);
    if (user.id === auth.id) throw new ApiError(400, 'SELF_CHANGE', 'You cannot change your own status');
    if (user.role === 'OWNER') throw new ApiError(400, 'OWNER_STATUS', 'The owner cannot be deactivated');
    await users.setUserStatus(user, status, new Date().toISOString());
    if (status === 'INACTIVE') await sessions.revokeAllSessions('USER', user.id);
    return toUser({ ...user, status });
  });
}
