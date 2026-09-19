import { UpdateCommand, ddb, tableName, getItem } from '../db.js';
import type { Key } from '../keys.js';
import { strip, type CredentialRecord } from './types.js';

export async function getCredential(credKey: Key): Promise<CredentialRecord | undefined> {
  return strip<CredentialRecord>(await getItem(credKey));
}

/** Counts a failed attempt atomically and returns the new total. */
export async function recordFailure(credKey: Key): Promise<number> {
  const out = await ddb.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: credKey,
      UpdateExpression: 'ADD failedAttempts :one',
      ConditionExpression: 'attribute_exists(PK)',
      ExpressionAttributeValues: { ':one': 1 },
      ReturnValues: 'UPDATED_NEW',
    }),
  );
  return out.Attributes?.['failedAttempts'] as number;
}

export async function setLockedUntil(credKey: Key, until: string | null): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: credKey,
      UpdateExpression: 'SET lockedUntil = :u',
      ExpressionAttributeValues: { ':u': until },
    }),
  );
}

/** Burns the activation code — used when too many wrong codes have been tried. */
export async function clearActivation(credKey: Key): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: credKey,
      UpdateExpression: 'SET activationHash = :n, activationExpiresAt = :n',
      ExpressionAttributeValues: { ':n': null },
    }),
  );
}

export async function resetFailures(credKey: Key): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: credKey,
      UpdateExpression: 'SET failedAttempts = :z, lockedUntil = :n',
      ExpressionAttributeValues: { ':z': 0, ':n': null },
    }),
  );
}
