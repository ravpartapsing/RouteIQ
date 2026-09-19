import type { FastifyInstance } from 'fastify';
import {
  CreateDriverRequest,
  UpdateStatusRequest,
  type CreateDriverResponse,
  type Driver,
} from '@routeiq/contracts';
import { drivers, sessions, type DriverRecord } from '@routeiq/data';
import { authOf, requireUser } from '../plugins/auth.js';
import { parse } from '../lib/validate.js';
import { ApiError, conflict, notFound } from '../lib/errors.js';
import { newActivationCode, newId, sha256 } from '../lib/crypto.js';

const CODE_DAYS = 7;
const expiry = () => new Date(Date.now() + CODE_DAYS * 86_400_000).toISOString();

const toDriver = (d: DriverRecord): Driver => ({
  id: d.id,
  driverCode: d.driverCode,
  firstName: d.firstName,
  lastName: d.lastName,
  phone: d.phone,
  email: d.email,
  cdlNumber: d.cdlNumber,
  cdlState: d.cdlState,
  cdlExpiry: d.cdlExpiry,
  status: d.status,
  activatedAt: d.activatedAt,
  deviceName: d.deviceName,
  createdAt: d.createdAt,
});

export async function driverRoutes(app: FastifyInstance): Promise<void> {
  const readers = requireUser('OWNER', 'ADMIN', 'DISPATCHER', 'ACCOUNTING');
  const managers = requireUser('OWNER', 'ADMIN', 'DISPATCHER');

  async function load(tenantId: string, id: string) {
    const d = await drivers.getDriver(id);
    if (!d || d.tenantId !== tenantId) throw notFound('Driver');
    return d;
  }

  app.get('/v1/drivers', { preHandler: readers }, async (request) => {
    const items = await drivers.listDrivers(authOf(request).tenantId);
    return { items: items.map(toDriver) };
  });

  app.get('/v1/drivers/:id', { preHandler: readers }, async (request) =>
    toDriver(await load(authOf(request).tenantId, (request.params as { id: string }).id)),
  );

  app.post('/v1/drivers', { preHandler: managers }, async (request, reply) => {
    const body = parse(CreateDriverRequest, request.body);
    const tenantId = authOf(request).tenantId;
    const { code, display } = newActivationCode();
    const expiresAt = expiry();

    // A generated code can collide with one a dispatcher typed by hand earlier; the counter has
    // already moved on, so simply take the next number.
    for (let attempt = 0; attempt < 5; attempt++) {
      const driverCode = body.driverCode ?? (await drivers.nextDriverCode(tenantId));
      const result = await drivers.createDriver({
        driver: {
          id: newId(),
          tenantId,
          driverCode,
          firstName: body.firstName,
          lastName: body.lastName,
          phone: body.phone ?? null,
          email: body.email ?? null,
          cdlNumber: body.cdlNumber ?? null,
          cdlState: body.cdlState ?? null,
          cdlExpiry: body.cdlExpiry ?? null,
        },
        activationHash: sha256(code),
        activationExpiresAt: expiresAt,
        now: new Date().toISOString(),
      });
      if (result.ok) {
        const out: CreateDriverResponse = { driver: toDriver(result.driver), activation: { code: display, expiresAt } };
        return reply.status(201).send(out);
      }
      if (body.driverCode) throw conflict('DRIVER_CODE_TAKEN', 'That driver code is already used', 'driverCode');
    }
    throw new ApiError(500, 'DRIVER_CODE_EXHAUSTED', 'Could not allocate a driver code');
  });

  /** New code; the old device is unbound and signed out. Used for a new or lost phone. */
  app.post('/v1/drivers/:id/reissue-code', { preHandler: managers }, async (request) => {
    const d = await load(authOf(request).tenantId, (request.params as { id: string }).id);
    if (d.status === 'INACTIVE') throw new ApiError(400, 'DRIVER_INACTIVE', 'Reactivate the driver first');
    const { code, display } = newActivationCode();
    const expiresAt = expiry();
    await drivers.reissueDriverCode(d, sha256(code), expiresAt, new Date().toISOString());
    await sessions.revokeAllSessions('DRIVER', d.id);
    return {
      driver: toDriver({ ...d, status: 'PENDING', activatedAt: null, deviceName: null }),
      activation: { code: display, expiresAt },
    };
  });

  app.patch('/v1/drivers/:id/status', { preHandler: managers }, async (request) => {
    const { status } = parse(UpdateStatusRequest, request.body);
    const d = await load(authOf(request).tenantId, (request.params as { id: string }).id);
    // Reactivating a driver who never signed in puts them back to waiting for activation.
    const next = status === 'ACTIVE' && !d.activatedAt ? 'PENDING' : status;
    await drivers.setDriverStatus(d, next, new Date().toISOString());
    if (status === 'INACTIVE') await sessions.revokeAllSessions('DRIVER', d.id);
    return toDriver({ ...d, status: next });
  });
}
