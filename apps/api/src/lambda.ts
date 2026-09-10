import awsLambdaFastify from '@fastify/aws-lambda';
import { buildApp } from './app.js';

/**
 * Built once per container, reused across invocations. Building Fastify inside the handler would
 * re-register every plugin on every request.
 */
const ready = buildApp().then((app) => awsLambdaFastify(app, { serializeLambdaArguments: false }));

export const handler = async (event: unknown, context: unknown) => {
  const proxy = await ready;
  return proxy(event as never, context as never);
};
