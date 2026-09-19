import { beforeAll, inject } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

let app: FastifyInstance;

export function useApp() {
  beforeAll(async () => {
    process.env['TABLE_NAME'] = inject('tableName');
    app = await buildApp();
  });
  return () => app;
}

let n = 0;
/** Unique per call, so tests sharing a table never collide on carrier codes or emails. */
export const uniq = (prefix: string) => `${prefix}${Date.now().toString(36)}${(n++).toString(36)}`;

export async function call(
  app: FastifyInstance,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  url: string,
  opts: { body?: unknown; token?: string } = {},
) {
  const res = await app.inject({
    method,
    url,
    ...(opts.body !== undefined ? { payload: opts.body as object } : {}),
    headers: opts.token ? { authorization: `Bearer ${opts.token}` } : {},
  });
  return { status: res.statusCode, body: res.body ? res.json() : undefined };
}

export async function registerCarrier(app: FastifyInstance) {
  const carrierCode = uniq('c');
  const email = `${uniq('owner')}@example.com`;
  const password = 'correct horse battery';
  const res = await call(app, 'POST', '/v1/auth/register', {
    body: {
      companyName: 'Test Freight',
      carrierCode,
      owner: { firstName: 'Olive', lastName: 'Owner', email, password },
    },
  });
  if (res.status !== 201) throw new Error(`register failed: ${JSON.stringify(res.body)}`);
  return { carrierCode, email, password, tokens: res.body as { accessToken: string; refreshToken: string } };
}

export const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
