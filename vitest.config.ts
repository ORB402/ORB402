import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/types/**', 'src/index.ts'],
    },
  },
  resolve: {
    alias: {
      '@orb402': path.resolve(__dirname, 'src'),
    },
  },
});
