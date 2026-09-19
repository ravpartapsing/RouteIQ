import { useEffect, useState } from 'react';
import type { Features, TenantResponse } from '@routeiq/contracts';
import { request } from '../lib/api';
import { useMe } from '../lib/auth';
import { useServer } from '../lib/server';
import { Alert, PageHeader } from '../components/ui';

const FEATURES: Array<{ key: keyof Features; title: string; body: string }> = [
  { key: 'maps', title: 'Maps', body: 'Live map of your trucks and the route map in the driver app. Free OpenStreetMap tiles.' },
  { key: 'routing', title: 'Truck routing & miles', body: 'Truck-legal routes and billable miles. Not available yet on this plan.' },
  { key: 'mapMatching', title: 'Automatic IFTA mileage', body: 'Miles by state from GPS. Not available yet on this plan.' },
];

export function Settings() {
  const me = useMe();
  const { reload } = useServer();
  const canEdit = me.principal.role === 'OWNER' || me.principal.role === 'ADMIN';
  const [tenant, setTenant] = useState<TenantResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    request<TenantResponse>('GET', '/v1/tenant').then(setTenant).catch((e: Error) => setError(e.message));
  }, []);

  // A carrier can only narrow what the platform offers: a switch is available if it is on now, or
  // if it is off only because this carrier turned it off.
  const platformOn = (k: keyof Features) => !!tenant && (tenant.features[k] || tenant.featureOverrides[k] === false);

  async function toggle(k: keyof Features, on: boolean) {
    try {
      setTenant(await request<TenantResponse>('PATCH', '/v1/tenant/features', { [k]: on ? null : false }));
      reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}

      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Company</h2>
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div><dt className="text-xs uppercase text-gray-500">Name</dt><dd className="mt-1 font-medium">{tenant?.name ?? '…'}</dd></div>
          <div><dt className="text-xs uppercase text-gray-500">Carrier code</dt><dd className="mt-1 font-mono">{tenant?.carrierCode ?? '…'}</dd></div>
          <div><dt className="text-xs uppercase text-gray-500">USDOT</dt><dd className="mt-1">{tenant?.dotNumber ?? '—'}</dd></div>
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white">
        <h2 className="border-b border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700">Features</h2>
        {FEATURES.map((f) => {
          const available = platformOn(f.key);
          const on = tenant?.features[f.key] ?? false;
          return (
            <div key={f.key} className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4 last:border-0">
              <div>
                <p className="font-medium">{f.title}</p>
                <p className="text-sm text-gray-500">{f.body}</p>
              </div>
              <button
                role="switch"
                aria-checked={on}
                aria-label={f.title}
                disabled={!canEdit || !available || tenant === null}
                onClick={() => void toggle(f.key, !on)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-40 ${on ? 'bg-accent-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
          );
        })}
      </section>
      {!canEdit && <p className="mt-3 text-sm text-gray-500">Only owners and admins can change features.</p>}
    </div>
  );
}
