import type { FastifyInstance } from 'fastify';
import { UpdateFeaturesRequest, type TenantResponse } from '@routeiq/contracts';
import { platformFeatures, resolveFeatures, tenants, type TenantRecord } from '@routeiq/data';
import { authOf, requireUser } from '../plugins/auth.js';
import { parse } from '../lib/validate.js';
import { notFound } from '../lib/errors.js';

function toResponse(t: TenantRecord): TenantResponse {
  return {
    id: t.id,
    name: t.name,
    carrierCode: t.carrierCode,
    dotNumber: t.dotNumber,
    features: resolveFeatures(platformFeatures(), t.featureOverrides),
    featureOverrides: t.featureOverrides,
    createdAt: t.createdAt,
  };
}

export async function tenantRoutes(app: FastifyInstance): Promise<void> {
  app.get('/v1/tenant', { preHandler: requireUser() }, async (request) => {
    const t = await tenants.getTenant(authOf(request).tenantId);
    if (!t) throw notFound('Carrier');
    return toResponse(t);
  });

  /** A carrier can switch a feature off for itself, never on past what the platform allows. */
  app.patch('/v1/tenant/features', { preHandler: requireUser('OWNER', 'ADMIN') }, async (request) => {
    const body = parse(UpdateFeaturesRequest, request.body);
    const changes = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)) as Record<
      string,
      boolean | null
    >;
    const t = await tenants.updateFeatureOverrides(authOf(request).tenantId, changes, new Date().toISOString());
    return toResponse(t);
  });
}
