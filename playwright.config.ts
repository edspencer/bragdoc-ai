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
// The shared server's home has a profile.yaml, so its board is the board (a fresh home's sends you to Welcome, PR16).
// e2e/welcome.spec.ts runs its own servers on fresh homes for the first run.
fs.mkdirSync(path.join(home, '.bragdoc'), { recursive: true });
if (!fs.existsSync(path.join(home, '.bragdoc', 'profile.yaml'))) fs.writeFileSync(path.join(home, '.bragdoc', 'profile.yaml'), 'name: Alex Marlowe\n');

export default defineConfig({
  testDir: 'e2e',
  globalTeardown: './e2e/global-teardown.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: { baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // CI adds Firefox (BRAGDOC_E2E_FIREFOX=1): it follows the Fetch spec's `Origin: null` on same-origin writes under
    // Referrer-Policy: no-referrer, which the security guard has to tell apart from a sandboxed frame (D26). Opt-in, so
    // a checkout without Firefox installed still runs `npm run test:e2e`.
    ...(process.env.BRAGDOC_E2E_FIREFOX ? [{ name: 'firefox', use: { ...devices['Desktop Firefox'] } }] : []),
  ],
  webServer: {
    command: `node dist/server/cli.js serve --port ${port} --quiet`,
    url: `http://127.0.0.1:${port}/api/health`,
    reuseExistingServer: false,
    timeout: 30_000,
    // Playwright passes the rest of process.env through, so clear what would change how the server runs: dev mode
    // (API only, no web app) and the open-bind opt-in.
    env: {
      HOME: home,
      USERPROFILE: home,
      XDG_CONFIG_HOME: path.join(home, '.config'),
      BRAGDOC_HOME: path.join(home, '.bragdoc'),
      BRAGDOC_DEV: '',
      BRAGDOC_DANGEROUSLY_ALLOW_OPEN: '',
      // a fake gh first on PATH (fixtures, never the network or a real login): the GitHub source's specs drive it
      // through $HOME/.fake-gh/scenario. Nor a token from the environment that gh would otherwise pick up.
      PATH: [path.resolve('test/fixtures/fake-gh'), process.env.PATH].join(path.delimiter),
      GH_TOKEN: '',
      GITHUB_TOKEN: '',
    },
  },
});
