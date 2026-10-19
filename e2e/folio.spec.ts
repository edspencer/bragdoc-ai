// Folio in a real browser (PR14): a window from the URL, unticking (kept across a reload), the filters, the markdown
// preview, Export (the downloaded file's content), Copy, and an empty window. The data home is shared with the other
// specs, so each browser works in a year of its own that nothing else writes to, and makes no projects or companies:
// projects.spec.ts clears the catalog when it starts and expects to own it. Project filters are test/folio.test.ts's.
import fs from 'node:fs';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

let YEAR = 0;
let from = '';
let to = '';
const ids: Record<string, string> = {};

async function post<T>(request: APIRequestContext, path: string, data: unknown): Promise<T> {
  const r = await request.post(path, { data });
  expect(r.ok(), `${path}: ${await r.text()}`).toBe(true);
  return (await r.json()) as T;
}

/** The copy of a control that's on screen (the actions are drawn twice: above the list on phones, beside it on desktop). */
const shown = (page: Page, id: string) => page.getByTestId(id).filter({ visible: true });

test.beforeAll(async ({ request, browserName }) => {
  YEAR = { chromium: 2011, firefox: 2012, webkit: 2013 }[browserName] ?? 2014;
  from = `${YEAR}-01-01`;
  to = `${YEAR}-12-31`;
  // a retry starts again from the top: last time's achievements in this year go first
  const old = (await (await request.get(`/api/folio?from=${from}&to=${to}`)).json()) as { items: { id: string }[] };
  for (const a of old.items) await request.post(`/api/achievements/${a.id}/remove`, { data: {} });
  const add = async (key: string, body: Record<string, unknown>) => (ids[key] = (await post<{ achievement: { id: string } }>(request, '/api/achievements', body)).achievement.id);
  await add('best', {
    title: `Offline sync shipped ${YEAR}`,
    summary: 'Zero conflicts over a weekend.',
    happenedAt: `${YEAR}-09-13`,
    impact: 8,
    projects: [],
    evidence: [
      // a PR of this browser's own: adding one already on the board (another browser's) returns that achievement instead
      { kind: 'github_pr', url: `https://github.com/example/app/pull/${YEAR}`, externalKey: `github_pr:example/app#${YEAR}`, title: 'CRDT merge' },
      { kind: 'url', url: 'http://localhost:2724/preview', title: 'Local preview' },
      { kind: 'quote', quote: { text: 'Not one conflict.', from: 'Sam', where: '#eng' } },
    ],
  });
  await add('mid', { title: `Audit export ${YEAR}`, happenedAt: `${YEAR}-08-02`, impact: 5, projects: [] });
  await add('none', { title: `Welcome talk ${YEAR}`, happenedAt: `${YEAR}-03-03`, projects: [] });
  await add('long', { title: `${'A very long title that keeps on going '.repeat(8)}${YEAR}`, happenedAt: `${YEAR}-02-02`, impact: 2, projects: [] });
  const archived = await add('archived', { title: `Archived ${YEAR}`, happenedAt: `${YEAR}-05-05`, impact: 9 });
  expect((await request.post(`/api/achievements/${archived}/archive`, { data: {} })).ok()).toBe(true);
});

test('the window from the URL; untick one, and a reload keeps it out', async ({ page }) => {
  await page.goto(`/folio?from=${from}&to=${to}`);
  await expect(page.getByTestId('folio-count')).toHaveText('4 of 4 picked'); // the archived one isn't offered
  await expect(page.getByTestId('folio-clip').first()).toContainText(`Offline sync shipped ${YEAR}`); // best first
  await page.getByTestId('folio-clip').filter({ hasText: `Welcome talk ${YEAR}` }).click();
  await expect(page.getByTestId('folio-count')).toHaveText('3 of 4 picked');
  await expect(page).toHaveURL(new RegExp(`out=${ids.none}`));
  await page.reload();
  await expect(page.getByTestId('folio-count')).toHaveText('3 of 4 picked');
  await expect(page.getByTestId('folio-clip').filter({ hasText: `Welcome talk ${YEAR}` })).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByTestId('folio-sheet')).not.toContainText(`Welcome talk ${YEAR}`);
  await expect(page.getByTestId('folio-sheet')).toContainText(`Offline sync shipped ${YEAR}`);
});

test('the sheet is tilted only on wider screens: on a phone a long one would poke out sideways (PR30)', async ({ page }) => {
  // a tilted sheet's corner sticks out by about half its height × sin(0.4°): 3 px past a 390 px screen on a year's folio
  const tilt = () => page.getByTestId('folio-sheet').evaluate((el) => getComputedStyle(el).rotate);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/folio?from=${from}&to=${to}`);
  await expect(page.getByTestId('folio-sheet')).toContainText(`Offline sync shipped ${YEAR}`);
  expect(await tilt()).toBe('none');
  await page.setViewportSize({ width: 1440, height: 900 });
  expect(await tilt()).not.toBe('none');
});

test('Export downloads bragdoc-<from>-<to>.md with links kept and nothing local in it', async ({ page }) => {
  await page.goto(`/folio?from=${from}&to=${to}&out=${ids.none}`);
  await expect(page.getByTestId('folio-count')).toHaveText('3 of 4 picked');
  const [download] = await Promise.all([page.waitForEvent('download'), shown(page, 'folio-export').click()]);
  expect(download.suggestedFilename()).toBe(`bragdoc-${from}-${to}.md`);
  const md = fs.readFileSync((await download.path())!, 'utf8');
  expect(md).toContain('## No project');
  expect(md).toContain(`- **Offline sync shipped ${YEAR}** · 13 Sep ${YEAR} · impact 8/10`);
  expect(md).toContain(`[example/app#${YEAR}: CRDT merge](https://github.com/example/app/pull/${YEAR})`);
  expect(md).toContain('  > Not one conflict.');
  expect(md).toContain('Local preview (a local address, left out)');
  expect(md).not.toContain(`Welcome talk ${YEAR}`);
  expect(md).not.toContain(`Archived ${YEAR}`);
  expect(md).not.toMatch(/localhost|127\.0\.0\.1|\/api\/|01[0-9A-HJKMNP-TV-Z]{24}/);
});

test('filters and grouping: minimum impact, by month, and the markdown preview follows', async ({ page }) => {
  await page.goto(`/folio?from=${from}&to=${to}&min=5`);
  await expect(page.getByTestId('folio-count')).toHaveText('2 of 2 picked');
  await expect(page.getByTestId('folio-min-impact-label')).toContainText('impact 5');
  await page.getByRole('button', { name: 'Month', exact: true }).click();
  await expect(page).toHaveURL(/group=month/);
  await expect(page.getByTestId('folio-sheet-section')).toHaveCount(2); // September, August
  await page.getByRole('button', { name: 'Markdown', exact: true }).click();
  await expect(page.getByTestId('folio-markdown')).toContainText('_Impact 5 and up_');
  await expect(page.getByTestId('folio-markdown')).toContainText(`## September ${YEAR}`);
  await expect(page.getByTestId('folio-markdown')).not.toContainText(`Welcome talk ${YEAR}`); // unrated: left out
  await page.reload();
  await expect(page.getByTestId('folio-markdown')).toContainText(`## August ${YEAR}`);
});

test('Copy puts the same markdown on the clipboard', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'reading the clipboard back needs Chromium permissions');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(`/folio?from=${from}&to=${to}&view=md`);
  await expect(page.getByTestId('folio-count')).toHaveText('4 of 4 picked');
  await shown(page, 'folio-copy').click();
  await expect(shown(page, 'folio-copy')).toHaveText(/Copied/);
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(await page.getByTestId('folio-markdown').textContent());
});

test('an empty window says so, and nothing can be exported', async ({ page }) => {
  await page.goto(`/folio?from=${YEAR - 10}-01-01&to=${YEAR - 10}-12-31`);
  await expect(page.getByTestId('folio-empty')).toContainText('Nothing between');
  await expect(shown(page, 'folio-export')).toBeDisabled();
  await expect(shown(page, 'folio-copy')).toBeDisabled();
  await page.getByRole('button', { name: 'Last year', exact: true }).click();
  await expect(page).not.toHaveURL(new RegExp(`from=${YEAR - 10}`));
});
