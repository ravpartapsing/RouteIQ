import { describe, expect, it } from 'vitest';
import { call, registerCarrier, uniq, useApp } from './helpers.js';

const getApp = useApp();

describe('carrier registration', () => {
  it('creates the carrier and signs the owner in', async () => {
    const { tokens, carrierCode, email } = await registerCarrier(getApp());
    const me = await call(getApp(), 'GET', '/v1/me', { token: tokens.accessToken });
    expect(me.status).toBe(200);
    expect(me.body.principal).toMatchObject({ kind: 'USER', role: 'OWNER', email });
    expect(me.body.tenant.carrierCode).toBe(carrierCode);
  });

  it('refuses a carrier code that is taken', async () => {
    const first = await registerCarrier(getApp());
    const res = await call(getApp(), 'POST', '/v1/auth/register', {
      body: {
        companyName: 'Copycat',
        carrierCode: first.carrierCode,
        owner: { firstName: 'A', lastName: 'B', email: `${uniq('x')}@example.com`, password: 'long enough password' },
      },
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CARRIER_CODE_TAKEN');
  });

  it('refuses an email that is taken, case-insensitively', async () => {
    const first = await registerCarrier(getApp());
    const res = await call(getApp(), 'POST', '/v1/auth/register', {
      body: {
        companyName: 'Other',
        carrierCode: uniq('c'),
        owner: { firstName: 'A', lastName: 'B', email: first.email.toUpperCase(), password: 'long enough password' },
      },
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('returns per-field messages for invalid input', async () => {
    const res = await call(getApp(), 'POST', '/v1/auth/register', {
      body: { companyName: '', carrierCode: 'x', owner: { email: 'nope', password: 'short' } },
    });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.fields)).toEqual(
      expect.arrayContaining(['companyName', 'carrierCode', 'owner.email', 'owner.password']),
    );
  });
});

describe('web login', () => {
  it('signs in with the right password', async () => {
    const c = await registerCarrier(getApp());
    const res = await call(getApp(), 'POST', '/v1/auth/login', { body: { email: c.email, password: c.password } });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const c = await registerCarrier(getApp());
    const wrong = await call(getApp(), 'POST', '/v1/auth/login', { body: { email: c.email, password: 'nope nope nope' } });
    const unknown = await call(getApp(), 'POST', '/v1/auth/login', {
      body: { email: 'nobody@example.com', password: 'nope nope nope' },
    });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
  });

  it('locks the account after 5 wrong passwords, even for the right one', async () => {
    const c = await registerCarrier(getApp());
    for (let i = 0; i < 5; i++) {
      await call(getApp(), 'POST', '/v1/auth/login', { body: { email: c.email, password: 'wrong wrong wrong' } });
    }
    const res = await call(getApp(), 'POST', '/v1/auth/login', { body: { email: c.email, password: c.password } });
    expect(res.status).toBe(429);
  });

  it('rejects requests without a token, or with a forged one', async () => {
    expect((await call(getApp(), 'GET', '/v1/me')).status).toBe(401);
    expect((await call(getApp(), 'GET', '/v1/me', { token: 'eyJhbGciOiJIUzI1NiJ9.e30.x' })).status).toBe(401);
  });
});

describe('refresh tokens', () => {
  it('rotates: the new token works, the old one does not', async () => {
    const c = await registerCarrier(getApp());
    const first = await call(getApp(), 'POST', '/v1/auth/refresh', { body: { refreshToken: c.tokens.refreshToken } });
    expect(first.status).toBe(200);
    expect(first.body.refreshToken).not.toBe(c.tokens.refreshToken);
    const next = await call(getApp(), 'POST', '/v1/auth/refresh', { body: { refreshToken: first.body.refreshToken } });
    expect(next.status).toBe(200);
  });

  it('treats reuse of an old token as theft and ends every session', async () => {
    const c = await registerCarrier(getApp());
    const rotated = await call(getApp(), 'POST', '/v1/auth/refresh', { body: { refreshToken: c.tokens.refreshToken } });
    // The stolen copy is replayed...
    const replay = await call(getApp(), 'POST', '/v1/auth/refresh', { body: { refreshToken: c.tokens.refreshToken } });
    expect(replay.status).toBe(401);
    // ...and the legitimate, freshly rotated token is dead too.
    const legit = await call(getApp(), 'POST', '/v1/auth/refresh', { body: { refreshToken: rotated.body.refreshToken } });
    expect(legit.status).toBe(401);
  });

  it('logout ends the session', async () => {
    const c = await registerCarrier(getApp());
    expect((await call(getApp(), 'POST', '/v1/auth/logout', { body: { refreshToken: c.tokens.refreshToken } })).status).toBe(204);
    expect((await call(getApp(), 'POST', '/v1/auth/refresh', { body: { refreshToken: c.tokens.refreshToken } })).status).toBe(401);
  });
});
