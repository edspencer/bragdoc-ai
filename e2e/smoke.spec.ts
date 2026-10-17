// The built server, end to end in a real browser: the shell loads and talks to the API, client routes survive a
// reload, and missing files 404.
import { expect, test } from '@playwright/test';

test('the shell loads and reaches the server', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/');
  await expect(page).toHaveTitle('BragDoc');
  await expect(page.getByTestId('placeholder-shell')).toBeVisible();
  await expect(page.getByTestId('server-status')).toHaveText(/Server OK, version \d+\.\d+\.\d+/);
  expect(errors).toEqual([]);
});

test('a deep link gets the shell, which shows its not-found page', async ({ page }) => {
  const res = await page.goto('/deep/route');
  expect(res?.status()).toBe(200);
  await expect(page.getByTestId('not-found')).toBeVisible();
  await page.getByRole('link', { name: 'Back to the board' }).click();
  await expect(page.getByTestId('placeholder-shell')).toBeVisible();
});

test('missing files and API paths are 404s, not the shell', async ({ request }) => {
  expect((await request.get('/nope.js')).status()).toBe(404);
  const api = await request.get('/api/nope');
  expect(api.status()).toBe(404);
  expect((await api.json()).error.code).toBe('not_found');
  const health = await request.get('/api/health');
  expect(health.status()).toBe(200);
  expect(await health.json()).toMatchObject({ ok: true });
});
