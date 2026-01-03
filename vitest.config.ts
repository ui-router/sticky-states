import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*Spec.ts', 'test/**/*.{test,spec}.{js,ts}'],
    testTimeout: 1000,
  },
});
