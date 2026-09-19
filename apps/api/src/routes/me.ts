import type { FastifyInstance } from 'fastify';
import type { MeResponse } from '@routeiq/contracts';
import { drivers, tenants, users } from '@routeiq/data';
import { authOf, requireAnyone } from '../plugins/auth.js';
import { unauthorized } from '../lib/errors.js';

export async function meRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/me', { preHandler: requireAnyone() }, async (request): Promise<MeResponse> => {
    const auth = authOf(request);
    const tenant = await tenants.getTenant(auth.tenantId);
    if (!tenant) throw unauthorized();
    const t = { id: tenant.id, name: tenant.name, carrierCode: tenant.carrierCode };

    if (auth.kind === 'USER') {
      const user = await users.getUser(auth.id);
      if (!user) throw unauthorized();
      return {
        principal: {
          kind: 'USER',
          id: user.id,
          tenantId: user.tenantId,
          role: user.role,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        tenant: t,
      };
    }
    const driver = await drivers.getDriver(auth.id);
    if (!driver) throw unauthorized();
    return {
      principal: {
        kind: 'DRIVER',
        id: driver.id,
        tenantId: driver.tenantId,
        driverCode: driver.driverCode,
        firstName: driver.firstName,
        lastName: driver.lastName,
      },
      tenant: t,
    };
  });
}
