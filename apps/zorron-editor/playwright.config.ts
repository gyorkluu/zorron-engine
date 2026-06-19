import { defineConfig, devices } from '@playwright/test';

/**
 * [Playwright]: E2E test configuration for the Zorron Engine.
 *
 * Tests assume the backend is reachable at http://localhost:3000 and the
 * editor dev server at http://localhost:5173. Both can be started via
 * `pnpm dev:server` and `pnpm dev:editor` from the repo root.
 *
 * The backend API tests use the Elysia `app.handle()` path indirectly via
 * real HTTP when the server is running. For CI we recommend starting both
 * services before invoking `pnpm test:e2e`.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  timeout: 30_000,
  expect: { timeout: 7_000 },

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
