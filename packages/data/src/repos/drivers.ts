import { driverCodeGuardValue, gsi1, gsi4, key, sortableName } from '../keys.js';
import { getItem, nextSequence, put, queryIndex, transact, tableName, type TransactItem } from '../db.js';
import { emptyCredential, strip, type DriverRecord, type PersonStatus } from './types.js';

const STATUSES: PersonStatus[] = ['ACTIVE', 'PENDING', 'INACTIVE'];

function driverIndexes(d: DriverRecord) {
  return {
    ...gsi1.byStatus(d.tenantId, 'DRIVER', d.status, sortableName(d.lastName, d.firstName), d.id),
    // Sparse: only drivers with a CDL expiry appear in the nightly compliance sweep.
    ...(d.cdlExpiry ? gsi4.dueOn(d.tenantId, 'CDL', d.cdlExpiry, d.id) : {}),
  };
}

export async function getDriver(driverId: string): Promise<DriverRecord | undefined> {
  return strip<DriverRecord>(await getItem(key.driver(driverId)));
}

export async function getDriverByCode(tenantId: string, driverCode: string): Promise<DriverRecord | undefined> {
  const guard = await getItem<{ ownerId: string }>(
    key.unique('DRIVER_CODE', driverCodeGuardValue(tenantId, driverCode)),
  );
  return guard ? getDriver(guard.ownerId) : undefined;
}

export async function listDrivers(tenantId: string): Promise<DriverRecord[]> {
  const pages = await Promise.all(
    STATUSES.map((s) => queryIndex<Record<string, unknown>>('GSI1', `TENANT#${tenantId}#DRIVER#${s}`)),
  );
  return pages.flat().map((i) => strip<DriverRecord>(i)!);
}

/** D-0001, D-0002 … from an atomic per-carrier counter. */
export async function nextDriverCode(tenantId: string): Promise<string> {
  const n = await nextSequence(key.sequence(tenantId, 'DRIVER'));
  return `D-${String(n).padStart(4, '0')}`;
}

export type CreateDriverResult = { ok: true; driver: DriverRecord } | { ok: false; conflict: 'DRIVER_CODE' };

export async function createDriver(input: {
  driver: Omit<DriverRecord, 'status' | 'activatedAt' | 'deviceName' | 'createdAt' | 'updatedAt'>;
  activationHash: string;
  activationExpiresAt: string;
  now: string;
}): Promise<CreateDriverResult> {
  const driver: DriverRecord = {
    ...input.driver,
    status: 'PENDING',
    activatedAt: null,
    deviceName: null,
    createdAt: input.now,
    updatedAt: input.now,
  };
  const result = await transact([
    put(
      {
        ...key.unique('DRIVER_CODE', driverCodeGuardValue(driver.tenantId, driver.driverCode)),
        type: 'UNIQUE',
        ownerId: driver.id,
        tenantId: driver.tenantId,
      },
      true,
    ),
    put({ ...key.driver(driver.id), type: 'DRIVER', ...driverIndexes(driver), ...driver }, true),
    put(
      {
        ...key.driverCredential(driver.id),
        type: 'DRIVER_CRED',
        ...emptyCredential(driver.tenantId),
        activationHash: input.activationHash,
        activationExpiresAt: input.activationExpiresAt,
      },
      true,
    ),
  ]);
  return result.ok ? { ok: true, driver } : { ok: false, conflict: 'DRIVER_CODE' };
}

function metaUpdate(d: DriverRecord, changes: Partial<DriverRecord>, now: string): TransactItem {
  const next = { ...d, ...changes };
  const idx = driverIndexes(next);
  const names: Record<string, string> = { '#s': 'status' };
  const values: Record<string, unknown> = {
    ':s': next.status,
    ':a': next.activatedAt,
    ':d': next.deviceName,
    ':pk': idx.GSI1PK,
    ':sk': idx.GSI1SK,
    ':now': now,
  };
  return {
    Update: {
      TableName: tableName(),
      Key: key.driver(d.id),
      UpdateExpression:
        'SET #s = :s, activatedAt = :a, deviceName = :d, GSI1PK = :pk, GSI1SK = :sk, updatedAt = :now',
      ConditionExpression: 'attribute_exists(PK)',
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    },
  };
}

/** Binds the driver to one device, only if the activation code checked is still current. */
export async function activateDriver(
  d: DriverRecord,
  expectedActivationHash: string,
  device: { id: string; name: string | null },
  now: string,
) {
  return transact([
    {
      Update: {
        TableName: tableName(),
        Key: key.driverCredential(d.id),
        UpdateExpression:
          'SET activationHash = :n, activationExpiresAt = :n, deviceId = :dev, failedAttempts = :z, lockedUntil = :n',
        ConditionExpression: 'activationHash = :h',
        ExpressionAttributeValues: { ':n': null, ':dev': device.id, ':z': 0, ':h': expectedActivationHash },
      },
    },
    metaUpdate(d, { status: 'ACTIVE', activatedAt: now, deviceName: device.name }, now),
  ]);
}

/** New code, old device unbound. The caller also revokes the driver's sessions. */
export async function reissueDriverCode(d: DriverRecord, activationHash: string, expiresAt: string, now: string) {
  await transact([
    {
      Update: {
        TableName: tableName(),
        Key: key.driverCredential(d.id),
        UpdateExpression:
          'SET activationHash = :h, activationExpiresAt = :e, deviceId = :n, failedAttempts = :z, lockedUntil = :n',
        ExpressionAttributeValues: { ':h': activationHash, ':e': expiresAt, ':n': null, ':z': 0 },
      },
    },
    metaUpdate(d, { status: 'PENDING', activatedAt: null, deviceName: null }, now),
  ]);
}

export async function setDriverStatus(d: DriverRecord, status: PersonStatus, now: string) {
  await transact([metaUpdate(d, { status }, now)]);
}
