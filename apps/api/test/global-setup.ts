import { CreateTableCommand, DeleteTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { createTableInput } from '@routeiq/data';

/** A throwaway table per test run, so tests never see local dev data and never leave any behind. */
export default async function setup({ provide }: { provide: (k: string, v: string) => void }) {
  const table = `routeiq-test-${Date.now()}`;
  const client = new DynamoDBClient({
    endpoint: process.env['DDB_ENDPOINT'] ?? 'http://localhost:8200',
    region: 'us-east-1',
    credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
  });
  await client.send(new CreateTableCommand(createTableInput(table)));
  process.env['TABLE_NAME'] = table;
  provide('tableName', table);
  return async () => {
    await client.send(new DeleteTableCommand({ TableName: table }));
  };
}

declare module 'vitest' {
  export interface ProvidedContext {
    tableName: string;
  }
}
