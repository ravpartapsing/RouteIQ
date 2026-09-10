import { buildApp } from './app.js';

const app = await buildApp();
const port = Number(process.env['API_PORT'] ?? 8180);

await app.listen({ port, host: '0.0.0.0' });
app.log.info(`routeiq api listening on http://localhost:${port}`);
