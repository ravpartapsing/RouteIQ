import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { gsi2, key, type EntityName } from '../keys.js';
import { ttlInDays } from '../client.js';
import { getItem, putItem, queryIndexPrefix, UpdateCommand, ddb, tableName } from '../db.js';
import { strip } from './types.js';

export interface DocumentRecord {
  id: string;
  tenantId: string;
  entityType: EntityName;
  entityId: string;
  docType: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  /** S3 key. Never sent to clients — they get short-lived signed URLs instead. */
  objectKey: string;
  status: 'PENDING' | 'READY';
  uploadedBy: { kind: 'USER' | 'DRIVER'; id: string; name: string };
  createdAt: string;
}

/**
 * Written before the upload starts, as PENDING with a one-day TTL: an upload that is abandoned
 * cleans its own record up. Completing it clears the TTL.
 */
export async function createPending(d: DocumentRecord): Promise<void> {
  await putItem({
    ...key.document(d.id),
    type: 'DOC',
    ...gsi2.ofParent(d.entityType, d.entityId, 'DOC', d.createdAt, d.id),
    ...d,
    ttl: ttlInDays(1),
  });
}

export async function markReady(id: string, sizeBytes: number): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: key.document(id),
      UpdateExpression: 'SET #s = :ready, sizeBytes = :size REMOVE #ttl',
      ConditionExpression: 'attribute_exists(PK)',
      ExpressionAttributeNames: { '#s': 'status', '#ttl': 'ttl' },
      ExpressionAttributeValues: { ':ready': 'READY', ':size': sizeBytes },
    }),
  );
}

export async function getDocument(id: string): Promise<DocumentRecord | undefined> {
  return strip<DocumentRecord>(await getItem(key.document(id)));
}

export async function listForEntity(entityType: EntityName, entityId: string): Promise<DocumentRecord[]> {
  const items = await queryIndexPrefix<Record<string, unknown>>('GSI2', `${entityType}#${entityId}`, 'DOC#');
  return items.map((i) => strip<DocumentRecord>(i)!).filter((d) => d.status === 'READY');
}

export async function deleteDocument(id: string): Promise<void> {
  await ddb.send(new DeleteCommand({ TableName: tableName(), Key: key.document(id) }));
}
