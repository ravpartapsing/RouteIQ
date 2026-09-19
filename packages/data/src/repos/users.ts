import { key } from '../keys.js';
import { getItem, put, queryIndex, transact, UpdateCommand, ddb, tableName, type TransactItem } from '../db.js';
import { userIndexes } from './tenants.js';
import { emptyCredential, strip, type PersonStatus, type UserRecord, type UserRole } from './types.js';

const STATUSES: PersonStatus[] = ['ACTIVE', 'PENDING', 'INACTIVE'];

export async function getUser(userId: string): Promise<UserRecord | undefined> {
  return strip<UserRecord>(await getItem(key.user(userId)));
}

export async function getUserByEmail(email: string): Promise<UserRecord | undefined> {
  const guard = await getItem<{ ownerId: string }>(key.unique('EMAIL', email));
  return guard ? getUser(guard.ownerId) : undefined;
}

export async function listUsers(tenantId: string): Promise<UserRecord[]> {
  const pages = await Promise.all(
    STATUSES.map((s) => queryIndex<Record<string, unknown>>('GSI1', `TENANT#${tenantId}#USER#${s}`)),
  );
  return pages.flat().map((i) => strip<UserRecord>(i)!);
}

export type InviteResult = { ok: true; user: UserRecord } | { ok: false; conflict: 'EMAIL' };

export async function inviteUser(input: {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Exclude<UserRole, 'OWNER'>;
  activationHash: string;
  activationExpiresAt: string;
  now: string;
}): Promise<InviteResult> {
  const user: UserRecord = {
    id: input.id,
    tenantId: input.tenantId,
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    role: input.role,
    status: 'PENDING',
    lastLoginAt: null,
    createdAt: input.now,
    updatedAt: input.now,
  };
  const result = await transact([
    put({ ...key.unique('EMAIL', input.email), type: 'UNIQUE', ownerId: user.id, tenantId: input.tenantId }, true),
    put({ ...key.user(user.id), type: 'USER', ...userIndexes(user), ...user }, true),
    put(
      {
        ...key.userCredential(user.id),
        type: 'USER_CRED',
        ...emptyCredential(input.tenantId),
        activationHash: input.activationHash,
        activationExpiresAt: input.activationExpiresAt,
      },
      true,
    ),
  ]);
  return result.ok ? { ok: true, user } : { ok: false, conflict: 'EMAIL' };
}

/** Status change also moves the user between GSI1 partitions, so both must change together. */
function statusUpdate(user: UserRecord, status: PersonStatus, now: string, extra = ''): TransactItem {
  const idx = userIndexes({ ...user, status });
  return {
    Update: {
      TableName: tableName(),
      Key: key.user(user.id),
      UpdateExpression: `SET #s = :s, GSI1PK = :pk, GSI1SK = :sk, updatedAt = :now${extra}`,
      ConditionExpression: 'attribute_exists(PK)',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':s': status, ':pk': idx.GSI1PK, ':sk': idx.GSI1SK, ':now': now },
    },
  };
}

/** Sets the password — only if the stored activation hash is still the one that was checked. */
export async function activateUser(user: UserRecord, expectedActivationHash: string, passwordHash: string, now: string) {
  return transact([
    {
      Update: {
        TableName: tableName(),
        Key: key.userCredential(user.id),
        UpdateExpression:
          'SET passwordHash = :p, activationHash = :n, activationExpiresAt = :n, failedAttempts = :z, lockedUntil = :n',
        ConditionExpression: 'activationHash = :h',
        ExpressionAttributeValues: { ':p': passwordHash, ':n': null, ':z': 0, ':h': expectedActivationHash },
      },
    },
    statusUpdate(user, 'ACTIVE', now),
  ]);
}

export async function reissueUserCode(user: UserRecord, activationHash: string, expiresAt: string, now: string) {
  await transact([
    {
      Update: {
        TableName: tableName(),
        Key: key.userCredential(user.id),
        UpdateExpression:
          'SET activationHash = :h, activationExpiresAt = :e, passwordHash = :n, failedAttempts = :z, lockedUntil = :n',
        ExpressionAttributeValues: { ':h': activationHash, ':e': expiresAt, ':n': null, ':z': 0 },
      },
    },
    statusUpdate(user, 'PENDING', now),
  ]);
}

export async function setUserStatus(user: UserRecord, status: PersonStatus, now: string) {
  await transact([statusUpdate(user, status, now)]);
}

export async function recordUserLogin(userId: string, now: string): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: key.user(userId),
      UpdateExpression: 'SET lastLoginAt = :now',
      ExpressionAttributeValues: { ':now': now },
    }),
  );
}
