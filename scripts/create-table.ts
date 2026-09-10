/**
 * Creates the local DynamoDB table from the same definition Terraform deploys.
 * Idempotent: re-running after a `docker compose up` is a no-op, not an error.
 */
import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  ResourceNotFoundException,
  UpdateTimeToLiveCommand,
} from '@aws-sdk/client-dynamodb';
import { createTableInput, TABLE_DEFINITION } from '../packages/data/src/table-definition.js';

const table = process.env['TABLE_NAME'] ?? 'routeiq-local';
const client = new DynamoDBClient({
  endpoint: process.env['DDB_ENDPOINT'] ?? 'http://localhost:8200',
  region: process.env['AWS_REGION'] ?? 'us-east-1',
  credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
});

async function exists(): Promise<boolean> {
  try {
    await client.send(new DescribeTableCommand({ TableName: table }));
    return true;
  } catch (error) {
    if (error instanceof ResourceNotFoundException) return false;
    throw error;
  }
}

if (await exists()) {
  console.log(`table ${table} already exists — nothing to do`);
} else {
  await client.send(new CreateTableCommand(createTableInput(table)));
  await client.send(
    new UpdateTimeToLiveCommand({
      TableName: table,
      TimeToLiveSpecification: { Enabled: true, AttributeName: TABLE_DEFINITION.ttlAttribute },
    }),
  );
  const gsiNames = TABLE_DEFINITION.globalSecondaryIndexes.map((g) => g.name).join(', ');
  console.log(`created ${table} with ${gsiNames} and ttl on "${TABLE_DEFINITION.ttlAttribute}"`);
}
