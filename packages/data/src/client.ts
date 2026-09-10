import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * One client per Lambda container, created at module load so it is reused across invocations —
 * a fresh client per request pays TLS handshake and credential resolution every time.
 *
 * `DDB_ENDPOINT` is set only for local DynamoDB. Deployed, it is absent and the SDK resolves
 * the region and the execution role itself, so no credentials are ever in config.
 */
const endpoint = process.env['DDB_ENDPOINT'];

export const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    ...(endpoint ? { endpoint } : {}),
    region: process.env['AWS_REGION'] ?? 'us-east-1',
    maxAttempts: 4,
  }),
  {
    marshallOptions: {
      // A TMS is full of optional fields; writing them as NULL rather than omitting them makes
      // every `attribute_not_exists` condition subtly wrong.
      removeUndefinedValues: true,
      convertClassInstanceToMap: false,
    },
    unmarshallOptions: { wrapNumbers: false },
  },
);

export function tableName(): string {
  const name = process.env['TABLE_NAME'];
  if (!name) throw new Error('TABLE_NAME is not set');
  return name;
}

/** Seconds-since-epoch for the `ttl` attribute. DynamoDB ignores millisecond values. */
export function ttlInDays(days: number, from: Date = new Date()): number {
  return Math.floor(from.getTime() / 1000) + days * 86_400;
}
