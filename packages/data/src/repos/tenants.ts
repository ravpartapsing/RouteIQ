import { gsi1, key, sortableName } from '../keys.js';
import { getItem, put, transact, UpdateCommand, ddb, tableName } from '../db.js';
import { emptyCredential, strip, type TenantRecord, type UserRecord } from './types.js';

export type CreateTenantResult =
  | { ok: true; tenant: TenantRecord; owner: UserRecord }
  | { ok: false; conflict: 'CARRIER_CODE' | 'EMAIL' };

/**
 * Carrier and its owner in one transaction, with the carrier-code and email guards — so a
 * half-registered carrier, or two carriers with the same code, cannot exist.
 */
export async function createTenantWithOwner(input: {
  tenantId: string;
  name: string;
  carrierCode: string;
  dotNumber: string | null;
  owner: { id: string; email: string; firstName: string; lastName: string; passwordHash: string };
  now: string;
}): Promise<CreateTenantResult> {
  const tenant: TenantRecord = {
    id: input.tenantId,
    name: input.name,
    carrierCode: input.carrierCode,
    dotNumber: input.dotNumber,
    featureOverrides: {},
    createdAt: input.now,
    updatedAt: input.now,
  };
  const owner: UserRecord = {
    id: input.owner.id,
    tenantId: input.tenantId,
    email: input.owner.email,
    firstName: input.owner.firstName,
    lastName: input.owner.lastName,
    role: 'OWNER',
    status: 'ACTIVE',
    lastLoginAt: null,
    createdAt: input.now,
    updatedAt: input.now,
  };

  const result = await transact([
    put({ ...key.unique('CARRIER_CODE', input.carrierCode), type: 'UNIQUE', ownerId: input.tenantId, tenantId: input.tenantId }, true),
    put({ ...key.unique('EMAIL', input.owner.email), type: 'UNIQUE', ownerId: owner.id, tenantId: input.tenantId }, true),
    put({ ...key.tenant(input.tenantId), type: 'TENANT', ...tenant }, true),
    put({ ...key.user(owner.id), type: 'USER', ...userIndexes(owner), ...owner }, true),
    put({ ...key.userCredential(owner.id), type: 'USER_CRED', ...emptyCredential(input.tenantId), passwordHash: input.owner.passwordHash }, true),
  ]);
  if (!result.ok) return { ok: false, conflict: result.failedIndexes.includes(0) ? 'CARRIER_CODE' : 'EMAIL' };
  return { ok: true, tenant, owner };
}

export function userIndexes(user: UserRecord) {
  return gsi1.byStatus(user.tenantId, 'USER', user.status, sortableName(user.lastName, user.firstName), user.id);
}

export async function getTenant(tenantId: string): Promise<TenantRecord | undefined> {
  return strip<TenantRecord>(await getItem(key.tenant(tenantId)));
}

export async function getTenantByCarrierCode(carrierCode: string): Promise<TenantRecord | undefined> {
  const guard = await getItem<{ ownerId: string }>(key.unique('CARRIER_CODE', carrierCode));
  return guard ? getTenant(guard.ownerId) : undefined;
}

/** `null` clears an override (back to the platform default); a boolean sets it. */
export async function updateFeatureOverrides(
  tenantId: string,
  changes: Record<string, boolean | null>,
  now: string,
): Promise<TenantRecord> {
  const current = (await getTenant(tenantId))?.featureOverrides ?? {};
  const next: Record<string, boolean> = { ...current };
  for (const [name, value] of Object.entries(changes)) {
    if (value === null) delete next[name];
    else next[name] = value;
  }
  const out = await ddb.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: key.tenant(tenantId),
      UpdateExpression: 'SET featureOverrides = :f, updatedAt = :now',
      ConditionExpression: 'attribute_exists(PK)',
      ExpressionAttributeValues: { ':f': next, ':now': now },
      ReturnValues: 'ALL_NEW',
    }),
  );
  return strip<TenantRecord>(out.Attributes)!;
}
