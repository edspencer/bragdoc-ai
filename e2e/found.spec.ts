// Found (PR13) against the built server: candidates written into found/ by hand (as a source or an agent would leave
// them) show up live with their rule chips; Keep, Merge into… and Dismiss each work with Undo; the filter row and the
// nav badge follow. And the GitHub card's unhappy path through the fake gh (test/fixtures/fake-gh, first on the
// server's PATH): logged out → a plain message, nothing switched on. And the screenshots folder (PR15), here rather than
// in a spec of its own so its candidates can't land while the badge test above counts: choose a folder in Settings, drop
// a praise screenshot and a plain one in, and the praise appears in Found by itself (real OCR), with its picture.
//
// It never connects GitHub for real: a check adds repos to repos/, and projects.spec.ts owns the catalog (it expects
// none while it runs alongside). Connecting, checking, dedup and every failure are test/github-source.test.ts's.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { chat, png } from '../test/screenshots.ts';

test.describe.configure({ mode: 'serial' });
test.skip(({ browserName }) => browserName !== 'chromium', 'runs once: the data home is shared');

const E2E_HOME = process.env.BRAGDOC_E2E_HOME!;
const HOME = path.join(E2E_HOME, '.bragdoc');
/**
 * Per run (CI retries once, on the same data home): titles, keys and ids that a first attempt's leftovers can't match.
 * Ids are ULIDs: a made-up prefix and the run in Crockford base32 digits.
 */
const RUN = Date.now().toString(32).toUpperCase().replace(/[ILOU]/g, 'X').padStart(10, '0').slice(-10);
const IDS = [1, 2, 3].map((n) => `01JAFND${RUN}00000000${n}`);
const MARK = `e2e-found-${RUN.toLowerCase()}`;

function candidate(id: string, n: number, source: 'github' | 'mcp' = 'github'): string {
  const repo = `e2e-found-org/${MARK}`;
  return [
    'schemaVersion: 1',
    `id: ${id}`,
    'status: pending',
    `source: ${source}`,
    ...(source === 'mcp' ? ['sourceAgent: Claude Code'] : [`externalKey: "github_pr:${repo}#${n}"`]),
    `title: "${MARK} candidate ${n}"`,
    'happenedAt: 2026-10-14',
    `foundAt: 2026-10-17T12:00:0${n}.000Z`,
    ...(source === 'github'
      ? ['evidence:', `  - id: ${id.slice(0, -2)}E${n}`, '    kind: github_pr', `    url: https://github.com/${repo}/pull/${n}`, `    externalKey: "github_pr:${repo}#${n}"`, `    title: "${MARK} candidate ${n}"`]
      : []),
    'matchedRules: [You opened it, Merged]',
    '',
  ].join('\n');
}

const card = (page: Page, n: number) => page.getByTestId('found-card').filter({ hasText: `${MARK} candidate ${n}` });

test.beforeAll(() => {
  fs.mkdirSync(path.join(HOME, 'found'), { recursive: true });
  IDS.forEach((id, i) => fs.writeFileSync(path.join(HOME, 'found', `${id}.yaml`), candidate(id, i + 1, i === 2 ? 'mcp' : 'github')));
});
let targetId: string | undefined;
test.afterAll(async ({ request }) => {
  if (targetId) await request.post(`/api/achievements/${targetId}/remove`, { data: {} });
  for (const id of IDS) fs.rmSync(path.join(HOME, 'found', `${id}.yaml`), { force: true });
  fs.rmSync(path.join(E2E_HOME, '.fake-gh'), { recursive: true, force: true });
});

test('candidates show with their rules; keep, merge and dismiss each undo; the badge follows', async ({ page, request }) => {
  const target = await (await request.post('/api/achievements', { data: { title: `${MARK} merge target`, happenedAt: '2026-10-10' } })).json();
  targetId = target.achievement.id;
  await page.goto('/found');
  await expect(card(page, 1)).toBeVisible({ timeout: 10_000 });
  await expect(card(page, 1).getByTestId('found-rules')).toContainText('You opened it');
  await expect(card(page, 1)).toContainText('From GitHub');
  await expect(card(page, 3)).toContainText('Written by Claude Code');
  await expect(page.getByText(/confidence|% a win/i)).toHaveCount(0); // no confidence while AI is off (D8, SPEC R26)

  const count = async () => (await (await request.get('/api/found/count')).json()).pending as number;
  const badge = page.getByRole('navigation').first().getByText(/^\d+\+?$/);
  const before = await count();

  // the filter row: Agents shows only the agent's
  await page.getByTestId('found-filters').getByRole('button', { name: /Agents/ }).click();
  await expect(card(page, 3)).toBeVisible();
  await expect(card(page, 1)).toHaveCount(0);
  await page.getByTestId('found-filters').getByRole('button', { name: /Everything/ }).click();

  // keep → on the board; undo → back
  await card(page, 1).getByTestId('found-keep').click();
  await expect(page.getByTestId('toast')).toContainText(`Kept: “${MARK} candidate 1”`);
  await expect(card(page, 1)).toHaveCount(0);
  await expect.poll(count).toBe(before - 1);
  await expect(badge).toHaveText(String(before - 1));
  await page.getByTestId('toast').getByRole('button', { name: 'Undo' }).click();
  await expect(card(page, 1)).toBeVisible();

  // merge into… : search, no results, then the target
  await card(page, 2).getByTestId('found-merge').click();
  await page.getByTestId('merge-search').fill('zz-no-such-thing-zz');
  await expect(page.getByTestId('merge-empty')).toContainText('Nothing on your board matches that.');
  await page.getByTestId('merge-search').fill(`${MARK} merge target`);
  await page.getByTestId('merge-option').filter({ hasText: `${MARK} merge target` }).click();
  await expect(page.getByTestId('toast')).toContainText(`Added to “${MARK} merge target”`);
  await expect.poll(async () => (await (await request.get(`/api/achievements/${target.achievement.id}`)).json()).evidence.length).toBe(1);

  // dismiss → only a hash is left on disk; undo brings it all back
  await card(page, 1).getByTestId('found-dismiss').click();
  await expect(page.getByTestId('toast')).toContainText('won’t come back');
  await expect.poll(() => fs.readFileSync(path.join(HOME, 'found', `${IDS[0]}.yaml`), 'utf8')).toMatch(/keyHashes/);
  expect(fs.readFileSync(path.join(HOME, 'found', `${IDS[0]}.yaml`), 'utf8')).not.toContain(MARK);
  await page.getByTestId('toast').getByRole('button', { name: 'Undo' }).click();
  await expect(card(page, 1)).toBeVisible();
});

test('GitHub card: connecting while gh is logged out says so, and switches nothing on', async ({ page, request }) => {
  fs.mkdirSync(path.join(E2E_HOME, '.fake-gh'), { recursive: true });
  fs.writeFileSync(path.join(E2E_HOME, '.fake-gh', 'scenario'), 'logged-out');
  await page.goto('/settings/sources');
  await expect(page.getByTestId('github-status')).toContainText('Off');
  await page.getByTestId('github-start').click();
  await expect(page.getByTestId('github-mode-gh')).toContainText('Found gh on this computer');
  await page.getByTestId('github-scope').fill('');
  await page.getByTestId('github-connect-go').click();
  await expect(page.getByTestId('github-error')).toContainText('gh auth login');
  const s = await (await request.get('/api/sources')).json();
  expect(s.github.enabled).toBe(false);
  const log = (await (await request.get('/api/network-log?limit=50')).json()).entries as { path: string; outcome: string }[];
  expect(log.some((e) => e.path === 'gh auth status' && e.outcome === 'error')).toBe(true);
});

test('screenshots folder: choose it, a praise screenshot reaches Found by itself, a plain one is only counted', async ({ page, request }) => {
  test.setTimeout(90_000); // real OCR (tesseract.js) on the server
  const folder = path.join(E2E_HOME, `Shots-${RUN}`);
  fs.mkdirSync(folder, { recursive: true });
  // the rules look for this name: put it in place for the test, and put back whatever was there after
  const profile = path.join(HOME, 'profile.yaml');
  const hadProfile = fs.existsSync(profile) ? fs.readFileSync(profile) : null;
  fs.writeFileSync(profile, 'name: Alex Marlowe\naliases: [Alex, AM]\n');
  let keptId: string | undefined;
  try {
    await page.goto('/settings/sources');
    const cardEl = page.getByTestId('source-screenshots');
    await expect(cardEl.getByTestId('screenshots-status')).toContainText('Off');
    // the counts are kept across runs (a retry, a reused home): look at what this run adds
    const counts = async () => (await (await request.get('/api/sources')).json()).screenshots.counts as { looked: number; sent: number };
    const before = await counts();
    await cardEl.getByRole('switch').click();
    await cardEl.getByTestId('screenshots-other').fill(folder);
    await cardEl.getByTestId('screenshots-save').click();
    await expect(cardEl.getByTestId('screenshots-status')).toContainText('On: watching');

    // the run in the words, so a retry's pictures are new ones
    const praise = png(chat({ title: '# eng-billing', messages: [{ author: 'Dana Whitfield', time: '4:52 PM', text: `Huge shoutout to @Alex Marlowe for the billing cutover, run ${RUN}. Thank you, this was a scary one.` }] }).svg);
    const plain = png(chat({ title: '# eng', messages: [{ author: 'Sam Okafor', time: '9:02 AM', text: `Reminder: the deploy freeze starts Friday at noon (run ${RUN}).` }] }).svg);
    fs.writeFileSync(path.join(folder, 'Screenshot 2026-10-17 at 9.41.03\u202fPM.png'), praise);
    fs.writeFileSync(path.join(folder, 'Screenshot 2026-10-17 at 9.42.03\u202fPM.png'), plain);

    await expect.poll(counts, { timeout: 60_000 }).toEqual({ ...before, looked: before.looked + 2, sent: before.sent + 1 });
    await expect(cardEl.getByTestId('screenshots-counts')).toContainText(`${before.looked + 2} looked at · ${before.sent + 1} sent to Found`);
    await page.goto('/found');
    const key = `screenshot:${createHash('sha256').update(praise).digest('hex')}`;
    const shotCard = page.locator(`[data-key="${key}"]`);
    await expect(shotCard).toBeVisible();
    await expect(shotCard).toContainText('Spotted on your desktop');
    await expect(shotCard.getByTestId('found-quote')).toContainText('shoutout');
    await expect(shotCard.getByTestId('found-rules')).toContainText('Says your name');
    await expect.poll(() => shotCard.locator('img').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBeGreaterThan(0);

    const kept = page.waitForResponse((r) => r.url().endsWith('/keep') && r.request().method() === 'POST');
    await shotCard.getByTestId('found-keep').click();
    keptId = ((await (await kept).json()) as { achievementId: string }).achievementId;
    await expect(page.getByTestId('toast')).toContainText('Kept:');
    // copied into evidence/: the achievement carries the picture and the quote
    const a = await (await request.get(`/api/achievements/${keptId}`)).json();
    expect(a.externalKey).toBe(key);
    expect(a.evidence.map((e: { kind: string }) => e.kind).sort()).toEqual(['image', 'quote']);
  } finally {
    await request.put('/api/sources/screenshots', { data: { enabled: false } });
    if (keptId) await request.post(`/api/achievements/${keptId}/remove`, { data: {} });
    if (hadProfile) fs.writeFileSync(profile, hadProfile);
    else fs.rmSync(profile, { force: true });
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
