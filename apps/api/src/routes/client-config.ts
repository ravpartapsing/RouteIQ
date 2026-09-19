import type { FastifyInstance } from 'fastify';
import { platformFeatures } from '@routeiq/data';

/**
 * What the web and mobile apps need before sign-in: which features exist and where map tiles
 * come from. Tenant overrides are applied after login (Phase 1), on top of this.
 *
 * `map` is null when maps are off, so a client never loads a tile style it will not use.
 */
export async function clientConfig(app: FastifyInstance): Promise<void> {
  app.get('/config', async () => {
    const features = platformFeatures();
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
