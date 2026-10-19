// The judge's card and Found's verdict UI (SPEC R21, R22, PR25), end to end, on a server of its own (AI on in the shared
// e2e home would change what every other spec sees) and the fake model server: never a real model. Switching the judge
// on gives Judge now and nothing in the background; Found's three groups and their order; Dismiss these N and its
// Undo; the editor saves ai/what-counts.md and Judge again changes the verdict's inputHash; the agreement count; and
// "as they arrive" twice over, with Probably not never emptied by itself.
import { spawn, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { startFakeLlm } from '../test/fixtures/fake-llm/server.ts';

test.describe.configure({ mode: 'serial' });
test.skip(({ browserName }) => browserName !== 'chromium', 'runs once: it has its own server');

const WIN = 'Amazing work Alex, p95 is down 40% since the batching went out.';
const SARCASM = 'Love that Alex scheduled the quick sync for 90 minutes. Very efficient.';
const CHATTER = "I'm OOO tomorrow, Alex is covering on-call.";

let url = '';
let home = '';
let data = '';
let child: ChildProcess | null = null;
let fake: Awaited<ReturnType<typeof startFakeLlm>> | null = null;
let n = 0;

const api = async (method: string, p: string, body?: unknown) => {
  const res = await fetch(url + p, { method, headers: { 'Content-Type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  return { status: res.status, body: await res.json().catch(() => null) };
};

/** A screenshot candidate as the folder would leave it, whose picture has since gone (the judge reads its quote). */
function candidate(quote: string, title = quote): string {
  const id = `01JAJDGE0E2E${String(++n).padStart(13, '0')}A`.slice(0, 26);
  const sha = createHash('sha256').update(`e2e ${n} ${quote}`).digest('hex');
  fs.writeFileSync(
    path.join(data, 'found', `${id}.yaml`),
    [
      'schemaVersion: 1',
      `id: ${id}`,
      'status: pending',
      'source: screenshots',
      `externalKey: "screenshot:${sha}"`,
      `title: ${JSON.stringify(title)}`,
      'happenedAt: 2026-10-14',
      `foundAt: 2026-10-17T12:00:${String(n).padStart(2, '0')}.000Z`,
      'evidence:',
      `  - id: ${id.slice(0, -1)}Q`,
      '    kind: quote',
      '    quote:',
      `      text: ${JSON.stringify(quote)}`,
      '      from: Jordan Kim',
      '      where: "#payments"',
      'matchedRules: ["Says your name: \\"Alex\\""]',
      '',
    ].join('\n'),
  );
  return id;
}

const judgeRuns = () => {
  const f = path.join(data, 'logs', 'ai-runs.jsonl');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((e) => e.feature === 'judge') : [];
};

const idle = async () => {
  for (let i = 0; i < 200; i++) {
    if (!(await api('GET', '/api/ai/judge/status')).body.running) return;
    await new Promise((r) => setTimeout(r, 100));
  }
};

const noErrors = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/status of 409/.test(m.text()) && errors.push(m.text()));
  return errors;
};

test.beforeAll(async ({}, info) => {
  fake = await startFakeLlm();
  home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bragdoc-e2e-judgeui-')));
  data = path.join(home, '.bragdoc');
  fs.mkdirSync(path.join(data, 'found'), { recursive: true });
  fs.writeFileSync(path.join(data, 'profile.yaml'), 'name: Alex Marlowe\naliases: [Alex, AM]\nnotMe: [Alex P]\n');
  candidate(WIN, 'Praise for the batching');
  candidate(SARCASM, 'The quick sync');
  candidate(CHATTER, 'Covering on-call');
  candidate('Huge thanks to Alex for the ledger fix, saved us 6 hours.', 'The ledger fix');
  // the power reading: a fixture that says plugged in, so "only on power" never holds a run here
  const power = path.join(home, 'power', 'AC');
  fs.mkdirSync(power, { recursive: true });
  fs.writeFileSync(path.join(power, 'type'), 'Mains\n');
  fs.writeFileSync(path.join(power, 'online'), '1\n');
  const port = 27430 + info.workerIndex;
  url = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ['dist/server/cli.js', 'serve', '--port', String(port), '--quiet'], {
    env: { ...process.env, HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: path.join(home, '.config'), BRAGDOC_HOME: data, BRAGDOC_DEV: '', BRAGDOC_DANGEROUSLY_ALLOW_OPEN: '', PORT: '', BRAGDOC_POWER_SUPPLY_DIR: path.join(home, 'power') },
    stdio: 'ignore',
  });
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${url}/api/health`)).ok) break;
    } catch {
      /* not yet */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  // AI on with a local connection to the fake (what Settings → AI does); the judge itself is switched on in the UI
  expect((await api('POST', '/api/ai/connections', { id: 'fake', kind: 'ollama', baseUrl: fake.url })).status).toBe(201);
  expect((await api('PUT', '/api/ai', { enabled: true, text: { connection: 'fake', model: 'qwen3.5:4b' } })).status).toBe(200);
});

test.afterAll(async () => {
  if (child && child.exitCode === null) {
    const gone = new Promise((r) => child!.once('exit', r));
    child.kill('SIGTERM');
    await gone;
  }
  await fake?.close();
  if (home) fs.rmSync(home, { recursive: true, force: true });
});

test('switching the judge on gives Judge now only: the second question, and nothing runs in the background', async ({ page }) => {
  const errors = noErrors(page);
  await page.goto(url + '/settings/ai');
  const card = page.getByTestId('ai-feature-judge');
  await card.getByTestId('ai-judge-switch').getByRole('switch').click();
  await expect(card.getByTestId('ai-judge-state')).toHaveText('on');
  await expect(card.getByTestId('ai-judge-second-question')).toContainText('Also judge new candidates as they arrive?');
  await card.getByTestId('ai-judge-arrival-no').click();
  await expect(card.getByTestId('ai-judge-second-question')).toHaveCount(0);
  await expect(card.getByTestId('ai-judge-schedule')).toHaveText('It runs only when you press Judge now.');
  await expect(card.getByTestId('ai-judge-on-arrival')).not.toBeChecked();
  // the starter instructions were written; nothing was judged
  expect(fs.readFileSync(path.join(data, 'ai', 'what-counts.md'), 'utf8')).toContain('Alex Marlowe');
  await page.waitForTimeout(1500);
  expect(judgeRuns()).toEqual([]);
  expect(fake!.requests.filter((r) => r.path.endsWith('/api/chat'))).toHaveLength(0);
  expect((await api('GET', '/api/ai/judge/status')).body.waiting).toBe(4);
  expect(errors).toEqual([]);
});

test('Judge now, then Found\'s groups: wins first, Probably not collapsed with its count; Dismiss these N and Undo', async ({ page }) => {
  const errors = noErrors(page);
  await page.goto(url + '/found');
  await expect(page.getByTestId('found-list')).not.toHaveAttribute('data-grouped', 'true'); // no verdict yet: v0.1's list
  await page.getByTestId('judge-now').click();
  await expect(page.getByTestId('found-group-no-count')).toHaveText('2', { timeout: 30_000 });
  const sections = await page.locator('[data-testid^="found-group-"][aria-label]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  expect(sections).toEqual(['Looks like a win', 'Probably not']);
  await expect(page.getByTestId('found-group-wins').getByTestId('found-card')).toHaveCount(2);
  // collapsed: its cards aren't shown until you open it
  await expect(page.getByTestId('found-group-no').getByTestId('found-card')).toHaveCount(0);
  await page.getByTestId('found-group-no-toggle').click();
  await expect(page.getByTestId('found-group-no').getByTestId('found-card')).toHaveCount(2);
  await expect(page.getByTestId('found-group-no').getByTestId('found-verdict-stamp').first()).toContainText('Probably not');

  await page.getByTestId('found-dismiss-these').click();
  await expect(page.getByTestId('found-group-no')).toHaveCount(0);
  await expect(page.getByText('Dismissed 2. They won’t come back.')).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByTestId('found-group-no-count')).toHaveText('2');
  const found = (await api('GET', '/api/found')).body.items as { status: string; verdict?: { keep: boolean } }[];
  expect(found.filter((c) => c.verdict && !c.verdict.keep)).toHaveLength(2); // back, verdicts and all
  expect(errors).toEqual([]);
});

test('the editor saves ai/what-counts.md; Judge again on a card changes its inputHash', async ({ page }) => {
  const errors = noErrors(page);
  const before = ((await api('GET', '/api/found')).body.items as { title: string; verdict?: { inputHash?: string } }[]).find((c) => c.title === 'Praise for the batching')!.verdict!.inputHash;
  await page.goto(url + '/settings/ai');
  const box = page.getByTestId('ai-judge-what-counts-text');
  await box.fill((await box.inputValue()) + '\n- Count mentoring as a win.\n');
  await page.getByTestId('ai-judge-what-counts-save').click();
  await expect(page.getByText('Saved to ai/what-counts.md.')).toBeVisible();
  expect(fs.readFileSync(path.join(data, 'ai', 'what-counts.md'), 'utf8')).toContain('Count mentoring as a win.');

  await page.goto(url + '/found');
  const card = page.getByTestId('found-card').filter({ hasText: 'Praise for the batching' });
  await card.getByTestId('found-judge-again').click();
  await expect
    .poll(async () => ((await api('GET', '/api/found')).body.items as { title: string; verdict?: { inputHash?: string } }[]).find((c) => c.title === 'Praise for the batching')!.verdict!.inputHash)
    .not.toBe(before);
  // What's sent: the prompt, with the new instructions, and no path
  await card.getByTestId('found-judge-preview').click();
  await expect(page.getByTestId('judge-preview-text')).toContainText('Count mentoring as a win.');
  await expect(page.getByTestId('judge-preview-text')).not.toContainText(home);
  expect(errors).toEqual([]);
});

test('agreement: a keep and a dismiss of judged candidates', async ({ page }) => {
  const errors = noErrors(page);
  await page.goto(url + '/found');
  await page.getByTestId('found-card').filter({ hasText: 'The ledger fix' }).getByTestId('found-keep').click(); // a win, kept: agrees
  await expect(page.getByText(/Kept:/)).toBeVisible();
  await page.getByTestId('found-card').filter({ hasText: 'Praise for the batching' }).getByTestId('found-dismiss').click(); // a win, dismissed: doesn't
  await expect(page.getByText('Dismissed. It won’t come back.')).toBeVisible();
  await page.goto(url + '/settings/ai');
  await expect(page.getByTestId('ai-judge-agreement')).toHaveText('You agreed with the judge on 1 of 2.');
  expect(errors).toEqual([]);
});

test('as they arrive: two runs later, Probably not is still all there (nothing is dismissed by itself)', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = noErrors(page);
  await page.goto(url + '/settings/ai');
  await page.getByTestId('ai-judge-on-arrival').check();
  await expect(page.getByTestId('ai-judge-schedule')).toContainText('It judges as new candidates arrive');
  for (const q of ['Wow, great job everyone, especially Alex for the 3rd rollback today.', 'Thanks so much Alex for unblocking the release!']) {
    const runs = judgeRuns().length;
    candidate(q);
    await expect.poll(() => judgeRuns().length, { timeout: 60_000, intervals: [1000] }).toBe(runs + 1);
    await idle();
  }
  expect(judgeRuns().slice(-2).map((r) => r.trigger)).toEqual(['arrival', 'arrival']);
  const items = (await api('GET', '/api/found')).body.items as { status: string; verdict?: { keep: boolean } }[];
  expect(items.every((c) => c.status === 'pending')).toBe(true);
  await page.goto(url + '/found');
  await expect(page.getByTestId('found-group-no-count')).toHaveText(String(items.filter((c) => c.verdict && !c.verdict.keep).length));
  expect(items.filter((c) => c.verdict && !c.verdict.keep).length).toBeGreaterThanOrEqual(2);
  expect(errors).toEqual([]);
});
