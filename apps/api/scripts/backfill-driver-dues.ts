/**
 * One-off, 2026-09: drivers created before Phase 2 kept their CDL date as GSI4 keys on the
 * profile. This writes their CDL/medical DUE items and strips the old keys. Safe to re-run.
 *
 *   pnpm --filter @routeiq/api backfill:dues            → local
 *   pnpm --filter @routeiq/api backfill:dues --target=dev
 */
import { ScanCommand } from '@aws-sdk/lib-dynamodb';

const target = process.argv.includes('--target=dev') ? 'dev' : 'local';
if (target === 'dev') {
  delete process.env['DDB_ENDPOINT'];
  process.env['TABLE_NAME'] = 'routeiq-dev';
  delete process.env['AWS_ACCESS_KEY_ID'];
  delete process.env['AWS_SECRET_ACCESS_KEY'];
}
const { ddb, tableName, drivers, strip, transact } = await import('@routeiq/data');
type DriverRecord = import('@routeiq/data').DriverRecord;

let start: Record<string, unknown> | undefined;
let fixed = 0;
do {
  // A scan is acceptable exactly once, on a dev table of a few dozen items. Never in a request path.
  const page = await ddb.send(
    new ScanCommand({
      TableName: tableName(),
      FilterExpression: '#t = :d',
      ExpressionAttributeNames: { '#t': 'type' },
      ExpressionAttributeValues: { ':d': 'DRIVER' },
      ExclusiveStartKey: start,
    }),
  );
  for (const item of page.Items ?? []) {
    const d = strip<DriverRecord>(item)!;
    const record = { ...d, medicalCardExpiry: d.medicalCardExpiry ?? null };
    const result = await transact([
      {
        Update: {
          TableName: tableName(),
          Key: { PK: item['PK'], SK: item['SK'] },
          UpdateExpression: 'SET medicalCardExpiry = if_not_exists(medicalCardExpiry, :n) REMOVE GSI4PK, GSI4SK',
          ExpressionAttributeValues: { ':n': null },
        },
      },
      ...drivers.driverDues(record),
    ]);
    if (result.ok) fixed++;
    console.log(`${result.ok ? 'ok  ' : 'FAIL'} ${d.driverCode} ${d.firstName} ${d.lastName}`);
  }
  start = page.LastEvaluatedKey;
} while (start);
console.log(`${target}: ${fixed} driver(s) backfilled`);
