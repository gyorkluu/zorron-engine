import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import type { InlineConfig } from 'vitest/node';

/**
 * Vite's `UserConfig` does not include the `test` field; Vitest augments it
 * via `declare module 'vite'`. Under pnpm, Vitest's transitive Vite (v5) and
 * the project's Vite (v6) resolve to different copies, so the module
 * augmentation doesn't reach our config file. We declare the merged shape
 * locally and cast the config object so the `test` field is accepted.
 */
type ViteConfigWithTest = UserConfig & { test?: InlineConfig };

// [Vite]: React frontend build tool & dev server
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@zorron/flow-schema': path.resolve(__dirname, '../../packages/flow-schema/src'),
    },
  },
  server: {
    port: 3004,
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3005',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Exclude Playwright E2E specs (they use @playwright/test, not vitest).
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/tests/e2e/**',
      '**/*.spec.ts',
    ],
  },
} as ViteConfigWithTest);
