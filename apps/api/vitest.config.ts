import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { conditions: ['development'] },
  test: {
    env: {
      LOG_LEVEL: 'silent',
      DDB_ENDPOINT: process.env['DDB_ENDPOINT'] ?? 'http://localhost:8200',
      AWS_REGION: 'us-east-1',
      AWS_ACCESS_KEY_ID: 'local',
      AWS_SECRET_ACCESS_KEY: 'local',
      JWT_SECRET: 'test-secret-that-is-long-enough-for-hs256-signing',
      // No network in tests: documents go to an in-memory store, locations are not geocoded.
      STORAGE: 'memory',
      GEOCODER: 'none',
    },
    globalSetup: ['./test/global-setup.ts'],
    // One table for the run; files share it and keep apart by using unique carrier codes.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
