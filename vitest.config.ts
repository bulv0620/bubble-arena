import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/tooling/**/*.test.ts', 'apps/web/src/**/*.test.{ts,tsx}', 'packages/*/src/**/*.test.ts'],
    passWithNoTests: false,
    testTimeout: 10_000,
  },
});
