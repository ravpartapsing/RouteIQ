import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AssetStatus, Driver, Trailer, TrailerType, Truck } from '@routeiq/contracts';
import { request } from '../lib/api';
import { useMe } from '../lib/auth';
import { expiryTone, formValues } from '../lib/forms';
import { Alert, Badge, Button, Field, Modal, PageHeader, Select, useFormErrors } from '../components/ui';
import { Drawer, Facts } from '../components/Drawer';
import { DocumentsPanel } from '../components/DocumentsPanel';

const STATUS: Record<AssetStatus, ['green' | 'amber' | 'gray' | 'blue', string]> = {
  ACTIVE: ['green', 'Active'],
  MAINTENANCE: ['amber', 'In maintenance'],
  OUT_OF_SERVICE: ['amber', 'Out of service'],
  INACTIVE: ['gray', 'Inactive'],
};
const STATUS_OPTIONS = Object.entries(STATUS).map(([k, [, l]]) => [k, l] as [string, string]);
const TRAILER_TYPES: Array<[TrailerType, string]> = [
  ['DRY_VAN', 'Dry van'],
  ['REEFER', 'Reefer'],
  ['FLATBED', 'Flatbed'],
  ['STEP_DECK', 'Step deck'],
  ['TANKER', 'Tanker'],
  ['CONTAINER', 'Container'],
  ['OTHER', 'Other'],
];
const typeLabel = (t: TrailerType) => TRAILER_TYPES.find(([k]) => k === t)?.[1] ?? t;

function Expiry({ date }: { date: string | null }) {
  return <span className={expiryTone(date)}>{date ?? '—'}</span>;
}

export function Fleet() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'trailers' ? 'trailers' : 'trucks';
  return (
    <div>
      <PageHeader title="Trucks & Trailers" subtitle="Expiry dates in amber are within 30 days; red are past due." />
      <div className="mb-4 flex gap-1 border-b border-gray-200">
        {(['trucks', 'trailers'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setParams({ tab: t })}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize ${
              tab === t ? 'border-accent-500 text-accent-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'trucks' ? <Trucks /> : <Trailers />}
    </div>
  );
}

function useCanEdit() {
  return useMe().principal.role !== 'ACCOUNTING';
}

// ─── Trucks ────────────────────────────────────────────────────────────────

function Trucks() {
  const canEdit = useCanEdit();
  const [items, setItems] = useState<Truck[] | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Truck | 'new' | null>(null);
  const [viewing, setViewing] = useState<Truck | null>(null);

  const load = useCallback(() => {
    Promise.all([request<{ items: Truck[] }>('GET', '/v1/trucks'), request<{ items: Driver[] }>('GET', '/v1/drivers')])
      .then(([t, d]) => {
        setItems(t.items);
        setDrivers(d.items.filter((x) => x.status !== 'INACTIVE'));
      })
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);
  const driverName = useMemo(() => {
    const m = new Map(drivers.map((d) => [d.id, `${d.firstName} ${d.lastName}`]));
    return (id: string | null) => (id ? (m.get(id) ?? 'Unknown driver') : 'Unassigned');
  }, [drivers]);

  return (
    <>
      <div className="mb-3 flex justify-end">{canEdit && <Button onClick={() => setEditing('new')}>Add truck</Button>}</div>
      {error && <div className="mb-3"><Alert>{error}</Alert></div>}
      <Table
        empty="No trucks yet."
        loading={items === null}
        head={['Unit', 'Vehicle', 'Plate', 'Status', 'Driver', 'Registration', 'Insurance', 'Inspection']}
        rows={(items ?? []).map((t) => ({
          key: t.id,
          onClick: () => setViewing(t),
          cells: [
            <span className="font-mono font-medium text-accent-600">{t.unitNumber}</span>,
            [t.year, t.make, t.model].filter(Boolean).join(' ') || '—',
            t.plate ? `${t.plate}${t.plateState ? ` (${t.plateState})` : ''}` : '—',
            <Badge tone={STATUS[t.status][0]}>{STATUS[t.status][1]}</Badge>,
            driverName(t.assignedDriverId),
            <Expiry date={t.registrationExpiry} />,
            <Expiry date={t.insuranceExpiry} />,
            <Expiry date={t.inspectionExpiry} />,
          ],
        }))}
      />
      {viewing && (
        <Drawer
          title={`Truck ${viewing.unitNumber}`}
          subtitle={[viewing.year, viewing.make, viewing.model].filter(Boolean).join(' ') || undefined}
          onClose={() => setViewing(null)}
          actions={canEdit && <Button variant="secondary" onClick={() => setEditing(viewing)}>Edit</Button>}
        >
          <Facts
            items={[
              ['Status', <Badge tone={STATUS[viewing.status][0]}>{STATUS[viewing.status][1]}</Badge>],
              ['Driver', driverName(viewing.assignedDriverId)],
              ['VIN', viewing.vin && <span className="font-mono">{viewing.vin}</span>],
              ['Plate', viewing.plate && `${viewing.plate} ${viewing.plateState ?? ''}`],
              ['Ownership', viewing.ownership.replace('_', '-').toLowerCase()],
              ['Odometer', viewing.odometer?.toLocaleString() && `${viewing.odometer?.toLocaleString()} mi`],
              ['Registration', <Expiry date={viewing.registrationExpiry} />],
              ['Insurance', <Expiry date={viewing.insuranceExpiry} />],
              ['Annual inspection', <Expiry date={viewing.inspectionExpiry} />],
            ]}
          />
          {viewing.notes && <p className="whitespace-pre-wrap text-sm text-gray-700">{viewing.notes}</p>}
          <DocumentsPanel entityType="TRUCK" entityId={viewing.id} types={['REGISTRATION', 'INSURANCE', 'INSPECTION', 'LEASE', 'OTHER']} />
        </Drawer>
      )}
      {editing && (
        <TruckForm
          truck={editing === 'new' ? null : editing}
          drivers={drivers}
          onClose={() => setEditing(null)}
          onSaved={(t) => {
            setEditing(null);
            if (viewing) setViewing(t);
            load();
          }}
        />
      )}
    </>
  );
}

function TruckForm({ truck, drivers, onClose, onSaved }: { truck: Truck | null; drivers: Driver[]; onClose: () => void; onSaved: (t: Truck) => void }) {
  const errors = useFormErrors();
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    errors.clear();
    setBusy(true);
    try {
      const body = formValues(e.currentTarget);
      onSaved(await request<Truck>(truck ? 'PUT' : 'POST', truck ? `/v1/trucks/${truck.id}` : '/v1/trucks', body));
    } catch (err) {
      errors.set(err);
    } finally {
      setBusy(false);
    }
  }
  const f = errors.fields;
  const v = truck;
  return (
    <Modal title={truck ? `Edit truck ${truck.unitNumber}` : 'Add truck'} onClose={onClose}>
      <form onSubmit={submit} className="max-h-[70vh] space-y-3 overflow-y-auto pr-1" noValidate>
        {errors.message && <Alert>{errors.message}</Alert>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unit number" name="unitNumber" required defaultValue={v?.unitNumber} error={f['unitNumber']} />
          <Select label="Status" name="status" defaultValue={v?.status ?? 'ACTIVE'} options={STATUS_OPTIONS} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Year" name="year" inputMode="numeric" defaultValue={v?.year ?? ''} error={f['year']} />
          <Field label="Make" name="make" defaultValue={v?.make ?? ''} error={f['make']} />
          <Field label="Model" name="model" defaultValue={v?.model ?? ''} error={f['model']} />
        </div>
        <Field label="VIN" name="vin" defaultValue={v?.vin ?? ''} error={f['vin']} maxLength={17} className="uppercase" />
        <div className="grid grid-cols-3 gap-3">
          <Field label="Plate" name="plate" defaultValue={v?.plate ?? ''} error={f['plate']} />
          <Field label="State" name="plateState" maxLength={2} defaultValue={v?.plateState ?? ''} error={f['plateState']} />
          <Field label="Odometer" name="odometer" inputMode="numeric" defaultValue={v?.odometer ?? ''} error={f['odometer']} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Ownership"
            name="ownership"
            defaultValue={v?.ownership ?? 'COMPANY'}
            options={[['COMPANY', 'Company'], ['OWNER_OPERATOR', 'Owner-operator'], ['LEASED', 'Leased']]}
          />
          <Select
            label="Assigned driver"
            name="assignedDriverId"
            defaultValue={v?.assignedDriverId ?? ''}
            options={[['', 'Unassigned'], ...drivers.map((d): [string, string] => [d.id, `${d.firstName} ${d.lastName} (${d.driverCode})`])]}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Registration expiry" name="registrationExpiry" type="date" defaultValue={v?.registrationExpiry ?? ''} error={f['registrationExpiry']} />
          <Field label="Insurance expiry" name="insuranceExpiry" type="date" defaultValue={v?.insuranceExpiry ?? ''} error={f['insuranceExpiry']} />
          <Field label="Inspection due" name="inspectionExpiry" type="date" defaultValue={v?.inspectionExpiry ?? ''} error={f['inspectionExpiry']} />
        </div>
        <Notes defaultValue={v?.notes} />
        <FormButtons busy={busy} onClose={onClose} />
      </form>
    </Modal>
  );
}

// ─── Trailers ──────────────────────────────────────────────────────────────

function Trailers() {
  const canEdit = useCanEdit();
  const [items, setItems] = useState<Trailer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Trailer | 'new' | null>(null);
  const [viewing, setViewing] = useState<Trailer | null>(null);

  const load = useCallback(() => {
    request<{ items: Trailer[] }>('GET', '/v1/trailers')
      .then((r) => setItems(r.items))
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  return (
    <>
      <div className="mb-3 flex justify-end">{canEdit && <Button onClick={() => setEditing('new')}>Add trailer</Button>}</div>
      {error && <div className="mb-3"><Alert>{error}</Alert></div>}
      <Table
        empty="No trailers yet."
        loading={items === null}
        head={['Unit', 'Type', 'Length', 'Plate', 'Status', 'Registration', 'Inspection']}
        rows={(items ?? []).map((t) => ({
          key: t.id,
          onClick: () => setViewing(t),
          cells: [
            <span className="font-mono font-medium text-accent-600">{t.unitNumber}</span>,
            typeLabel(t.trailerType),
            t.lengthFt ? `${t.lengthFt} ft` : '—',
            t.plate ? `${t.plate}${t.plateState ? ` (${t.plateState})` : ''}` : '—',
            <Badge tone={STATUS[t.status][0]}>{STATUS[t.status][1]}</Badge>,
            <Expiry date={t.registrationExpiry} />,
            <Expiry date={t.inspectionExpiry} />,
          ],
        }))}
      />
      {viewing && (
        <Drawer
          title={`Trailer ${viewing.unitNumber}`}
          subtitle={`${typeLabel(viewing.trailerType)}${viewing.lengthFt ? ` · ${viewing.lengthFt} ft` : ''}`}
          onClose={() => setViewing(null)}
          actions={canEdit && <Button variant="secondary" onClick={() => setEditing(viewing)}>Edit</Button>}
        >
          <Facts
            items={[
              ['Status', <Badge tone={STATUS[viewing.status][0]}>{STATUS[viewing.status][1]}</Badge>],
              ['VIN', viewing.vin && <span className="font-mono">{viewing.vin}</span>],
              ['Plate', viewing.plate && `${viewing.plate} ${viewing.plateState ?? ''}`],
              ['Year / make', [viewing.year, viewing.make].filter(Boolean).join(' ') || null],
              ['Registration', <Expiry date={viewing.registrationExpiry} />],
              ['Annual inspection', <Expiry date={viewing.inspectionExpiry} />],
            ]}
          />
          {viewing.notes && <p className="whitespace-pre-wrap text-sm text-gray-700">{viewing.notes}</p>}
          <DocumentsPanel entityType="TRAILER" entityId={viewing.id} types={['REGISTRATION', 'INSPECTION', 'LEASE', 'OTHER']} />
        </Drawer>
      )}
      {editing && (
        <TrailerForm
          trailer={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(t) => {
            setEditing(null);
            if (viewing) setViewing(t);
            load();
          }}
        />
      )}
    </>
  );
}

function TrailerForm({ trailer, onClose, onSaved }: { trailer: Trailer | null; onClose: () => void; onSaved: (t: Trailer) => void }) {
  const errors = useFormErrors();
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    errors.clear();
    setBusy(true);
    try {
      const body = formValues(e.currentTarget);
      onSaved(await request<Trailer>(trailer ? 'PUT' : 'POST', trailer ? `/v1/trailers/${trailer.id}` : '/v1/trailers', body));
    } catch (err) {
      errors.set(err);
    } finally {
      setBusy(false);
    }
  }
  const f = errors.fields;
  const v = trailer;
  return (
    <Modal title={trailer ? `Edit trailer ${trailer.unitNumber}` : 'Add trailer'} onClose={onClose}>
      <form onSubmit={submit} className="max-h-[70vh] space-y-3 overflow-y-auto pr-1" noValidate>
        {errors.message && <Alert>{errors.message}</Alert>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unit number" name="unitNumber" required defaultValue={v?.unitNumber} error={f['unitNumber']} />
          <Select label="Status" name="status" defaultValue={v?.status ?? 'ACTIVE'} options={STATUS_OPTIONS} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Type" name="trailerType" defaultValue={v?.trailerType ?? 'DRY_VAN'} options={TRAILER_TYPES} />
          <Field label="Length (ft)" name="lengthFt" inputMode="numeric" defaultValue={v?.lengthFt ?? ''} error={f['lengthFt']} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Year" name="year" inputMode="numeric" defaultValue={v?.year ?? ''} error={f['year']} />
          <Field label="Make" name="make" defaultValue={v?.make ?? ''} error={f['make']} />
        </div>
        <Field label="VIN" name="vin" defaultValue={v?.vin ?? ''} error={f['vin']} maxLength={17} className="uppercase" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Plate" name="plate" defaultValue={v?.plate ?? ''} error={f['plate']} />
          <Field label="State" name="plateState" maxLength={2} defaultValue={v?.plateState ?? ''} error={f['plateState']} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Registration expiry" name="registrationExpiry" type="date" defaultValue={v?.registrationExpiry ?? ''} error={f['registrationExpiry']} />
          <Field label="Inspection due" name="inspectionExpiry" type="date" defaultValue={v?.inspectionExpiry ?? ''} error={f['inspectionExpiry']} />
        </div>
        <Notes defaultValue={v?.notes} />
        <FormButtons busy={busy} onClose={onClose} />
      </form>
    </Modal>
  );
}

// ─── Shared ────────────────────────────────────────────────────────────────

export function Notes({ defaultValue, name = 'notes' }: { defaultValue?: string | null; name?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">Notes</span>
      <textarea
        name={name}
        rows={3}
        defaultValue={defaultValue ?? ''}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-accent-500"
      />
    </label>
  );
}

export function FormButtons({ busy, onClose, label = 'Save' }: { busy: boolean; onClose: () => void; label?: string }) {
  return (
    <div className="sticky bottom-0 flex justify-end gap-2 bg-white pt-3">
      <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
      <Button type="submit" busy={busy}>{label}</Button>
    </div>
  );
}

export function Table({ head, rows, empty, loading }: {
  head: string[];
  rows: Array<{ key: string; onClick?: () => void; cells: React.ReactNode[] }>;
  empty: string;
  loading: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>{head.map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={head.length} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>}
          {!loading && rows.length === 0 && (
            <tr><td colSpan={head.length} className="px-4 py-10 text-center text-gray-500">{empty}</td></tr>
          )}
          {rows.map((r) => (
            <tr
              key={r.key}
              onClick={r.onClick}
              className={`border-b border-gray-100 last:border-0 ${r.onClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
            >
              {r.cells.map((c, i) => <td key={i} className="px-4 py-3">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
