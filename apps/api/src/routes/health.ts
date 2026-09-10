import type { FastifyInstance } from 'fastify';
import { DescribeTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { tableName } from '@routeiq/data';

/**
 * `/health` is liveness only — it must never touch a dependency, or a DynamoDB blip takes the
 * Lambda out of rotation. `/health/ready` is the one that actually proves the table is reachable.
 */
export async function health(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({
    status: 'ok',
    stage: process.env['STAGE'] ?? 'local',
    time: new Date().toISOString(),
  }));

  app.get('/health/ready', async (request, reply) => {
    const endpoint = process.env['DDB_ENDPOINT'];
    const client = new DynamoDBClient({
      ...(endpoint ? { endpoint } : {}),
      region: process.env['AWS_REGION'] ?? 'us-east-1',
    });
    try {
      const table = tableName();
      const described = await client.send(new DescribeTableCommand({ TableName: table }));
      return {
        status: 'ready',
        table,
        tableStatus: described.Table?.TableStatus,
        indexes: described.Table?.GlobalSecondaryIndexes?.map((i) => i.IndexName) ?? [],
      };
    } catch (error) {
      request.log.error({ err: error }, 'readiness check failed');
      return reply.status(503).send({ status: 'not-ready', reason: (error as Error).message });
    }
  });
}
