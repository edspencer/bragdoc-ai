// Found (PR13) against the built server: candidates written into found/ by hand (as a source or an agent would leave
// them) show up live with their rule chips; Keep, Merge into… and Dismiss each work with Undo; the filter row and the
// nav badge follow. And the GitHub card's unhappy path through the fake gh (test/fixtures/fake-gh, first on the
// server's PATH): logged out → a plain message, nothing switched on.
//
// It never connects GitHub for real: a check adds repos to repos/, and projects.spec.ts owns the catalog (it expects
// none while it runs alongside). Connecting, checking, dedup and every failure are test/github-source.test.ts's.
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

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
  await expect(page.getByText(/confidence|% a win/i)).toHaveCount(0); // no AI (D8)

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
