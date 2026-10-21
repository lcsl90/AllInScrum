import { defineConfig, devices } from '@playwright/test';

/** E2E-Tests laufen gegen den Produktions-Build – so, wie ihn auch der Container ausliefert. */
const PORT = Number(process.env['E2E_PORT'] ?? 4310);
const CI = Boolean(process.env['CI']);

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  reporter: CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm start',
    url: `http://127.0.0.1:${PORT}/healthz`,
    env: { PORT: String(PORT), HOST: '127.0.0.1' },
    reuseExistingServer: !CI,
    timeout: 180_000,
  },
});
