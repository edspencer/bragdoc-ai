// SPEC R3/R4 in a real browser: the shell runs under the production CSP with no violations, never asks anything but
// this server for anything, and the app's own (same-origin) EventSource gets its stream.
import { expect, test } from '@playwright/test';

test('the shell runs under the strict CSP with zero violations and zero non-local requests', async ({ page, baseURL }) => {
  const violations: string[] = [];
  const foreign: string[] = [];
  page.on('console', (m) => /Content Security Policy/i.test(m.text()) && violations.push(m.text()));
  page.on('request', (r) => {
    if (new URL(r.url()).origin !== new URL(baseURL!).origin) foreign.push(r.url());
  });
  const res = await page.goto('/');
  expect(res?.headers()['content-security-policy']).toContain("script-src 'self'");
  await expect(page.getByTestId('placeholder-shell')).toBeVisible();
  await expect(page.getByTestId('server-status')).toHaveText(/Server OK/);
  // anything the CSP blocked is also reported as an event the page can see
  const blocked = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let n = 0;
        // e2e/ is typechecked without the DOM lib: reach the page's document through globalThis
        (globalThis as unknown as { document: EventTarget }).document.addEventListener('securitypolicyviolation', () => n++);
        setTimeout(() => resolve(n), 300);
      }),
  );
  expect(blocked).toBe(0);
  expect(violations).toEqual([]);
  expect(foreign).toEqual([]);
});

test("the app's own EventSource is allowed, and receives hello", async ({ page }) => {
  await page.goto('/');
  const first = await page.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const es = new EventSource('/api/events');
        es.addEventListener('hello', () => {
          es.close();
          resolve('hello');
        });
        es.onerror = () => {
          es.close();
          reject(new Error('EventSource failed'));
        };
      }),
  );
  expect(first).toBe('hello');
});

test('a foreign Host and a cross-site write are refused by the built server', async ({ request }) => {
  expect((await request.get('/api/health', { headers: { host: 'evil.example' } })).status()).toBe(403);
  expect((await request.post('/api/health', { headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, data: '{}' })).status()).toBe(403);
  expect((await request.post('/api/health', { headers: { 'content-type': 'text/plain' }, data: 'x' })).status()).toBe(415);
});
