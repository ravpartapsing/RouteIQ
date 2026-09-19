import {
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
  type TransactWriteCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { ddb, tableName } from './client.js';
import type { Key } from './keys.js';

export type TransactItem = NonNullable<TransactWriteCommandInput['TransactItems']>[number];

export async function getItem<T>(key: Key, consistent = true): Promise<T | undefined> {
  const out = await ddb.send(new GetCommand({ TableName: tableName(), Key: key, ConsistentRead: consistent }));
  return out.Item as T | undefined;
}

export async function putItem(item: Record<string, unknown>): Promise<void> {
  await ddb.send(new PutCommand({ TableName: tableName(), Item: item }));
}

/** Items that share a PK and whose SK starts with a prefix — an item collection read. */
export async function queryPrefix<T>(pk: string, skPrefix: string): Promise<T[]> {
  const items: T[] = [];
  let start: Record<string, unknown> | undefined;
  do {
    const out = await ddb.send(
      new QueryCommand({
        TableName: tableName(),
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: { ':pk': pk, ':sk': skPrefix },
        ExclusiveStartKey: start,
      }),
    );
    items.push(...((out.Items ?? []) as T[]));
    start = out.LastEvaluatedKey;
  } while (start);
  return items;
}

export async function queryIndex<T>(index: 'GSI1' | 'GSI2' | 'GSI3' | 'GSI4', pk: string, limit = 500): Promise<T[]> {
  const items: T[] = [];
  let start: Record<string, unknown> | undefined;
  do {
    const out = await ddb.send(
      new QueryCommand({
        TableName: tableName(),
        IndexName: index,
        KeyConditionExpression: `${index}PK = :pk`,
        ExpressionAttributeValues: { ':pk': pk },
        ExclusiveStartKey: start,
      }),
    );
    items.push(...((out.Items ?? []) as T[]));
    start = items.length < limit ? out.LastEvaluatedKey : undefined;
  } while (start);
  return items;
}

/** Index query with a sort-key upper bound — "everything due on or before this date". */
export async function queryIndexUpTo<T>(index: 'GSI1' | 'GSI2' | 'GSI3' | 'GSI4', pk: string, skMax: string): Promise<T[]> {
  const items: T[] = [];
  let start: Record<string, unknown> | undefined;
  do {
    const out = await ddb.send(
      new QueryCommand({
        TableName: tableName(),
        IndexName: index,
        KeyConditionExpression: `${index}PK = :pk AND ${index}SK <= :max`,
        ExpressionAttributeValues: { ':pk': pk, ':max': skMax },
        ExclusiveStartKey: start,
      }),
    );
    items.push(...((out.Items ?? []) as T[]));
    start = out.LastEvaluatedKey;
  } while (start);
  return items;
}

/** Index query with a sort-key prefix — "this customer's documents". */
export async function queryIndexPrefix<T>(index: 'GSI1' | 'GSI2' | 'GSI3' | 'GSI4', pk: string, skPrefix: string): Promise<T[]> {
  const items: T[] = [];
  let start: Record<string, unknown> | undefined;
  do {
    const out = await ddb.send(
      new QueryCommand({
        TableName: tableName(),
        IndexName: index,
        KeyConditionExpression: `${index}PK = :pk AND begins_with(${index}SK, :p)`,
        ExpressionAttributeValues: { ':pk': pk, ':p': skPrefix },
        ScanIndexForward: false,
        ExclusiveStartKey: start,
      }),
    );
    items.push(...((out.Items ?? []) as T[]));
    start = out.LastEvaluatedKey;
  } while (start);
  return items;
}

export function del(key: Key, condition?: { expression: string; values: Record<string, unknown> }): TransactItem {
  return {
    Delete: {
      TableName: tableName(),
      Key: key,
      ...(condition ? { ConditionExpression: condition.expression, ExpressionAttributeValues: condition.values } : {}),
    },
  };
}

/**
 * Runs a transaction and reports *which* condition failed, by item index, so callers can tell
 * "that email is taken" from "that carrier code is taken" without a second read.
 */
export async function transact(items: TransactItem[]): Promise<{ ok: true } | { ok: false; failedIndexes: number[] }> {
  try {
    await ddb.send(new TransactWriteCommand({ TransactItems: items }));
    return { ok: true };
  } catch (error) {
    if (error instanceof TransactionCanceledException) {
      const failedIndexes = (error.CancellationReasons ?? [])
        .map((r, i) => (r.Code === 'ConditionalCheckFailed' ? i : -1))
        .filter((i) => i >= 0);
      if (failedIndexes.length) return { ok: false, failedIndexes };
    }
    throw error;
  }
}

export function put(item: Record<string, unknown>, mustNotExist = false): TransactItem {
  return {
    Put: {
      TableName: tableName(),
      Item: item,
      ...(mustNotExist ? { ConditionExpression: 'attribute_not_exists(PK)' } : {}),
    },
  };
}

export function isConditionFailure(error: unknown): boolean {
  return (error as { name?: string } | null)?.name === 'ConditionalCheckFailedException';
}

/** Atomic counter. ADD never reads first, so two concurrent callers can never get the same number. */
export async function nextSequence(key: Key): Promise<number> {
  const out = await ddb.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: key,
      UpdateExpression: 'ADD #v :one',
      ExpressionAttributeNames: { '#v': 'value' },
      ExpressionAttributeValues: { ':one': 1 },
      ReturnValues: 'UPDATED_NEW',
    }),
  );
  return out.Attributes?.['value'] as number;
}

export { UpdateCommand, ddb, tableName };
