import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke tests against the production build: `npm run build`, then
 * `npm run test:e2e` (starts `next start` on port 3000 unless one is running).
 */
const PORT = Number(process.env.PORT ?? 3000);

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/about`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
