import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { key } from '../keys.js';
import { ttlInDays } from '../client.js';
import { getItem, putItem, queryPrefix, UpdateCommand, ddb, tableName, isConditionFailure } from '../db.js';
import { strip, type SessionRecord } from './types.js';

type Kind = SessionRecord['principalKind'];

export async function createSession(session: SessionRecord, ttlDays: number): Promise<void> {
  await putItem({
    ...key.session(session.principalKind, session.principalId, session.id),
    type: 'SESSION',
    ...session,
    // DynamoDB deletes expired sessions itself; the check in code is what actually enforces expiry.
    ttl: ttlInDays(ttlDays, new Date(session.createdAt)),
  });
}

export async function getSession(kind: Kind, principalId: string, sessionId: string) {
  return strip<SessionRecord>(await getItem(key.session(kind, principalId, sessionId)));
}

/**
 * Swaps the refresh secret, conditional on the old one still being current. If two requests
 * race with the same token, exactly one wins; the loser sees `false` and treats it as reuse.
 */
export async function rotateSession(
  kind: Kind,
  principalId: string,
  sessionId: string,
  oldHash: string,
  newHash: string,
  now: string,
): Promise<boolean> {
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: tableName(),
        Key: key.session(kind, principalId, sessionId),
        UpdateExpression: 'SET secretHash = :new, lastUsedAt = :now',
        ConditionExpression: 'secretHash = :old',
        ExpressionAttributeValues: { ':new': newHash, ':old': oldHash, ':now': now },
      }),
    );
    return true;
  } catch (error) {
    if (isConditionFailure(error)) return false;
    throw error;
  }
}

export async function deleteSession(kind: Kind, principalId: string, sessionId: string): Promise<void> {
  await ddb.send(new DeleteCommand({ TableName: tableName(), Key: key.session(kind, principalId, sessionId) }));
}

/** Signs a person out everywhere — deactivation, code reissue, or detected token reuse. */
export async function revokeAllSessions(kind: Kind, principalId: string): Promise<number> {
  const sessions = await queryPrefix<{ PK: string; SK: string }>(`${kind}#${principalId}`, 'SESSION#');
  await Promise.all(
    sessions.map((s) => ddb.send(new DeleteCommand({ TableName: tableName(), Key: { PK: s.PK, SK: s.SK } }))),
  );
  return sessions.length;
}
