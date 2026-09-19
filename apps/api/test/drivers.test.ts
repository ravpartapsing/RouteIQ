import { describe, expect, it } from 'vitest';
import { call, registerCarrier, useApp } from './helpers.js';

const getApp = useApp();

async function addDriver(token: string, extra: Record<string, unknown> = {}) {
  return call(getApp(), 'POST', '/v1/drivers', {
    token,
    body: { firstName: 'Dee', lastName: 'Driver', cdlState: 'tx', cdlExpiry: '2027-03-01', ...extra },
  });
}

function activate(carrierCode: string, driverCode: string, code: string, deviceId = 'pixel-10-device-id') {
  return call(getApp(), 'POST', '/v1/auth/driver/activate', {
    body: { carrierCode, driverCode, code, deviceId, deviceName: 'Pixel 10' },
  });
}

describe('dispatcher-issued driver credentials', () => {
  it('numbers drivers D-0001, D-0002 per carrier', async () => {
    const c = await registerCarrier(getApp());
    const a = await addDriver(c.tokens.accessToken);
    const b = await addDriver(c.tokens.accessToken);
    expect(a.body.driver.driverCode).toBe('D-0001');
    expect(b.body.driver.driverCode).toBe('D-0002');
    expect(a.body.driver.cdlState).toBe('TX');
  });

  it('refuses a hand-typed driver code that is already used', async () => {
    const c = await registerCarrier(getApp());
    await addDriver(c.tokens.accessToken, { driverCode: 'T-42' });
    const dup = await addDriver(c.tokens.accessToken, { driverCode: 't-42' });
    expect(dup.status).toBe(409);
  });

  it('carrier code + driver code + activation code signs the driver in on one device', async () => {
    const c = await registerCarrier(getApp());
    const d = await addDriver(c.tokens.accessToken);
    const res = await activate(c.carrierCode.toUpperCase(), 'd-0001', d.body.activation.code.replace('-', ''));
    expect(res.status).toBe(200);

    const me = await call(getApp(), 'GET', '/v1/me', { token: res.body.accessToken });
    expect(me.body.principal).toMatchObject({ kind: 'DRIVER', driverCode: 'D-0001', firstName: 'Dee' });

    const listed = await call(getApp(), 'GET', `/v1/drivers/${d.body.driver.id}`, { token: c.tokens.accessToken });
    expect(listed.body).toMatchObject({ status: 'ACTIVE', deviceName: 'Pixel 10' });

    // Drivers cannot use dispatcher endpoints.
    expect((await call(getApp(), 'GET', '/v1/drivers', { token: res.body.accessToken })).status).toBe(403);
  });

  it('burns the code after 5 wrong tries', async () => {
    const c = await registerCarrier(getApp());
    const d = await addDriver(c.tokens.accessToken);
    let last;
    for (let i = 0; i < 5; i++) last = await activate(c.carrierCode, 'D-0001', 'ZZZZZZZZ');
    expect(last!.body.error.code).toBe('CODE_LOCKED');
    const right = await activate(c.carrierCode, 'D-0001', d.body.activation.code);
    expect(right.status).toBe(401);
  });

  it('reissuing a code signs the old phone out', async () => {
    const c = await registerCarrier(getApp());
    const d = await addDriver(c.tokens.accessToken);
    const phone = await activate(c.carrierCode, 'D-0001', d.body.activation.code);

    const re = await call(getApp(), 'POST', `/v1/drivers/${d.body.driver.id}/reissue-code`, { token: c.tokens.accessToken });
    expect(re.status).toBe(200);
    expect(re.body.driver.status).toBe('PENDING');

    expect((await call(getApp(), 'POST', '/v1/auth/refresh', { body: { refreshToken: phone.body.refreshToken } })).status).toBe(401);
    expect((await activate(c.carrierCode, 'D-0001', re.body.activation.code, 'new-phone-device')).status).toBe(200);
  });

  it('deactivating a driver signs them out and blocks activation', async () => {
    const c = await registerCarrier(getApp());
    const d = await addDriver(c.tokens.accessToken);
    const phone = await activate(c.carrierCode, 'D-0001', d.body.activation.code);
    await call(getApp(), 'PATCH', `/v1/drivers/${d.body.driver.id}/status`, {
      token: c.tokens.accessToken,
      body: { status: 'INACTIVE' },
    });
    expect((await call(getApp(), 'POST', '/v1/auth/refresh', { body: { refreshToken: phone.body.refreshToken } })).status).toBe(401);
  });
});

describe('carrier isolation', () => {
  it('one carrier cannot see or touch another carrier’s drivers', async () => {
    const a = await registerCarrier(getApp());
    const b = await registerCarrier(getApp());
    const d = await addDriver(a.tokens.accessToken);

    expect((await call(getApp(), 'GET', `/v1/drivers/${d.body.driver.id}`, { token: b.tokens.accessToken })).status).toBe(404);
    expect(
      (await call(getApp(), 'POST', `/v1/drivers/${d.body.driver.id}/reissue-code`, { token: b.tokens.accessToken })).status,
    ).toBe(404);
    const list = await call(getApp(), 'GET', '/v1/drivers', { token: b.tokens.accessToken });
    expect(list.body.items).toEqual([]);

    // Driver code D-0001 exists at both carriers independently.
    await addDriver(b.tokens.accessToken);
    expect((await activate(b.carrierCode, 'D-0001', d.body.activation.code)).status).toBe(401);
  });
});

describe('carrier feature switches', () => {
  it('a carrier can turn maps off for itself but cannot turn routing on', async () => {
    const c = await registerCarrier(getApp());
    const res = await call(getApp(), 'PATCH', '/v1/tenant/features', {
      token: c.tokens.accessToken,
      body: { maps: false, routing: true },
    });
    expect(res.status).toBe(200);
    expect(res.body.features).toEqual({ maps: false, routing: false, mapMatching: false });

    const cfg = await call(getApp(), 'GET', '/config', { token: c.tokens.accessToken });
    expect(cfg.body).toEqual({ features: { maps: false, routing: false, mapMatching: false }, map: null });
    // Anonymous callers still see the platform default.
    expect((await call(getApp(), 'GET', '/config')).body.features.maps).toBe(true);

    const cleared = await call(getApp(), 'PATCH', '/v1/tenant/features', { token: c.tokens.accessToken, body: { maps: null } });
    expect(cleared.body.features.maps).toBe(true);
  });
});
