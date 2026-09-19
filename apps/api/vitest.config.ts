import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { conditions: ['development'] },
  test: { env: { LOG_LEVEL: 'silent' } },
});
