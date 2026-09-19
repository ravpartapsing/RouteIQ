import type { FastifyInstance } from 'fastify';
import type { ClientConfigResponse } from '@routeiq/contracts';
import { platformFeatures, resolveFeatures, tenants } from '@routeiq/data';

/**
 * What the apps need to know is switched on. Anonymous: the platform switches. Signed in: the
 * carrier's own overrides applied on top.
 *
 * `map` is null when maps are off, so a client never loads a tile style it will not use.
 */
export async function clientConfig(app: FastifyInstance): Promise<void> {
  app.get('/config', async (request): Promise<ClientConfigResponse> => {
    const platform = platformFeatures();
    const tenant = request.auth ? await tenants.getTenant(request.auth.tenantId) : undefined;
    const features = resolveFeatures(platform, tenant?.featureOverrides);
    return {
      features,
      map: features.maps
        ? {
            styleUrl: process.env['MAP_STYLE_URL'] ?? 'https://tiles.openfreemap.org/styles/liberty',
            attribution: '© OpenStreetMap contributors · OpenFreeMap',
          }
        : null,
    };
  });
}
