import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';

describe('GET /config', () => {
  afterEach(() => {
    delete process.env['FEATURE_MAPS'];
    delete process.env['MAP_STYLE_URL'];
  });

  it('returns the free OSM style when maps are on', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/config' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      features: { maps: true, routing: false, mapMatching: false },
      map: { styleUrl: 'https://tiles.openfreemap.org/styles/liberty' },
    });
  });

  it('returns no map block at all when maps are off', async () => {
    process.env['FEATURE_MAPS'] = 'false';
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/config' });
    expect(res.json()).toEqual({
      features: { maps: false, routing: false, mapMatching: false },
      map: null,
    });
  });
});
