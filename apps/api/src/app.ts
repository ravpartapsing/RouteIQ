import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { ApiError } from './lib/errors.js';
import { authPlugin } from './plugins/auth.js';
import { health } from './routes/health.js';
import { clientConfig } from './routes/client-config.js';
import { authRoutes } from './routes/auth.js';
import { meRoutes } from './routes/me.js';
import { tenantRoutes } from './routes/tenant.js';
import { userRoutes } from './routes/users.js';
import { driverRoutes } from './routes/drivers.js';

/**
 * The whole API, as a plain Fastify instance.
 *
 * Deliberately knows nothing about Lambda. `lambda.ts` wraps it for API Gateway and `local.ts`
 * listens on a port — so the same build runs on Lambda today and on a box later without a
 * rewrite, and tests can call `app.inject()` with no AWS involved at all.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: process.env['LOG_LEVEL'] ?? 'info', redact: ['req.headers.authorization'] },
    // API Gateway already assigns a request id; reusing it makes a trace followable end to end.
    requestIdHeader: 'x-amzn-trace-id',
    trustProxy: true,
    bodyLimit: 1024 * 1024,
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: (process.env['CORS_ORIGINS'] ?? 'http://localhost:5173').split(','),
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['content-type', 'authorization'],
  });
  await app.register(authPlugin);

  // Set before any route plugin registers: each encapsulated plugin captures the handler that
  // exists when it is created.
  app.setErrorHandler((error: FastifyError | ApiError, request, reply) => {
    if (error instanceof ApiError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          requestId: request.id,
          ...(error.fields ? { fields: error.fields } : {}),
        },
      });
    }
    const status = error.statusCode ?? 500;
    // 5xx means we broke something — log the stack. 4xx is the caller's problem; don't shout.
    if (status >= 500) request.log.error({ err: error }, 'unhandled error');
    return reply.status(status).send({
      error: {
        code: status >= 500 ? 'INTERNAL_ERROR' : (error.code ?? 'BAD_REQUEST'),
        message: status >= 500 ? 'Internal server error' : error.message,
        requestId: request.id,
      },
    });
  });

  await app.register(health);
  await app.register(clientConfig);
  await app.register(authRoutes);
  await app.register(meRoutes);
  await app.register(tenantRoutes);
  await app.register(userRoutes);
  await app.register(driverRoutes);

  return app;
}
