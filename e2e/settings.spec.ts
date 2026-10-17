// Settings in a real browser (SPEC R13): Network activity's empty state and a refused request arriving live, a
// hand-broken file appearing on the Problems list live and leaving when fixed, the MCP token (show, rotate) and
// writeTo, About's "unofficial build" with no "Verified" anywhere, and each tab's error state when the API fails.
// Serial: the first test needs the network log still empty, and the rest add to the shared data home.
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const HOME = path.join(process.env.BRAGDOC_E2E_HOME!, '.bragdoc');

test('Network activity: the empty receipt, then a refused request shows up live, in red', async ({ page }) => {
  await page.goto('/settings/network');
  await expect(page.getByTestId('network-empty')).toContainText('Nothing has left this computer.');
  await expect(page.getByTestId('network-makers')).toContainText('0 B');
  await expect(page.getByTestId('allowlist')).toContainText('this computer');
  await page.getByTestId('guard-check-run').click();
  await expect(page.getByTestId('guard-check-ok')).toBeVisible();
  const line = page.getByTestId('network-line').first();
  await expect(line).toHaveAttribute('data-outcome', 'denied');
  await expect(line).toContainText('REFUSED · NOT SENT');
  await expect(page.getByTestId('network-empty')).toHaveCount(0);

  // another tab's guard check arrives over the event stream, without a reload
  await page.request.post('/api/network-log/guard-check', { data: {} });
  await expect(page.getByTestId('network-line')).toHaveCount(2);
});

test('Data: a hand-broken file appears on the Problems list live, and goes when it is fixed', async ({ page }) => {
  await page.goto('/settings/data');
  await expect(page.getByTestId('problems-empty')).toBeVisible();
  await expect(page.getByTestId('data-dir')).toHaveText(/\.bragdoc$/);
  await expect(page.getByTestId('slot-import')).toBeVisible();
  const file = path.join(HOME, 'projects', '01JABCDEFGHJKMNPQRSTVWXYZ0.yaml');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, 'schemaVersion: 1\nid: 01JABCDEFGHJKMNPQRSTVWXYZ0\nname: [unclosed\n');
  try {
    const problem = page.getByTestId('problem');
    await expect(problem).toHaveCount(1, { timeout: 10_000 });
    await expect(problem).toContainText('projects/01JABCDEFGHJKMNPQRSTVWXYZ0.yaml');
    await expect(problem).toHaveAttribute('data-severity', 'error');
    fs.writeFileSync(file, 'schemaVersion: 1\nid: 01JABCDEFGHJKMNPQRSTVWXYZ0\nname: Fixed\ncolor: "#3b6cf6"\nstart: 2026-01-01\n');
    await expect(page.getByTestId('problems-empty')).toBeVisible({ timeout: 10_000 });
  } finally {
    fs.rmSync(file, { force: true });
  }
});

test('Sources: the MCP token shows, copies and rotates; writeTo saves to config.yaml', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/settings/sources');
  await expect(page.getByTestId('source-github')).toContainText('Off');
  await expect(page.getByTestId('mcp-url')).toHaveText(/\/mcp$/);
  const token = page.getByTestId('mcp-token');
  await expect(token).toHaveText(/^•+$/);
  await page.getByRole('button', { name: 'Show' }).click();
  const before = (await token.textContent())!;
  expect(before).not.toMatch(/•/);
  await page.getByTestId('copy-mcp-token').click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(before);

  await page.getByTestId('rotate-token').click();
  await page.getByTestId('rotate-confirm-yes').click();
  await expect(token).not.toHaveText(before);
  const runtime = JSON.parse(fs.readFileSync(path.join(HOME, 'runtime.json'), 'utf8')) as { mcpToken: string };
  await expect(token).toHaveText(runtime.mcpToken);

  await page.getByLabel(/Into Found/).check();
  await expect.poll(() => fs.readFileSync(path.join(HOME, 'config.yaml'), 'utf8')).toMatch(/writeTo: found/);
  await page.reload();
  await expect(page.getByLabel(/Into Found/)).toBeChecked();
  await page.getByLabel(/Straight onto your board/).check();
  await expect.poll(() => fs.readFileSync(path.join(HOME, 'config.yaml'), 'utf8')).toMatch(/writeTo: board/);
});

test('About: this build says what it is, "unofficial build", and never "verified"', async ({ page }) => {
  await page.goto('/settings/about');
  await expect(page.getByTestId('build-stamp')).toHaveText(/Unofficial build/i);
  await expect(page.getByTestId('cmd-audit')).toContainText('npm audit signatures');
  await expect(page.getByTestId('cmd-integrity')).toContainText(/npm view @bragdoc\/local@\S+ dist\.integrity/);
  await expect(page.getByTestId('cmd-image')).toContainText('gh attestation verify oci://ghcr.io/edspencer/bragdoc:');
  for (const tab of ['sources', 'network', 'data', 'about']) {
    await page.goto(`/settings/${tab}`);
    await expect(page.locator('h2').first()).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/verified/i);
  }
});

test('About: no build information at all is said plainly', async ({ page }) => {
  await page.route('**/api/meta', async (route) => {
    const res = await route.fetch();
    await route.fulfill({ response: res, json: { ...(await res.json()), build: null } });
  });
  await page.goto('/settings/about');
  await expect(page.getByTestId('build-none')).toBeVisible();
  await expect(page.getByTestId('build-stamp')).toHaveText(/Unofficial build/i);
});

test('every tab has an error state when the API fails', async ({ page }) => {
  await page.route(/\/api\/(meta|network-log|problems|backups|settings|mcp\/token)(\?.*)?$/, (route) =>
    route.fulfill({ status: 500, json: { error: { code: 'internal', message: 'Something broke on the server.' } } }),
  );
  await page.goto('/settings/network');
  await expect(page.getByTestId('network-error')).toContainText('Something broke on the server.');
  await expect(page.getByTestId('allowlist-error')).toBeVisible();
  await page.goto('/settings/data');
  await expect(page.getByTestId('load-error')).toHaveCount(3); // the folder, Problems, backups
  await page.goto('/settings/sources');
  await expect(page.getByTestId('load-error').first()).toBeVisible();
  await page.goto('/settings/about');
  await expect(page.getByTestId('load-error')).toContainText('Something broke on the server.');
});
