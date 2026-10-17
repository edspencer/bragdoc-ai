// `npm run test:e2e`: Playwright against the BUILT server (run `npm run build` first), on a throwaway HOME and
// BRAGDOC_HOME so it never touches a real data home. Feature PRs add specs to e2e/.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

// Set once in the main process; the workers inherit it rather than each making their own.
process.env.BRAGDOC_E2E_HOME ??= fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bragdoc-e2e-')));
const home = process.env.BRAGDOC_E2E_HOME;
const port = Number(process.env.BRAGDOC_E2E_PORT ?? 27240);

export default defineConfig({
  testDir: 'e2e',
  globalTeardown: './e2e/global-teardown.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: { baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node dist/server/cli.js serve --port ${port} --quiet`,
    url: `http://127.0.0.1:${port}/api/health`,
    reuseExistingServer: false,
    timeout: 30_000,
    env: { HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: path.join(home, '.config'), BRAGDOC_HOME: path.join(home, '.bragdoc') },
  },
});
