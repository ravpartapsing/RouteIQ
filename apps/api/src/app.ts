import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { health } from './routes/health.js';
import { clientConfig } from './routes/client-config.js';

/**
 * The whole API, as a plain Fastify instance.
 *
 * Deliberately knows nothing about Lambda. `lambda.ts` wraps it for API Gateway and `local.ts`
 * listens on a port — so the same build runs on Lambda today and on a box later without a
 * rewrite, and tests can call `app.inject()` with no AWS involved at all.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: process.env['LOG_LEVEL'] ?? 'info' },
    // API Gateway already assigns a request id; reusing it makes a trace followable end to end.
    requestIdHeader: 'x-amzn-trace-id',
    disableRequestLogging: false,
    trustProxy: true,
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: (process.env['CORS_ORIGINS'] ?? 'http://localhost:5173').split(','),
    credentials: true,
  });

  await app.register(health);
  await app.register(clientConfig);

  app.setErrorHandler((error: FastifyError, request, reply) => {
    const status = error.statusCode ?? 500;
    // 5xx means we broke something — log the stack. 4xx is the caller's problem; don't shout.
    if (status >= 500) request.log.error({ err: error }, 'unhandled error');
    reply.status(status).send({
      error: {
        code: error.code ?? 'INTERNAL_ERROR',
        message: status >= 500 ? 'Internal server error' : error.message,
        requestId: request.id,
      },
    });
  });

  return app;
}
