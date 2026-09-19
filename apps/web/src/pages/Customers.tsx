import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Customer, Location } from '@routeiq/contracts';
import { request } from '../lib/api';
import { useMe } from '../lib/auth';
import { dollars, formValues, nest } from '../lib/forms';
import { Alert, Badge, Button, Field, Modal, PageHeader, Select, useFormErrors } from '../components/ui';
import { Drawer, Facts } from '../components/Drawer';
import { DocumentsPanel } from '../components/DocumentsPanel';
import { FormButtons, Notes, Table } from './Fleet';

export function Customers() {
  const canEdit = useMe().principal.role !== 'ACCOUNTING';
  const [items, setItems] = useState<Customer[] | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Customer | 'new' | null>(null);
  const [viewing, setViewing] = useState<Customer | null>(null);
  const [q, setQ] = useState('');

  const load = useCallback(() => {
    Promise.all([request<{ items: Customer[] }>('GET', '/v1/customers'), request<{ items: Location[] }>('GET', '/v1/locations')])
      .then(([c, l]) => {
        setItems(c.items);
        setLocations(l.items);
      })
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const shown = (items ?? []).filter(
    (c) => !q || [c.name, c.mcNumber, c.contactName, c.contactEmail].some((v) => v?.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Shippers and brokers you haul for."
        actions={canEdit && <Button onClick={() => setEditing('new')}>Add customer</Button>}
      />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name, MC#, contact…"
        className="mb-3 h-9 w-full max-w-sm rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-accent-500"
      />
      {error && <div className="mb-3"><Alert>{error}</Alert></div>}
      <Table
        empty={q ? 'No customers match.' : 'No customers yet.'}
        loading={items === null}
        head={['Customer', 'Contact', 'MC#', 'Terms', 'Credit limit', 'Status', 'Since']}
        rows={shown.map((c) => ({
          key: c.id,
          onClick: () => setViewing(c),
          cells: [
            <span className="font-medium text-accent-600">{c.name}</span>,
            c.contactName ?? c.contactEmail ?? '—',
            c.mcNumber ?? '—',
            `NET ${c.paymentTermsDays}`,
            dollars(c.creditLimitCents),
            <Badge tone={c.status === 'ACTIVE' ? 'green' : 'gray'}>{c.status === 'ACTIVE' ? 'Active' : 'Inactive'}</Badge>,
            new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
          ],
        }))}
      />
      {viewing && (
        <Drawer
          title={viewing.name}
          subtitle={viewing.mcNumber ? `MC ${viewing.mcNumber}` : undefined}
          onClose={() => setViewing(null)}
          actions={canEdit && <Button variant="secondary" onClick={() => setEditing(viewing)}>Edit</Button>}
        >
          <Facts
            items={[
              ['Contact', viewing.contactName],
              ['Phone', viewing.contactPhone],
              ['Email', viewing.contactEmail],
              ['Billing email', viewing.billingEmail],
              [
                'Billing address',
                viewing.billingAddress &&
                  `${viewing.billingAddress.line1}, ${viewing.billingAddress.city}, ${viewing.billingAddress.state} ${viewing.billingAddress.postalCode}`,
              ],
              ['Payment terms', `NET ${viewing.paymentTermsDays}`],
              ['Credit limit', dollars(viewing.creditLimitCents)],
              ['USDOT', viewing.dotNumber],
            ]}
          />
          {viewing.notes && <p className="whitespace-pre-wrap text-sm text-gray-700">{viewing.notes}</p>}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Locations</h3>
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 text-sm">
              {locations.filter((l) => l.customerId === viewing.id).map((l) => (
                <li key={l.id} className="px-4 py-2">
                  <span className="font-medium">{l.name}</span>
                  <span className="text-gray-500"> · {l.address.city}, {l.address.state}</span>
                </li>
              ))}
              {!locations.some((l) => l.customerId === viewing.id) && (
                <li className="px-4 py-4 text-center text-gray-500">None yet — add them under Locations.</li>
              )}
            </ul>
          </section>
          <DocumentsPanel entityType="CUSTOMER" entityId={viewing.id} types={['RATE_CON', 'W9', 'OTHER']} />
        </Drawer>
      )}
      {editing && (
        <CustomerForm
          customer={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(c) => {
            setEditing(null);
            if (viewing) setViewing(c);
            load();
          }}
        />
      )}
    </div>
  );
}

function CustomerForm({ customer, onClose, onSaved }: { customer: Customer | null; onClose: () => void; onSaved: (c: Customer) => void }) {
  const errors = useFormErrors();
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    errors.clear();
    setBusy(true);
    try {
      const values = formValues(e.currentTarget);
      const billingAddress = nest(values, 'billingAddress');
      const limit = values['creditLimit'];
      delete values['creditLimit'];
      const body = {
        ...values,
        billingAddress,
        paymentTermsDays: values['paymentTermsDays'] ?? 30,
        // Entered in dollars, stored in cents.
        creditLimitCents: limit === null || limit === undefined ? null : Math.round(Number(limit.replace(/[$,]/g, '')) * 100),
      };
      onSaved(await request<Customer>(customer ? 'PUT' : 'POST', customer ? `/v1/customers/${customer.id}` : '/v1/customers', body));
    } catch (err) {
      errors.set(err);
    } finally {
      setBusy(false);
    }
  }
  const f = errors.fields;
  const v = customer;
  const a = v?.billingAddress;
  return (
    <Modal title={customer ? `Edit ${customer.name}` : 'Add customer'} onClose={onClose}>
      <form onSubmit={submit} className="max-h-[70vh] space-y-3 overflow-y-auto pr-1" noValidate>
        {errors.message && <Alert>{errors.message}</Alert>}
        <Field label="Company name" name="name" required defaultValue={v?.name} error={f['name']} />
        <div className="grid grid-cols-3 gap-3">
          <Field label="MC#" name="mcNumber" defaultValue={v?.mcNumber ?? ''} error={f['mcNumber']} />
          <Field label="USDOT" name="dotNumber" defaultValue={v?.dotNumber ?? ''} error={f['dotNumber']} />
          <Select label="Status" name="status" defaultValue={v?.status ?? 'ACTIVE'} options={[['ACTIVE', 'Active'], ['INACTIVE', 'Inactive']]} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Contact" name="contactName" defaultValue={v?.contactName ?? ''} error={f['contactName']} />
          <Field label="Phone" name="contactPhone" type="tel" defaultValue={v?.contactPhone ?? ''} error={f['contactPhone']} />
          <Field label="Email" name="contactEmail" type="email" defaultValue={v?.contactEmail ?? ''} error={f['contactEmail']} />
        </div>
        <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Billing</p>
        <Field label="Billing email" name="billingEmail" type="email" defaultValue={v?.billingEmail ?? ''} error={f['billingEmail']} hint="Invoices go here." />
        <Field label="Address" name="billingAddress.line1" defaultValue={a?.line1 ?? ''} error={f['billingAddress.line1']} />
        <Field label="Address line 2" name="billingAddress.line2" defaultValue={a?.line2 ?? ''} />
        <div className="grid grid-cols-3 gap-3">
          <Field label="City" name="billingAddress.city" defaultValue={a?.city ?? ''} error={f['billingAddress.city']} />
          <Field label="State" name="billingAddress.state" maxLength={2} defaultValue={a?.state ?? ''} error={f['billingAddress.state']} />
          <Field label="ZIP" name="billingAddress.postalCode" defaultValue={a?.postalCode ?? ''} error={f['billingAddress.postalCode']} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Payment terms (days)" name="paymentTermsDays" inputMode="numeric" defaultValue={v?.paymentTermsDays ?? 30} error={f['paymentTermsDays']} />
          <Field
            label="Credit limit ($)"
            name="creditLimit"
            inputMode="decimal"
            defaultValue={v?.creditLimitCents != null ? v.creditLimitCents / 100 : ''}
            error={f['creditLimitCents']}
          />
        </div>
        <Notes defaultValue={v?.notes} />
        <FormButtons busy={busy} onClose={onClose} />
      </form>
    </Modal>
  );
}
