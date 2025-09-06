import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
  },
  define: {
    'process.env': 'process.env',
  },
  resolve: {
    alias: {
      '@': '/Users/ellie/Desktop/blociq-frontend',
    },
  },
});
