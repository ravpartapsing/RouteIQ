import { describe, expect, it } from 'vitest';
import { call, inDays, registerCarrier, useApp } from './helpers.js';

const getApp = useApp();

async function truck(token: string, body: Record<string, unknown>) {
  return call(getApp(), 'POST', '/v1/trucks', { token, body: { unitNumber: '101', ...body } });
}

describe('trucks', () => {
  it('creates, lists in unit order, and refuses a duplicate unit number', async () => {
    const c = await registerCarrier(getApp());
    const t = c.tokens.accessToken;
    for (const unit of ['12', '7', 'A-1']) expect((await truck(t, { unitNumber: unit })).status).toBe(201);
    const dup = await truck(t, { unitNumber: 'a-1' });
    expect(dup.status).toBe(409);
    expect(dup.body.error.fields.unitNumber).toBeTruthy();

    const list = await call(getApp(), 'GET', '/v1/trucks', { token: t });
    expect(list.body.items.map((x: { unitNumber: string }) => x.unitNumber)).toEqual(['7', '12', 'A-1']);
  });

  it('validates a VIN', async () => {
    const c = await registerCarrier(getApp());
    const bad = await truck(c.tokens.accessToken, { vin: '1HGCM82633A00435O' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.fields.vin).toMatch(/no I, O or Q/);
  });

  it('renaming a unit frees the old number for another truck', async () => {
    const c = await registerCarrier(getApp());
    const t = c.tokens.accessToken;
    const a = await truck(t, { unitNumber: '200' });
    const renamed = await call(getApp(), 'PUT', `/v1/trucks/${a.body.id}`, { token: t, body: { unitNumber: '201' } });
    expect(renamed.status).toBe(200);
    expect((await truck(t, { unitNumber: '200' })).status).toBe(201);
    expect((await truck(t, { unitNumber: '201' })).status).toBe(409);
  });

  it('will not assign a driver from another carrier', async () => {
    const a = await registerCarrier(getApp());
    const b = await registerCarrier(getApp());
    const d = await call(getApp(), 'POST', '/v1/drivers', {
      token: a.tokens.accessToken,
      body: { firstName: 'A', lastName: 'Driver' },
    });
    const res = await truck(b.tokens.accessToken, { assignedDriverId: d.body.driver.id });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.assignedDriverId).toBe('Driver not found');
  });

  it('the same unit number is fine at two carriers, and neither sees the other', async () => {
    const a = await registerCarrier(getApp());
    const b = await registerCarrier(getApp());
    const ta = await truck(a.tokens.accessToken, { unitNumber: '1' });
    expect((await truck(b.tokens.accessToken, { unitNumber: '1' })).status).toBe(201);
    expect((await call(getApp(), 'GET', `/v1/trucks/${ta.body.id}`, { token: b.tokens.accessToken })).status).toBe(404);
    expect(
      (await call(getApp(), 'PUT', `/v1/trucks/${ta.body.id}`, { token: b.tokens.accessToken, body: { unitNumber: '9' } }))
        .status,
    ).toBe(404);
  });
});

describe('expiry tracking', () => {
  it('lists overdue and upcoming dates across drivers and trucks, soonest first', async () => {
    const c = await registerCarrier(getApp());
    const t = c.tokens.accessToken;
    await truck(t, { unitNumber: '5', registrationExpiry: inDays(10), insuranceExpiry: inDays(400) });
    await call(getApp(), 'POST', '/v1/trailers', { token: t, body: { unitNumber: 'T9', inspectionExpiry: inDays(30) } });
    await call(getApp(), 'POST', '/v1/drivers', {
      token: t,
      body: { firstName: 'Late', lastName: 'Renewal', cdlExpiry: inDays(-3) },
    });

    const due = await call(getApp(), 'GET', '/v1/compliance/due?withinDays=60', { token: t });
    expect(due.status).toBe(200);
    expect(due.body.items.map((i: { label: string; kind: string; daysLeft: number }) => [i.label, i.kind, i.daysLeft])).toEqual([
      ['Late Renewal (D-0001)', 'CDL', -3],
      ['Truck 5', 'REGISTRATION', 10],
      ['Trailer T9', 'INSPECTION', 30],
    ]);
  });

  it('drops a truck from the list when its date is cleared or it is deactivated', async () => {
    const c = await registerCarrier(getApp());
    const t = c.tokens.accessToken;
    const a = await truck(t, { unitNumber: '1', registrationExpiry: inDays(5) });
    const b = await truck(t, { unitNumber: '2', registrationExpiry: inDays(6) });
    await call(getApp(), 'PUT', `/v1/trucks/${a.body.id}`, { token: t, body: { unitNumber: '1' } });
    await call(getApp(), 'PUT', `/v1/trucks/${b.body.id}`, {
      token: t,
      body: { unitNumber: '2', status: 'INACTIVE', registrationExpiry: inDays(6) },
    });
    const due = await call(getApp(), 'GET', '/v1/compliance/due', { token: t });
    expect(due.body.items).toEqual([]);
  });

  it('editing a driver moves their dates', async () => {
    const c = await registerCarrier(getApp());
    const t = c.tokens.accessToken;
    const d = await call(getApp(), 'POST', '/v1/drivers', { token: t, body: { firstName: 'Med', lastName: 'Card' } });
    const edited = await call(getApp(), 'PUT', `/v1/drivers/${d.body.driver.id}`, {
      token: t,
      body: { firstName: 'Med', lastName: 'Card', medicalCardExpiry: inDays(20) },
    });
    expect(edited.status).toBe(200);
    expect(edited.body.medicalCardExpiry).toBe(inDays(20));
    const due = await call(getApp(), 'GET', '/v1/compliance/due', { token: t });
    expect(due.body.items).toEqual([expect.objectContaining({ kind: 'MEDICAL', daysLeft: 20 })]);
  });

  it('never shows another carrier’s dates', async () => {
    const a = await registerCarrier(getApp());
    const b = await registerCarrier(getApp());
    await truck(a.tokens.accessToken, { registrationExpiry: inDays(3) });
    expect((await call(getApp(), 'GET', '/v1/compliance/due', { token: b.tokens.accessToken })).body.items).toEqual([]);
  });
});

describe('customers and locations', () => {
  it('stores a customer with money in cents and a billing address', async () => {
    const c = await registerCarrier(getApp());
    const res = await call(getApp(), 'POST', '/v1/customers', {
      token: c.tokens.accessToken,
      body: {
        name: 'Acme Foods',
        creditLimitCents: 5_000_000,
        billingAddress: { line1: '1 Main St', city: 'Chicago', state: 'il', postalCode: '60601' },
      },
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ paymentTermsDays: 30, creditLimitCents: 5_000_000, billingAddress: { state: 'IL' } });
  });

  it('keeps a hand-pinned location and leaves an unresolved one without coordinates', async () => {
    const c = await registerCarrier(getApp());
    const t = c.tokens.accessToken;
    const address = { line1: '500 Dock Rd', city: 'Dallas', state: 'TX', postalCode: '75201' };
    const pinned = await call(getApp(), 'POST', '/v1/locations', {
      token: t,
      body: { name: 'ABC Distribution', address, lat: 32.78, lng: -96.8 },
    });
    expect(pinned.body).toMatchObject({ lat: 32.78, lng: -96.8, geocodeSource: 'MANUAL' });

    const plain = await call(getApp(), 'POST', '/v1/locations', { token: t, body: { name: 'Plain', address } });
    expect(plain.body).toMatchObject({ lat: null, geocodeSource: null });
  });

  it('will not link a location to another carrier’s customer', async () => {
    const a = await registerCarrier(getApp());
    const b = await registerCarrier(getApp());
    const cust = await call(getApp(), 'POST', '/v1/customers', { token: a.tokens.accessToken, body: { name: 'Mine' } });
    const res = await call(getApp(), 'POST', '/v1/locations', {
      token: b.tokens.accessToken,
      body: {
        name: 'Theirs',
        customerId: cust.body.id,
        address: { line1: '1 A St', city: 'X', state: 'TX', postalCode: '75001' },
      },
    });
    expect(res.status).toBe(400);
  });
});
