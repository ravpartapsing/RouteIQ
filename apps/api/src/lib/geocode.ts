/**
 * Address → coordinates via the US Census Bureau geocoder: free, no key, no quota, and good US
 * street coverage. Called once per location — the result is cached on the location item, so a
 * facility is geocoded when it is created or its address changes, and never again.
 *
 * `GEOCODER=none` switches it off (tests, offline development).
 */
export interface GeoPoint {
  lat: number;
  lng: number;
  matchedAddress: string;
}

export interface AddressParts {
  line1: string;
  city: string;
  state: string;
  postalCode: string;
}

const CENSUS = 'https://geocoding.geo.census.gov/geocoder/locations/address';

export async function geocode(a: AddressParts): Promise<GeoPoint | null> {
  if ((process.env['GEOCODER'] ?? 'census') === 'none') return null;
  const url = new URL(CENSUS);
  url.search = new URLSearchParams({
    street: a.line1,
    city: a.city,
    state: a.state,
    zip: a.postalCode,
    benchmark: 'Public_AR_Current',
    format: 'json',
  }).toString();
  try {
    // A slow geocoder must never make saving a location slow; unresolved is fine, it can retry.
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      result?: { addressMatches?: Array<{ coordinates: { x: number; y: number }; matchedAddress: string }> };
    };
    const m = json.result?.addressMatches?.[0];
    return m ? { lat: m.coordinates.y, lng: m.coordinates.x, matchedAddress: m.matchedAddress } : null;
  } catch {
    return null;
  }
}
