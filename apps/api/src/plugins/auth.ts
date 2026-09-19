import fp from 'fastify-plugin';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { UserRole } from '@routeiq/contracts';
import { verifyAccessToken, type AuthContext } from '../lib/tokens.js';
import { forbidden, unauthorized } from '../lib/errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    /** Set when a valid bearer token came with the request. */
    auth: AuthContext | null;
  }
}

/** Reads the bearer token on every request; routes decide whether one is required. */
export const authPlugin = fp(async (app) => {
  app.decorateRequest('auth', null);
  app.addHook('onRequest', async (request) => {
    const header = request.headers.authorization;
    if (header?.startsWith('Bearer ')) request.auth = await verifyAccessToken(header.slice(7));
  });
});

type Guard = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

/** Any signed-in web user, optionally limited to some roles. */
export function requireUser(...roles: UserRole[]): Guard {
  return async (request) => {
    const auth = request.auth;
    if (!auth) throw unauthorized();
    if (auth.kind !== 'USER') throw forbidden('This needs a web account');
    if (roles.length && (!auth.role || !roles.includes(auth.role))) throw forbidden();
  };
}

export function requireDriver(): Guard {
  return async (request) => {
    if (!request.auth) throw unauthorized();
    if (request.auth.kind !== 'DRIVER') throw forbidden('This is for the driver app');
  };
}

export function requireAnyone(): Guard {
  return async (request) => {
    if (!request.auth) throw unauthorized();
  };
}

/** Narrowing helper for handlers that sit behind a guard. */
export function authOf(request: FastifyRequest): AuthContext {
  if (!request.auth) throw unauthorized();
  return request.auth;
}
