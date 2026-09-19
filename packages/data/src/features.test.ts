import { describe, expect, it } from 'vitest';
import { featureEnvName, platformFeatures, resolveFeatures } from './features.js';

const on = { maps: true, routing: true, mapMatching: true };

describe('features', () => {
  it('has maps on and every paid feature off by default', () => {
    expect(platformFeatures({})).toEqual({ maps: true, routing: false, mapMatching: false });
  });

  it('names env vars in SNAKE_CASE', () => {
    expect(featureEnvName('mapMatching')).toBe('FEATURE_MAP_MATCHING');
  });

  it('lets the env turn maps off platform-wide', () => {
    expect(platformFeatures({ FEATURE_MAPS: 'off' }).maps).toBe(false);
  });

  it('rejects a value that is not a boolean instead of guessing', () => {
    expect(() => platformFeatures({ FEATURE_MAPS: 'maybe' })).toThrow(/not a boolean/);
  });

  it('refuses routing or map-matching without a Valhalla endpoint', () => {
    expect(() => platformFeatures({ FEATURE_ROUTING: 'true' })).toThrow(/VALHALLA_URL/);
    expect(() => platformFeatures({ FEATURE_MAP_MATCHING: 'true' })).toThrow(/VALHALLA_URL/);
  });

  it('allows routing once the endpoint exists', () => {
    const flags = platformFeatures({ FEATURE_ROUTING: 'true', VALHALLA_URL: 'http://valhalla:8002' });
    expect(flags.routing).toBe(true);
    expect(flags.mapMatching).toBe(false);
  });

  it('lets a tenant turn a feature off', () => {
    expect(resolveFeatures(on, { maps: false }).maps).toBe(false);
  });

  it('never lets a tenant turn on what the platform has off', () => {
    const platform = { maps: true, routing: false, mapMatching: false };
    expect(resolveFeatures(platform, { routing: true }).routing).toBe(false);
  });

  it('falls back to the platform when the tenant has not set anything', () => {
    expect(resolveFeatures(on, {})).toEqual(on);
  });
});
