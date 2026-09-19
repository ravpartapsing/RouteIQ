/**
 * Feature switches. A platform default comes from the environment; a tenant can override it via
 * the `TENANT#<id> / SETTINGS#features` item. Tenant wins when set, platform otherwise.
 *
 * Anything that costs money to run is **off** by default. Turning it on is a deliberate act.
 */

export const FEATURES = {
  /** Live map of driver positions (web) and the route map in the driver app. Free OSM tiles only. */
  maps: { default: true, needs: [] },
  /** Truck-legal routes and billable miles from Valhalla. Off: miles are entered by hand. */
  routing: { default: false, needs: ['VALHALLA_URL'] },
  /** Snapping GPS traces to roads — the basis of automatic IFTA state mileage. */
  mapMatching: { default: false, needs: ['VALHALLA_URL'] },
} as const satisfies Record<string, { default: boolean; needs: readonly string[] }>;

export type FeatureName = keyof typeof FEATURES;
export type FeatureFlags = Record<FeatureName, boolean>;
export type FeatureOverrides = Partial<FeatureFlags>;

const NAMES = Object.keys(FEATURES) as FeatureName[];

/** `mapMatching` → `FEATURE_MAP_MATCHING`. */
export function featureEnvName(name: FeatureName): string {
  return `FEATURE_${name.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()}`;
}

function parseBool(value: string | undefined): boolean | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  const v = value.trim().toLowerCase();
  if (['1', 'true', 'on', 'yes'].includes(v)) return true;
  if (['0', 'false', 'off', 'no'].includes(v)) return false;
  throw new Error(`not a boolean feature value: "${value}"`);
}

/**
 * Platform-wide flags from the environment. Refuses to start with a feature on whose backing
 * service is not configured — better a failed deploy than a feature that silently does nothing.
 */
export function platformFeatures(env: Record<string, string | undefined> = process.env): FeatureFlags {
  const flags = {} as FeatureFlags;
  for (const name of NAMES) {
    const on = parseBool(env[featureEnvName(name)]) ?? FEATURES[name].default;
    if (on) {
      const missing = FEATURES[name].needs.filter((v) => !env[v]);
      if (missing.length) {
        throw new Error(`${featureEnvName(name)} is on but ${missing.join(', ')} is not set`);
      }
    }
    flags[name] = on;
  }
  return flags;
}

/**
 * A tenant may turn a feature off, or on only where the platform has it on — a tenant cannot
 * switch on routing when no routing service exists.
 */
export function resolveFeatures(platform: FeatureFlags, tenant?: FeatureOverrides): FeatureFlags {
  const flags = { ...platform };
  for (const name of NAMES) {
    const override = tenant?.[name];
    if (typeof override === 'boolean') flags[name] = platform[name] && override;
  }
  return flags;
}
