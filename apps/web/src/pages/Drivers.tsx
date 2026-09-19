import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { CreateDriverResponse, Driver } from '@routeiq/contracts';
import { request } from '../lib/api';
import { useMe } from '../lib/auth';
import { Alert, Badge, Button, Field, IssuedCode, Modal, PageHeader, useFormErrors } from '../components/ui';

type Issued = { driver: Driver; code: string; expiresAt: string };

const STATUS = {
  ACTIVE: ['green', 'Signed in'],
  PENDING: ['amber', 'Awaiting sign-in'],
  INACTIVE: ['gray', 'Inactive'],
} as const;

export function Drivers() {
  const me = useMe();
  const canManage = me.principal.role !== 'ACCOUNTING';
  const [items, setItems] = useState<Driver[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [issued, setIssued] = useState<Issued | null>(null);

  const load = useCallback(() => {
    request<{ items: Driver[] }>('GET', '/v1/drivers')
      .then((r) => setItems(r.items.sort((a, b) => a.driverCode.localeCompare(b.driverCode))))
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function act(d: Driver, action: 'code' | 'off' | 'on') {
    try {
      if (action === 'code') {
        if (d.activatedAt && !confirm(`Issue a new code for ${d.firstName}? Their current phone will be signed out.`)) return;
        const r = await request<CreateDriverResponse>('POST', `/v1/drivers/${d.id}/reissue-code`);
        setIssued({ driver: r.driver, code: r.activation.code, expiresAt: r.activation.expiresAt });
      } else {
        if (action === 'off' && !confirm(`Deactivate ${d.firstName} ${d.lastName}? They'll be signed out of the app.`)) return;
        await request('PATCH', `/v1/drivers/${d.id}/status`, { status: action === 'off' ? 'INACTIVE' : 'ACTIVE' });
      }
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Drivers"
        subtitle={`Drivers sign in to the app with carrier code "${me.tenant.carrierCode}", their driver code, and a one-time code from here.`}
        actions={canManage && <Button onClick={() => setAdding(true)}>Add driver</Button>}
      />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">CDL</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Device</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {items === null && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            )}
            {items?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                  No drivers yet. Add one to get their sign-in code.
                </td>
              </tr>
            )}
            {items?.map((d) => {
              const [tone, label] = STATUS[d.status];
              const cdlSoon = d.cdlExpiry && new Date(d.cdlExpiry).getTime() - Date.now() < 60 * 86_400_000;
              return (
                <tr key={d.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-mono text-gray-700">{d.driverCode}</td>
                  <td className="px-4 py-3 font-medium">{d.firstName} {d.lastName}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {d.cdlState ?? '—'}
                    {d.cdlExpiry && (
                      <span className={`ml-2 text-xs ${cdlSoon ? 'text-warning' : 'text-gray-400'}`}>exp {d.cdlExpiry}</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><Badge tone={tone}>{label}</Badge></td>
                  <td className="px-4 py-3 text-gray-500">{d.deviceName ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {canManage && d.status !== 'INACTIVE' && (
                      <>
                        <Button variant="ghost" onClick={() => void act(d, 'code')}>New code</Button>
                        <Button variant="ghost" onClick={() => void act(d, 'off')}>Deactivate</Button>
                      </>
                    )}
                    {canManage && d.status === 'INACTIVE' && (
                      <Button variant="ghost" onClick={() => void act(d, 'on')}>Reactivate</Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {adding && (
        <AddDriver
          onClose={() => setAdding(false)}
          onCreated={(r) => {
            setAdding(false);
            setIssued({ driver: r.driver, code: r.activation.code, expiresAt: r.activation.expiresAt });
            load();
          }}
        />
      )}
      {issued && (
        <Modal title="Driver sign-in code" onClose={() => setIssued(null)}>
          <IssuedCode
            code={issued.code}
            expiresAt={issued.expiresAt}
            who={
              <>
                Give <strong>{issued.driver.firstName} {issued.driver.lastName}</strong> these three things for the
                RouteIQ Driver app: carrier code <strong className="font-mono">{me.tenant.carrierCode}</strong>, driver
                code <strong className="font-mono">{issued.driver.driverCode}</strong>, and:
              </>
            }
          />
          <div className="mt-5 text-right">
            <Button onClick={() => setIssued(null)}>Done</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AddDriver({ onClose, onCreated }: { onClose: () => void; onCreated: (r: CreateDriverResponse) => void }) {
  const errors = useFormErrors();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    for (const k of ['firstName', 'lastName', 'driverCode', 'phone', 'email', 'cdlNumber', 'cdlState', 'cdlExpiry']) {
      const v = String(f.get(k) ?? '').trim();
      if (v) body[k] = v;
    }
    errors.clear();
    setBusy(true);
    try {
      onCreated(await request<CreateDriverResponse>('POST', '/v1/drivers', body));
    } catch (err) {
      errors.set(err);
    } finally {
      setBusy(false);
    }
  }

  const fe = errors.fields;
  return (
    <Modal title="Add driver" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        {errors.message && <Alert>{errors.message}</Alert>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" name="firstName" required error={fe['firstName']} />
          <Field label="Last name" name="lastName" required error={fe['lastName']} />
        </div>
        <Field label="Driver code (optional)" name="driverCode" error={fe['driverCode']} hint="Leave blank to number automatically (D-0001…)." />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone" name="phone" type="tel" error={fe['phone']} />
          <Field label="Email" name="email" type="email" error={fe['email']} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="CDL number" name="cdlNumber" error={fe['cdlNumber']} />
          <Field label="State" name="cdlState" maxLength={2} placeholder="TX" error={fe['cdlState']} />
          <Field label="CDL expiry" name="cdlExpiry" type="date" error={fe['cdlExpiry']} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" busy={busy}>Add and get code</Button>
        </div>
      </form>
    </Modal>
  );
}
