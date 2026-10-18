// The board in a real browser (PR7): each composer path (type, paste a picture, drop a PDF, paste a PR link, add a
// file of no known type), a spoofed picture refused with a toast, editing in the drawer, archive, and remove with
// Undo. The tests share one data home with the other specs, so each finds its own cards by a title of its own.
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

/**
 * Every browser project, retry and repeat shares the one data home, so each test's titles carry a fresh tag: a card
 * from Chromium's run (or a failed first try) never matches Firefox's.
 */
let RUN = '';
test.beforeEach(() => {
  RUN = Math.random().toString(36).slice(2, 7);
});

/** A real 1×1 PNG. */
const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

/**
 * Paste a file onto the page, as ⌘V with a screenshot on the clipboard does: a paste event carrying the file. Firefox
 * drops the `clipboardData` of a paste event a page makes (only real pastes carry data), and a test can't put a file
 * on its real clipboard, so there the file goes in through "Add a PDF or file" instead: the same upload, minus the
 * paste. Chromium covers the paste path itself.
 */
async function pasteFile(page: Page, file: { name: string; type: string; b64?: string; text?: string }) {
  if (page.context().browser()?.browserType().name() === 'firefox') {
    const buffer = file.b64 ? Buffer.from(file.b64, 'base64') : Buffer.from(file.text ?? '');
    await page.getByTestId('file-input').setInputFiles({ name: file.name, mimeType: file.type || 'application/octet-stream', buffer });
    return;
  }
  await page.evaluate((f) => {
    const bytes = f.b64 ? Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0)) : new TextEncoder().encode(f.text ?? '');
    const d = new DataTransfer();
    d.items.add(new File([bytes], f.name, { type: f.type }));
    document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: d, bubbles: true }));
  }, file);
}

/** Paste text into the composer for real: put it on the clipboard (type it, cut it), then ⌘V/Ctrl+V. */
async function pasteText(page: Page, text: string) {
  const box = page.getByTestId('composer-text');
  const before = await box.inputValue();
  await box.fill(text);
  await box.selectText();
  await page.keyboard.press('ControlOrMeta+X');
  await page.keyboard.press('ControlOrMeta+V');
  // a link is taken as evidence, so the box is back as it was; restore anything that was typed before
  if (before) await box.fill(before);
}

/** Drop a file anywhere on the page. */
async function dropFile(page: Page, name: string, type: string, text: string) {
  const dt = await page.evaluateHandle(
    ([n, t, body]) => {
      const d = new DataTransfer();
      d.items.add(new File([body], n, { type: t }));
      return d;
    },
    [name, type, text] as const,
  );
  await page.dispatchEvent('main', 'dragenter', { dataTransfer: dt });
  await page.dispatchEvent('main', 'dragover', { dataTransfer: dt });
  await page.dispatchEvent('main', 'drop', { dataTransfer: dt });
}

const card = (page: Page, title: string) => page.getByTestId('achievement-card').filter({ has: page.getByRole('heading', { name: title, exact: true }) });

test('an empty composer cannot pin; typed text pins a card titled by its first line', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('pin-it')).toHaveCount(0); // the footer only appears once there's something
  await page.getByTestId('composer-text').fill('   ');
  await expect(page.getByTestId('pin-it')).toBeDisabled();
  await page.getByTestId('composer-text').fill(`E2E ${RUN}: unblocked the release\nIt was stuck on a flaky test.`);
  await page.getByTestId('composer-text').press('Control+Enter');
  await expect(page.getByTestId('toast')).toContainText('Pinned');
  const c = card(page, `E2E ${RUN}: unblocked the release`);
  await expect(c).toBeVisible();
  await expect(c).toContainText('It was stuck on a flaky test.');
  await expect(page.getByTestId('composer-text')).toHaveValue('');
});

test('a pasted picture, a dropped PDF, a pasted PR link and a .key file all land on one card', async ({ page, request }) => {
  const pr = 1000 + Math.floor(Math.random() * 1e6);
  await page.goto('/');
  await expect(page.getByTestId('composer')).toBeVisible();
  await pasteFile(page, { name: 'praise.png', type: 'image/png', b64: PNG_B64 });
  await dropFile(page, 'q3-review.pdf', 'application/pdf', '%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n');
  await pasteText(page, `https://github.com/acme/widgets/pull/${pr}`);
  await pasteFile(page, { name: 'all-hands.key', type: '', b64: btoa('PK\u0003\u0004' + 'x'.repeat(64)) });
  const pending = page.getByTestId('pending');
  await expect(pending).toHaveCount(4);
  await expect(page.locator('[data-testid="pending"][data-status="ready"]')).toHaveCount(4);
  // GitHub isn't connected: the PR is shown as owner/repo#n, and nothing was fetched
  await expect(page.locator('[data-testid="pending"][data-kind="github_pr"]')).toContainText(`acme/widgets#${pr}`);
  await page.getByTestId('composer-text').fill(`E2E ${RUN}: four kinds of evidence`);
  await page.getByTestId('pin-it').click();
  const c = card(page, `E2E ${RUN}: four kinds of evidence`);
  await expect(c).toBeVisible();
  await expect(c.getByRole('button', { name: /Open .* full size/ })).toBeVisible();
  await expect(c.getByRole('link', { name: /q3-review/ })).toHaveAttribute('href', /^\/api\/evidence\/[0-9a-f]{64}$/);
  await expect(c.getByRole('link', { name: new RegExp(`acme/widgets#${pr}`) })).toHaveAttribute('href', `https://github.com/acme/widgets/pull/${pr}`);
  await expect(c).toContainText('all-hands.key');
  // nothing went out (settings.spec.ts's "Test the guard" logs a refused request on this same server: not the board's)
  const net = (await (await request.get('/api/network-log')).json()) as { entries: { purpose: string }[] };
  expect(net.entries.filter((e) => e.purpose !== 'settings.guard-check')).toEqual([]);
});

test('a file that claims to be a picture but is not one is refused with a toast', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('composer')).toBeVisible();
  await pasteFile(page, { name: 'cat.png', type: 'image/png', text: '<!doctype html><script>alert(1)</script>' });
  await expect(page.getByTestId('toast')).toContainText('says it\'s a picture, but it isn\'t one');
  await expect(page.getByTestId('pending')).toHaveCount(0);
});

test('edit in the drawer, archive it, bring it back', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('composer-text').fill(`E2E ${RUN}: to be edited`);
  await page.getByTestId('pin-it').click();
  await card(page, `E2E ${RUN}: to be edited`).getByRole('button', { name: `E2E ${RUN}: to be edited`, exact: true }).click();
  const drawer = page.getByTestId('edit-drawer');
  await expect(drawer).toBeVisible();
  await drawer.getByTestId('edit-title').fill(`E2E ${RUN}: edited`);
  await drawer.getByTestId('edit-summary').fill('Now with a summary.');
  await drawer.getByRole('radio', { name: /^6:/ }).click();
  await drawer.getByTestId('edit-save').click();
  await expect(drawer).toBeHidden();
  const c = card(page, `E2E ${RUN}: edited`);
  await expect(c).toContainText('Now with a summary.');
  await expect(c.getByLabel('Impact 6 out of 10')).toBeVisible();

  await c.getByRole('button', { name: `E2E ${RUN}: edited`, exact: true }).click();
  await drawer.getByTestId('edit-archive').click();
  await expect(card(page, `E2E ${RUN}: edited`)).toHaveCount(0);
  await page.getByTestId('toast').getByRole('button', { name: 'Undo' }).click();
  await expect(card(page, `E2E ${RUN}: edited`)).toBeVisible();
});

test('remove a card, then Undo puts it back', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('composer-text').fill(`E2E ${RUN}: to be removed`);
  await page.getByTestId('pin-it').click();
  const c = card(page, `E2E ${RUN}: to be removed`);
  await c.getByRole('button', { name: `E2E ${RUN}: to be removed`, exact: true }).click();
  await page.getByTestId('edit-remove').click();
  await expect(c).toHaveCount(0);
  await expect(page.getByTestId('toast')).toContainText('Removed');
  await page.getByTestId('toast').getByRole('button', { name: 'Undo' }).click();
  await expect(card(page, `E2E ${RUN}: to be removed`)).toBeVisible();
});

test('search narrows the board; no matches says so', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('composer-text').fill(`E2E ${RUN}: the zeppelin${RUN} migration`);
  await page.getByTestId('pin-it').click();
  await expect(card(page, `E2E ${RUN}: the zeppelin${RUN} migration`)).toBeVisible();
  await page.getByTestId('board-search').fill(`zeppelin${RUN}`);
  await expect(page).toHaveURL(new RegExp(`q=zeppelin${RUN}`));
  await expect(page.getByTestId('achievement-card')).toHaveCount(1);
  await page.getByTestId('board-search').fill('qwertyuiopasdf');
  await expect(page.getByTestId('board-no-results')).toBeVisible();
});

test('a terminal edit of the file updates the open board live; breaking it shows a Problem', async ({ page, request }) => {
  await page.goto('/');
  const res = await request.post('/api/achievements', { data: { title: `E2E ${RUN}: edited by hand` } });
  const { achievement } = await res.json();
  await expect(card(page, `E2E ${RUN}: edited by hand`)).toBeVisible(); // arrived live: this tab didn't add it
  const file = path.join(process.env.BRAGDOC_E2E_HOME!, '.bragdoc', 'achievements', achievement.createdAt.slice(0, 4), achievement.createdAt.slice(5, 7), `${achievement.id}.md`);
  const good = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, good.replace(/^title: .*$/m, `title: "E2E ${RUN}: edited in a terminal"`));
  await expect(card(page, `E2E ${RUN}: edited in a terminal`)).toBeVisible();
  fs.writeFileSync(file, good.replace(/^archived: .*$/m, 'archived: [not a boolean'));
  await expect(page.getByTestId('problems-banner')).toContainText(`${achievement.id}.md`);
  // the card stays, as it last was, marked
  await expect(card(page, `E2E ${RUN}: edited in a terminal`).getByTestId('card-problem')).toBeVisible();
  fs.writeFileSync(file, good);
  await expect(page.getByTestId('problems-banner')).toHaveCount(0);
});

test('pinning something already on the board keeps what you typed, and says so', async ({ page }) => {
  const pr = 1000 + Math.floor(Math.random() * 1e6);
  await page.goto('/');
  await expect(page.getByTestId('composer')).toBeVisible();
  for (const title of [`E2E ${RUN}: first with the PR`, `E2E ${RUN}: second with the PR`]) {
    await pasteText(page, `https://github.com/acme/widgets/pull/${pr}`);
    await expect(page.locator('[data-testid="pending"][data-status="ready"]')).toHaveCount(1);
    await page.getByTestId('composer-text').fill(title);
    await page.getByTestId('pin-it').click();
    await expect(page.getByTestId('toast')).toBeVisible();
  }
  await expect(page.getByTestId('toast')).toContainText(`already on your board, as “E2E ${RUN}: first with the PR”`);
  await expect(page.getByTestId('composer-text')).toHaveValue(`E2E ${RUN}: second with the PR`);
  await expect(page.getByTestId('pending')).toHaveCount(1);
});
