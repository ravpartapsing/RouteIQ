// Bundles the API into one file for the nodejs22.x runtime. The AWS SDK v3 ships with the
// runtime, so it is left out — the zip stays small and cold starts stay short.
import { build } from 'esbuild';
import { rmSync, writeFileSync } from 'node:fs';

rmSync('dist-lambda', { recursive: true, force: true });
await build({
  entryPoints: ['src/lambda.ts'],
  outfile: 'dist-lambda/index.js',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  minify: true,
  sourcemap: 'inline',
  conditions: ['development'],
  external: ['@aws-sdk/*'],
  logLevel: 'info',
});

// The workspace package is "type": "module"; without this the runtime would parse the CJS bundle
// as ESM depending on where it sits.
writeFileSync('dist-lambda/package.json', '{"type":"commonjs"}\n');
