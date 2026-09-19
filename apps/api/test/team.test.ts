import { describe, expect, it } from 'vitest';
import { call, registerCarrier, uniq, useApp } from './helpers.js';

const getApp = useApp();

async function invite(token: string, role = 'DISPATCHER') {
  const email = `${uniq('disp')}@example.com`;
  const res = await call(getApp(), 'POST', '/v1/users', {
    token,
    body: { email, firstName: 'Dana', lastName: 'Dispatch', role },
  });
  return { email, res };
}

describe('team invites', () => {
  it('invite → set password with the code → sign in', async () => {
    const c = await registerCarrier(getApp());
    const { email, res } = await invite(c.tokens.accessToken);
    expect(res.status).toBe(201);
    expect(res.body.user.status).toBe('PENDING');
    expect(res.body.activation.code).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/);

    const activated = await call(getApp(), 'POST', '/v1/auth/activate', {
      body: { email, code: res.body.activation.code.toLowerCase(), password: 'a brand new password' },
    });
    expect(activated.status).toBe(200);

    const login = await call(getApp(), 'POST', '/v1/auth/login', { body: { email, password: 'a brand new password' } });
    expect(login.status).toBe(200);

    // A code works once.
    const again = await call(getApp(), 'POST', '/v1/auth/activate', {
      body: { email, code: res.body.activation.code, password: 'another new password' },
    });
    expect(again.status).toBe(401);
  });

  it('only owners and admins can invite', async () => {
    const c = await registerCarrier(getApp());
    const { email, res } = await invite(c.tokens.accessToken);
    const t = await call(getApp(), 'POST', '/v1/auth/activate', {
      body: { email, code: res.body.activation.code, password: 'a brand new password' },
    });
    const byDispatcher = await invite(t.body.accessToken);
    expect(byDispatcher.res.status).toBe(403);
  });

  it('deactivating a user ends their sessions', async () => {
    const c = await registerCarrier(getApp());
    const { email, res } = await invite(c.tokens.accessToken);
    const t = await call(getApp(), 'POST', '/v1/auth/activate', {
      body: { email, code: res.body.activation.code, password: 'a brand new password' },
    });
    const off = await call(getApp(), 'PATCH', `/v1/users/${res.body.user.id}/status`, {
      token: c.tokens.accessToken,
      body: { status: 'INACTIVE' },
    });
    expect(off.status).toBe(200);
    expect((await call(getApp(), 'POST', '/v1/auth/refresh', { body: { refreshToken: t.body.refreshToken } })).status).toBe(401);
    expect((await call(getApp(), 'POST', '/v1/auth/login', { body: { email, password: 'a brand new password' } })).status).toBe(401);
  });
});
