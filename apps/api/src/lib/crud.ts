import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { z } from 'zod';
import { createEntity, getOwned, listEntities, updateEntity, type EntityBase, type EntitySpec } from '@routeiq/data';
import { authOf, requireUser } from '../plugins/auth.js';
import { parse } from './validate.js';
import { conflict, notFound } from './errors.js';
import { newId } from './crypto.js';

type Fields<T extends EntityBase> = Omit<T, keyof EntityBase> & { status: T['status'] };

/**
 * List / get / create / replace for a carrier-owned entity. Every route is scoped to the caller's
 * carrier: another carrier's id is "not found", never "forbidden", so ids reveal nothing.
 */
export function crudRoutes<T extends EntityBase, S extends z.ZodTypeAny>(
  app: FastifyInstance,
  opts: {
    path: string;
    label: string;
    spec: EntitySpec<T>;
    input: S;
    /** Turns validated input into stored fields. May look things up (driver exists, geocode). */
    prepare: (input: z.infer<S>, ctx: { tenantId: string; existing: T | undefined; request: FastifyRequest }) => Promise<Fields<T>>;
    duplicateMessage?: { code: string; message: string; field: string };
    sort?: (a: T, b: T) => number;
  },
) {
  const readers = requireUser('OWNER', 'ADMIN', 'DISPATCHER', 'ACCOUNTING');
  const writers = requireUser('OWNER', 'ADMIN', 'DISPATCHER');
  const dup = () =>
    opts.duplicateMessage
      ? conflict(opts.duplicateMessage.code, opts.duplicateMessage.message, opts.duplicateMessage.field)
      : conflict('CONFLICT', `${opts.label} was changed by someone else — reload and try again`);

  app.get(opts.path, { preHandler: readers }, async (request) => {
    const items = await listEntities(opts.spec, authOf(request).tenantId);
    return { items: opts.sort ? items.sort(opts.sort) : items };
  });

  app.get(`${opts.path}/:id`, { preHandler: readers }, async (request) => {
    const r = await getOwned(opts.spec, authOf(request).tenantId, (request.params as { id: string }).id);
    if (!r) throw notFound(opts.label);
    return r;
  });

  app.post(opts.path, { preHandler: writers }, async (request, reply) => {
    const tenantId = authOf(request).tenantId;
    const input = parse(opts.input, request.body);
    const now = new Date().toISOString();
    const fields = await opts.prepare(input, { tenantId, existing: undefined, request });
    const record = { ...fields, id: newId(), tenantId, createdAt: now, updatedAt: now } as unknown as T;
    const result = await createEntity(opts.spec, record);
    if (!result.ok) throw dup();
    return reply.status(201).send(result.record);
  });

  app.put(`${opts.path}/:id`, { preHandler: writers }, async (request) => {
    const tenantId = authOf(request).tenantId;
    const existing = await getOwned(opts.spec, tenantId, (request.params as { id: string }).id);
    if (!existing) throw notFound(opts.label);
    const input = parse(opts.input, request.body);
    const fields = await opts.prepare(input, { tenantId, existing, request });
    const next = { ...existing, ...fields, updatedAt: new Date().toISOString() } as T;
    const result = await updateEntity(opts.spec, existing, next);
    if (!result.ok) {
      // Either the unique value is taken or the record moved on underneath us; tell them which.
      const current = await getOwned(opts.spec, tenantId, existing.id);
      if (current && current.updatedAt !== existing.updatedAt) {
        throw conflict('STALE', `${opts.label} was changed by someone else — reload and try again`);
      }
      throw dup();
    }
    return result.record;
  });
}

/** `undefined` and `''` both mean "not set" in a form; store them as null. */
export const n = <V>(v: V | null | undefined | ''): V | null => (v === undefined || v === '' ? null : v);
