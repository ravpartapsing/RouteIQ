/** Reads a form into a plain object, turning empty strings into null so the API clears them. */
export function formValues(form: HTMLFormElement): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  new FormData(form).forEach((v, k) => {
    const s = String(v).trim();
    out[k] = s === '' ? null : s;
  });
  return out;
}

/** Nested "billingAddress.city" style keys → objects; all-empty groups become null. */
export function nest(values: Record<string, string | null>, group: string): Record<string, string | null> | null {
  const prefix = `${group}.`;
  const entries = Object.entries(values).filter(([k]) => k.startsWith(prefix));
  for (const [k] of entries) delete values[k];
  if (entries.every(([, v]) => v === null)) return null;
  return Object.fromEntries(entries.map(([k, v]) => [k.slice(prefix.length), v]));
}

export const dollars = (cents: number | null) =>
  cents === null ? '—' : (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function daysUntil(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((Date.parse(`${isoDate}T00:00:00Z`) - today) / 86_400_000);
}

/** Tailwind class for an expiry date: red if past, amber within 30 days. */
export function expiryTone(isoDate: string | null): string {
  const d = daysUntil(isoDate);
  if (d === null) return 'text-gray-400';
  if (d < 0) return 'text-danger font-medium';
  if (d <= 30) return 'text-warning font-medium';
  return 'text-gray-700';
}
