import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Customer, Location } from '@routeiq/contracts';
import { request } from '../lib/api';
import { useMe } from '../lib/auth';
import { useServer } from '../lib/server';
import { formValues, nest } from '../lib/forms';
import { Alert, Badge, Button, Field, Modal, PageHeader, Select, useFormErrors } from '../components/ui';
import { Drawer, Facts } from '../components/Drawer';
import { LiveMap } from '../components/LiveMap';
import { FormButtons, Notes, Table } from './Fleet';

const oneLine = (l: Location) => `${l.address.line1}, ${l.address.city}, ${l.address.state} ${l.address.postalCode}`;

export function Locations() {
  const canEdit = useMe().principal.role !== 'ACCOUNTING';
  const { state: server } = useServer();
  const styleUrl = server.kind === 'ok' ? server.config.map?.styleUrl : undefined;
  const [items, setItems] = useState<Location[] | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Location | 'new' | null>(null);
  const [viewing, setViewing] = useState<Location | null>(null);

  const load = useCallback(() => {
    Promise.all([request<{ items: Location[] }>('GET', '/v1/locations'), request<{ items: Customer[] }>('GET', '/v1/customers')])
      .then(([l, c]) => {
        setItems(l.items);
        setCustomers(c.items);
      })
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);
  const customerName = (id: string | null) => (id ? (customers.find((c) => c.id === id)?.name ?? '—') : '—');

  return (
    <div>
      <PageHeader
        title="Locations"
        subtitle="Pickup and delivery facilities. Addresses are pinned on the map automatically when they can be found."
        actions={canEdit && <Button onClick={() => setEditing('new')}>Add location</Button>}
      />
      {error && <div className="mb-3"><Alert>{error}</Alert></div>}
      <Table
        empty="No locations yet."
        loading={items === null}
        head={['Name', 'Address', 'Customer', 'Hours', 'Appointment', 'Map']}
        rows={(items ?? []).map((l) => ({
          key: l.id,
          onClick: () => setViewing(l),
          cells: [
            <span className="font-medium text-accent-600">{l.name}</span>,
            <span className="text-gray-600">{oneLine(l)}</span>,
            customerName(l.customerId),
            l.hours ?? '—',
            l.appointmentRequired ? <Badge tone="amber">Required</Badge> : '—',
            l.lat != null ? <Badge tone="green">Pinned</Badge> : <Badge tone="gray">Not found</Badge>,
          ],
        }))}
      />
      {viewing && (
        <Drawer
          title={viewing.name}
          subtitle={oneLine(viewing)}
          onClose={() => setViewing(null)}
          actions={canEdit && <Button variant="secondary" onClick={() => setEditing(viewing)}>Edit</Button>}
        >
          {styleUrl && viewing.lat != null && viewing.lng != null && (
            <LiveMap styleUrl={styleUrl} marker={{ lat: viewing.lat, lng: viewing.lng }} className="h-56 overflow-hidden rounded-lg" />
          )}
          {viewing.lat == null && (
            <Alert tone="info">
              This address couldn't be found on the map. Check it, or enter latitude and longitude in Edit.
            </Alert>
          )}
          <Facts
            items={[
              ['Customer', customerName(viewing.customerId)],
              ['Contact', viewing.contactName],
              ['Phone', viewing.contactPhone],
              ['Hours', viewing.hours],
              ['Appointment', viewing.appointmentRequired ? 'Required' : 'Not required'],
              [
                'Coordinates',
                viewing.lat != null
                  ? `${viewing.lat.toFixed(5)}, ${viewing.lng?.toFixed(5)} (${viewing.geocodeSource === 'MANUAL' ? 'set by hand' : 'US Census'})`
                  : null,
              ],
            ]}
          />
          {viewing.notes && <p className="whitespace-pre-wrap text-sm text-gray-700">{viewing.notes}</p>}
        </Drawer>
      )}
      {editing && (
        <LocationForm
          location={editing === 'new' ? null : editing}
          customers={customers}
          onClose={() => setEditing(null)}
          onSaved={(l) => {
            setEditing(null);
            if (viewing) setViewing(l);
            load();
          }}
        />
      )}
    </div>
  );
}

function LocationForm({ location, customers, onClose, onSaved }: {
  location: Location | null;
  customers: Customer[];
  onClose: () => void;
  onSaved: (l: Location) => void;
}) {
  const errors = useFormErrors();
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    errors.clear();
    setBusy(true);
    try {
      const form = e.currentTarget;
      const values = formValues(form);
      const address = nest(values, 'address');
      // Hand-set pin only when ticked; otherwise send no coordinates and let the server geocode.
      const manual = values['pin'] === 'on';
      const body = {
        ...values,
        address,
        appointmentRequired: (form.elements.namedItem('appointmentRequired') as HTMLInputElement).checked,
        lat: manual && values['lat'] ? Number(values['lat']) : null,
        lng: manual && values['lng'] ? Number(values['lng']) : null,
      };
      delete (body as Record<string, unknown>)['pin'];
      onSaved(await request<Location>(location ? 'PUT' : 'POST', location ? `/v1/locations/${location.id}` : '/v1/locations', body));
    } catch (err) {
      errors.set(err);
    } finally {
      setBusy(false);
    }
  }
  const f = errors.fields;
  const v = location;
  const a = v?.address;
  const [pin, setPin] = useState(v?.geocodeSource === 'MANUAL');
  return (
    <Modal title={location ? `Edit ${location.name}` : 'Add location'} onClose={onClose}>
      <form onSubmit={submit} className="max-h-[70vh] space-y-3 overflow-y-auto pr-1" noValidate>
        {errors.message && <Alert>{errors.message}</Alert>}
        <Field label="Name" name="name" required defaultValue={v?.name} error={f['name']} placeholder="e.g. ABC Distribution — Dallas DC" />
        <Field label="Address" name="address.line1" required defaultValue={a?.line1} error={f['address.line1']} />
        <Field label="Address line 2" name="address.line2" defaultValue={a?.line2 ?? ''} />
        <div className="grid grid-cols-3 gap-3">
          <Field label="City" name="address.city" required defaultValue={a?.city} error={f['address.city']} />
          <Field label="State" name="address.state" required maxLength={2} defaultValue={a?.state} error={f['address.state']} />
          <Field label="ZIP" name="address.postalCode" required defaultValue={a?.postalCode} error={f['address.postalCode']} />
        </div>
        <Select
          label="Customer (optional)"
          name="customerId"
          defaultValue={v?.customerId ?? ''}
          options={[['', 'None'], ...customers.map((c): [string, string] => [c.id, c.name])]}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contact" name="contactName" defaultValue={v?.contactName ?? ''} />
          <Field label="Phone" name="contactPhone" type="tel" defaultValue={v?.contactPhone ?? ''} />
        </div>
        <Field label="Hours" name="hours" defaultValue={v?.hours ?? ''} placeholder="Mon–Fri 6am–4pm" />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="appointmentRequired" defaultChecked={v?.appointmentRequired ?? false} /> Appointment required
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="pin" checked={pin} onChange={(e) => setPin(e.target.checked)} /> Set the map pin by hand
        </label>
        {pin && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude" name="lat" inputMode="decimal" defaultValue={v?.lat ?? ''} error={f['lat']} />
            <Field label="Longitude" name="lng" inputMode="decimal" defaultValue={v?.lng ?? ''} error={f['lng']} />
          </div>
        )}
        <Notes defaultValue={v?.notes} />
        <FormButtons busy={busy} onClose={onClose} />
      </form>
    </Modal>
  );
}
