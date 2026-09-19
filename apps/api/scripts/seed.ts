/**
 * Seeds a demo carrier by calling the real API handlers in-process, so seeded data obeys exactly
 * the same rules as a real sign-up.
 *
 *   pnpm seed              → local DynamoDB
 *   pnpm seed:dev          → the AWS dev table (routeiq-dev)
 *
 * Idempotent: if the demo carrier exists, nothing is written. Credentials are printed once and
 * saved to `.local/seed-<target>.txt` (gitignored).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const target = process.argv.includes('--target=dev') ? 'dev' : 'local';
if (target === 'dev') {
  delete process.env['DDB_ENDPOINT'];
  process.env['TABLE_NAME'] = 'routeiq-dev';
  delete process.env['AWS_ACCESS_KEY_ID'];
  delete process.env['AWS_SECRET_ACCESS_KEY'];
}
process.env['LOG_LEVEL'] = 'silent';

// Imported only now: the DynamoDB client reads its endpoint when the module loads, so a static
// import would have pinned it to local before the target was chosen.
const { tenants } = await import('@routeiq/data');
const { buildApp } = await import('../src/app.js');
const app = await buildApp();

const CARRIER = 'demo';
if (await tenants.getTenantByCarrierCode(CARRIER)) {
  console.log(`carrier "${CARRIER}" already exists in ${target} — nothing to do`);
  process.exit(0);
}

async function post(url: string, body: unknown, token?: string) {
  const res = await app.inject({
    method: 'POST',
    url,
    payload: body as object,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  if (res.statusCode >= 300) throw new Error(`${url} → ${res.statusCode} ${res.body}`);
  return res.json();
}

const ownerPassword = randomBytes(12).toString('base64url');
const owner = await post('/v1/auth/register', {
  companyName: 'Demo Freight LLC',
  carrierCode: CARRIER,
  dotNumber: '1234567',
  owner: { firstName: 'Olivia', lastName: 'Owner', email: 'owner@demo.routeiq.test', password: ownerPassword },
});

const dispatcher = await post(
  '/v1/users',
  { email: 'dispatch@demo.routeiq.test', firstName: 'Dan', lastName: 'Dispatcher', role: 'DISPATCHER' },
  owner.accessToken,
);

const people = [
  { firstName: 'James', lastName: 'Davidson', cdlNumber: 'D1234567', cdlState: 'IL', cdlExpiry: '2027-06-30', phone: '+1 312 555 0143' },
  { firstName: 'Maria', lastName: 'Lopez', cdlNumber: 'L7654321', cdlState: 'TX', cdlExpiry: '2026-11-15', phone: '+1 214 555 0188' },
  { firstName: 'Tom', lastName: 'Becker', cdlNumber: 'B5550001', cdlState: 'OH', cdlExpiry: '2028-02-01', phone: '+1 614 555 0102' },
];
const drivers = [];
for (const p of people) drivers.push(await post('/v1/drivers', p, owner.accessToken));

const lines = [
  `RouteIQ demo carrier — ${target} — seeded ${new Date().toISOString()}`,
  '',
  'Web portal (http://localhost:5173)',
  `  Owner       owner@demo.routeiq.test   password: ${ownerPassword}`,
  `  Dispatcher  dispatch@demo.routeiq.test  set a password at /activate with code ${dispatcher.activation.code}`,
  '',
  `Driver app — carrier code: ${CARRIER}   (codes expire ${drivers[0].activation.expiresAt.slice(0, 10)})`,
  ...drivers.map(
    (d) => `  ${d.driver.driverCode}  ${d.driver.firstName} ${d.driver.lastName}`.padEnd(30) + `activation code ${d.activation.code}`,
  ),
  '',
  'Codes are single-use. Reissue from the portal: Drivers → the driver → New code.',
];
const text = lines.join('\n');
console.log(text);
mkdirSync(new URL('../../../.local/', import.meta.url), { recursive: true });
writeFileSync(new URL(`../../../.local/seed-${target}.txt`, import.meta.url), `${text}\n`);
await app.close();
