// The Scrapbook shell in a real browser: every page under the production CSP with a clean console and no third-party
// requests, the theme (no flash, persistence, system mode, keyboard), mobile tabs without overflow, and the
// unhappy paths (server not answering, unknown pages and tabs, /dev/kit in a release build).
import { expect, test, type Page } from '@playwright/test';

/** SPEC R3's CSP for the SPA. The server sends it from PR2; until then this spec adds it to every document itself. */
const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";

const PAGES = ['/', '/found', '/projects', '/folio', '/welcome', '/settings/sources', '/settings/ai', '/settings/network', '/settings/data', '/settings/about'];

/** Watch a page: CSP violations, console errors, uncaught errors, and any request that isn't to the app itself. */
async function watch(page: Page, baseURL: string) {
  const problems: string[] = [];
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const res = await route.fetch();
    await route.fulfill({ response: res, headers: { ...res.headers(), 'content-security-policy': CSP } });
  });
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI}`));
  });
  page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
  page.on('pageerror', (e) => problems.push(e.message));
  page.on('request', (r) => {
    if (!r.url().startsWith(baseURL) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) problems.push(`third-party request: ${r.url()}`);
  });
  return problems;
}

test('every page loads under the production CSP, with a clean console and no third-party requests', async ({ page, baseURL }) => {
  const problems = await watch(page, baseURL!);
  for (const p of PAGES) {
    await page.goto(p);
    await expect(page.locator('h1').first()).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
  }
  // and client-side navigation through the header
  await page.goto('/');
  for (const name of ['Found', 'Projects', 'Folio', 'Board']) {
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name, exact: true }).click();
    await expect(page.getByRole('link', { name, exact: true }).first()).toHaveAttribute('aria-current', 'page');
  }
  expect(problems).toEqual([]);
});

test('the fonts are the self-hosted Scrapbook fonts', async ({ page }) => {
  await page.goto('/');
  // load each face explicitly (they're fetched on first use, so `fonts.ready` alone can resolve before them): each
  // must come back with at least one face, from the app's own origin (the CSP and the watch() above ensure the rest)
  const loaded = await page.evaluate(async () =>
    Promise.all(['Instrument Sans Variable', 'Bricolage Grotesque Variable', 'Caveat', 'Geist Mono Variable'].map(async (f) => (await document.fonts.load(`16px "${f}"`)).length > 0)),
  );
  expect(loaded).toEqual([true, true, true, true]);
});

test('dark is applied before the app runs: no flash of the light theme', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bragdoc.theme', 'dark'));
  // Without the app's script at all, only public/theme-init.js can have set the theme.
  await page.route(/\/assets\/.*\.js$/, (route) => route.abort());
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).toBe('rgb(33, 26, 20)');
});

test('the theme toggle switches, is remembered across reloads, and follows the system in system mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const html = page.locator('html');
  const toggle = page.getByRole('radiogroup', { name: 'Theme' }).first();
  await expect(toggle.getByRole('radio', { name: 'Match system' })).toHaveAttribute('aria-checked', 'true');
  await expect(html).not.toHaveClass(/dark/);

  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(html).toHaveClass(/dark/);

  await toggle.getByRole('radio', { name: 'Light' }).click();
  await expect(html).not.toHaveClass(/dark/);
  await page.reload();
  await expect(html).not.toHaveClass(/dark/);
  await expect(page.getByRole('radio', { name: 'Light' }).first()).toHaveAttribute('aria-checked', 'true');

  // arrow keys move through the radio group, as for any radio group
  await page.getByRole('radio', { name: 'Light' }).first().focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Dark' }).first()).toBeFocused();
  await expect(html).toHaveClass(/dark/);
  await page.goto('/projects');
  await expect(html).toHaveClass(/dark/);
});

/**
 * Elements whose right edge is past the viewport, other than inside something that scrolls sideways on purpose (the
 * settings tabs, the Gantt). body has overflow-x: hidden, so scrollWidth alone would hide a clipped element.
 */
const overflowing = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('body *')]
      .filter((el) => {
        if (el.getBoundingClientRect().right <= window.innerWidth + 0.5) return false;
        for (let p = el.parentElement; p; p = p.parentElement) if (['auto', 'scroll'].includes(getComputedStyle(p).overflowX)) return false;
        return true;
      })
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.getAttribute('class') ?? '').slice(0, 50)}`),
  );

test('at 360 and 390 px: bottom tabs instead of the pill nav, and nothing pokes out sideways', async ({ page }) => {
  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 800 });
    for (const p of PAGES) {
      await page.goto(p);
      await expect(page.locator('h1').first()).toBeVisible();
      if (p !== '/welcome') await expect(page.getByTestId('mobile-tabs')).toBeVisible();
      expect(await overflowing(page), `${p} at ${width}px`).toEqual([]);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByTestId('mobile-tabs').getByRole('link', { name: 'Folio' }).click();
  await expect(page.getByTestId('folio-page')).toBeVisible();
});

test('the board says so when the server is not answering', async ({ page }) => {
  await page.route('**/api/achievements*', (route) => route.abort('connectionrefused'));
  await page.goto('/');
  // after the query's own retries (a network error might be a restart), with backoff
  await expect(page.getByTestId('board-error')).toContainText('BragDoc isn’t answering.', { timeout: 15_000 });
});

test('settings: /settings opens Sources, tabs navigate, an unknown tab is not found', async ({ page }) => {
  await page.goto('/settings');
  await expect(page).toHaveURL(/\/settings\/sources$/);
  await page.getByRole('navigation', { name: 'Settings' }).getByRole('link', { name: 'About & verify' }).click();
  await expect(page.getByTestId('settings-about')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Settings' })).toHaveClass(/bg-ink/);
  await page.goto('/settings/bogus');
  await expect(page.getByTestId('not-found')).toBeVisible();
});

test('a release build has no /dev/kit', async ({ page }) => {
  await page.goto('/dev/kit');
  await expect(page.getByTestId('not-found')).toBeVisible();
  await expect(page.getByTestId('kit-page')).toHaveCount(0);
});

test('keyboard: the skip link and the header are reachable, with a visible focus ring', async ({ page }) => {
  await page.goto('/found');
  await expect(page.getByTestId('found-page')).toBeVisible(); // Tab before the app has rendered goes nowhere
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to the page' })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toHaveText('Board');
  expect(await focused.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');
});
