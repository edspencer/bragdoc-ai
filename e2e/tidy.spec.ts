// "Tidy this up" (PR26, SPEC R23, R26) end to end, on a server of its own (turning AI on mustn't leak into the shared
// server's specs) and the fake model server (test/fixtures/fake-llm, loopback only: no step sends anything to a real
// provider). With AI off there's no button at all; on, a paste is tidied, used field by field or all at once, and only
// Pin it or Save changes anything. Cancel, the runner down, the edit drawer's 409 path and AI switched off with the
// suggestion open are covered too.
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { startFakeLlm } from '../test/fixtures/fake-llm/server.ts';

interface Server {
  url: string;
  stop: () => Promise<void>;
}

async function serve(port: number): Promise<Server> {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bragdoc-e2e-tidy-')));
  const data = path.join(home, '.bragdoc');
  fs.mkdirSync(data, { recursive: true });
  fs.writeFileSync(path.join(data, 'profile.yaml'), 'name: Alex Marlowe\nrole: Staff engineer\n');
  const child: ChildProcess = spawn(process.execPath, ['dist/server/cli.js', 'serve', '--port', String(port), '--quiet'], {
    env: { ...process.env, HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: path.join(home, '.config'), BRAGDOC_HOME: data, BRAGDOC_DEV: '', BRAGDOC_DANGEROUSLY_ALLOW_OPEN: '', PORT: '', PATH: path.dirname(process.execPath) },
    stdio: 'ignore',
  });
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${url}/api/health`)).ok) break;
    } catch {
      /* not yet */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return {
    url,
    stop: async () => {
      if (child.exitCode === null) {
        const gone = new Promise((r) => child.once('exit', r));
        child.kill('SIGTERM');
        await gone;
      }
      fs.rmSync(home, { recursive: true, force: true });
    },
  };
}

const watchErrors = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // a refused tidy (a gate, the runner down, Cancel) is a status the browser reports by itself; anything else is a bug
  page.on('console', (m) => m.type() === 'error' && !/status of (4\d\d|5\d\d)/.test(m.text()) && errors.push(m.text()));
  return errors;
};

test.describe.configure({ mode: 'serial' });

let server: Server;
let fake: Awaited<ReturnType<typeof startFakeLlm>>;
let atlas: string;
let achievementId: string;

const api = async (method: string, p: string, body?: unknown, headers: Record<string, string> = {}) => {
  const r = await fetch(`${server.url}${p}`, { method, headers: { 'Content-Type': 'application/json', ...headers }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  return { status: r.status, etag: r.headers.get('etag'), body: (await r.json().catch(() => null)) as any };
};
const scenario = (s: string) => api('PUT', '/api/ai/connections/fake', { baseUrl: s === 'ok' ? fake.url : `${fake.url}/s/${s}` });
const setAi = (enabled: boolean) => api('PUT', '/api/ai', { enabled });

test.beforeAll(async ({}, info) => {
  fake = await startFakeLlm({ scenario: 'ok', slowMs: 5000 });
  server = await serve(27400 + info.workerIndex);
  atlas = (await api('POST', '/api/projects', { name: 'Atlas Migration' })).body.project?.id ?? (await api('GET', '/api/projects')).body.projects[0].id;
  achievementId = (await api('POST', '/api/achievements', { title: 'did the importer', summary: 'imported things', happenedAt: '2026-10-01', source: 'manual' })).body.achievement.id;
  await api('POST', '/api/ai/connections', { id: 'fake', kind: 'ollama', name: 'Fake', baseUrl: fake.url });
  await api('PUT', '/api/ai', { text: { connection: 'fake', model: 'qwen3.5:4b' } });
});
test.afterAll(async () => {
  await server?.stop();
  await fake?.close();
});

const composer = (page: Page) => page.getByTestId('composer-text');

test('AI off, or Tidy off: no Tidy button in the composer or the edit drawer, and no AI request', async ({ page }) => {
  const errors = watchErrors(page);
  const n = fake.requests.length;
  const tidyCalls: string[] = [];
  page.on('request', (r) => r.url().includes('/api/ai/tidy') && tidyCalls.push(r.url()));
  for (const step of ['ai off', 'tidy off'] as const) {
    if (step === 'tidy off') await setAi(true);
    await page.goto(`${server.url}/`);
    await composer(page).fill('Shipped the Atlas Migration cutover yesterday');
    await expect(page.getByTestId('pin-it')).toBeVisible();
    await expect(page.getByTestId('composer-tidy')).toHaveCount(0);
    await expect(page.getByTestId('composer-summary')).toHaveCount(0);
    await expect(page.getByTestId('composer-ended')).toHaveCount(0);
    await page.getByText('did the importer').first().click();
    await expect(page.getByTestId('edit-drawer')).toBeVisible();
    await expect(page.getByTestId('edit-tidy')).toHaveCount(0);
    await expect(page.getByTestId('edit-tidy-area')).toHaveCount(0);
  }
  expect(fake.requests.length).toBe(n);
  expect(tidyCalls).toEqual([]);
  expect(errors).toEqual([]);
  await api('PUT', '/api/ai/features/tidy', { enabled: true });
});

test('paste → Tidy → Use the title only → Pin it: only the title changed, and what you wrote is kept in the notes', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto(`${server.url}/`);
  const text = 'so the atlas migration cutover went out yesterday after two weeks of dry runs. no downtime for anyone';
  await composer(page).fill(text);
  await page.getByTestId('composer-tidy').click();
  const sheet = page.getByTestId('tidy-sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText('qwen3.5:4b on this computer');
  await expect(page.getByTestId('tidy-row-projects')).toContainText('Atlas Migration');
  await page.getByTestId('tidy-use-title').click();
  await expect(page.getByTestId('tidy-used-title')).toBeVisible();
  await expect(page.getByTestId('composer-summary')).toHaveCount(0);
  await page.getByTestId('pin-it').click();
  await expect(page.getByText('Pinned to your board.')).toBeVisible();
  const items = (await api('GET', '/api/achievements?q=dry%20runs')).body.items;
  const a = items.find((x: { body: string }) => x.body.includes('two weeks of dry runs'));
  expect(a.title).toBe('The atlas migration cutover went out yesterday after two weeks of dry runs');
  expect(a.body.trim()).toBe(text);
  expect(a.summary).toBeUndefined();
  expect(a.impact).toBeUndefined();
  expect(a.projects).toEqual([]);
  expect(a.happenedAt).toBe(new Date().toLocaleDateString('en-CA'));
  expect(errors).toEqual([]);
});

test('a second tidy after clearing the composer never replaces the first line you typed', async ({ page }) => {
  await page.goto(`${server.url}/`);
  await composer(page).fill('fixed the flaky checkout tests');
  await page.getByTestId('composer-tidy').click();
  await page.getByTestId('tidy-use-title').click();
  await composer(page).fill('');
  await composer(page).fill('paired with Jo on the pager bot');
  await page.getByTestId('composer-tidy').click();
  await page.getByTestId('tidy-use-title').click();
  await expect(composer(page)).toHaveValue('Paired with Jo on the pager bot\npaired with Jo on the pager bot');
});

test('Use all: title, summary, the date from "yesterday", impact and the project, all yours until you pin', async ({ page }) => {
  await page.goto(`${server.url}/`);
  await composer(page).fill('Shipped the Atlas Migration cutover yesterday. Thanks to the dry runs nobody noticed.');
  await page.getByTestId('composer-tidy').click();
  await page.getByTestId('tidy-use-all').click();
  await expect(page.getByTestId('composer-summary')).toHaveValue(/Shipped the Atlas Migration cutover yesterday/);
  const yesterday = new Date(Date.now() - 86_400_000).toLocaleDateString('en-CA');
  await expect(page.getByTestId('composer-date')).toHaveValue(yesterday);
  await page.getByTestId('pin-it').click();
  await expect(page.getByText('Pinned to your board.')).toBeVisible();
  const a = (await api('GET', '/api/achievements?q=nobody%20noticed')).body.items[0];
  expect([a.happenedAt, a.impact, a.impactSource, a.projects]).toEqual([yesterday, 3, 'user', [atlas]]);
  expect(a.summary).toMatch(/^Shipped the Atlas Migration cutover yesterday/);
});

test('an invented number is underlined "not in your text"; a calendar invite fills nothing', async ({ page }) => {
  await page.goto(`${server.url}/`);
  await composer(page).fill('I cut costs on the build farm by moving nightly jobs to spot runners');
  await page.getByTestId('composer-tidy').click();
  await expect(page.getByTestId('tidy-ungrounded')).toHaveText(/40%/);
  await expect(page.getByTestId('tidy-flag-legend')).toBeVisible();
  await page.getByTestId('tidy-close').click();
  await composer(page).fill("Invitation: Q4 planning\nYou've been invited to a meeting on Thursday");
  await page.getByTestId('composer-tidy').click();
  await expect(page.getByTestId('tidy-not-achievement')).toContainText('calendar invite');
  await expect(page.getByTestId('tidy-use-all')).toHaveCount(0);
  await expect(page.locator('[data-testid^=tidy-use-]')).toHaveCount(0);
});

test('Cancel while it thinks: nothing changes; the runner down: the reason in words, your text untouched', async ({ page }) => {
  await scenario('slow');
  await page.goto(`${server.url}/`);
  const text = 'Paired with Jo on the flaky deploy pipeline';
  await composer(page).fill(text);
  await page.getByTestId('composer-tidy').click();
  await expect(page.getByTestId('tidy-thinking')).toContainText('tidying with qwen3.5:4b on this computer');
  await page.getByTestId('tidy-cancel').click();
  await expect(page.getByTestId('tidy-thinking')).toHaveCount(0);
  await expect(page.getByTestId('tidy-sheet')).toHaveCount(0);
  await expect(composer(page)).toHaveValue(text);
  await expect.poll(async () => (await api('GET', '/api/ai/activity?limit=1')).body.entries[0]?.outcome).toBe('cancelled');

  await scenario('down');
  await page.getByTestId('composer-tidy').click();
  await expect(page.getByTestId('tidy-error')).toContainText("isn't answering");
  await expect(composer(page)).toHaveValue(text);
  await scenario('ok');
});

test('the edit drawer: Tidy → Use all → Save; and a change on disk meanwhile is still a 409 to resolve', async ({ page }) => {
  await page.goto(`${server.url}/`);
  await page.getByText('did the importer').first().click();
  await page.getByTestId('edit-tidy').click();
  await page.getByTestId('tidy-use-all').click();
  await expect(page.getByTestId('edit-title')).toHaveValue('Did the importer');
  await page.getByTestId('edit-save').click();
  await expect(page.getByTestId('edit-drawer')).toHaveCount(0);
  expect((await api('GET', `/api/achievements/${achievementId}`)).body.title).toBe('Did the importer');

  // the 409 path: open, tidy, then someone else saves first
  await page.getByText('Did the importer').first().click();
  await page.getByTestId('edit-tidy').click();
  await page.getByTestId('tidy-use-summary').click();
  const cur = await api('GET', `/api/achievements/${achievementId}`);
  expect((await api('PATCH', `/api/achievements/${achievementId}`, { title: 'Changed elsewhere' }, { 'If-Match': cur.body.etag })).status).toBe(200);
  await page.getByTestId('edit-save').click();
  await expect(page.getByTestId('edit-conflict')).toBeVisible();
  expect((await api('GET', `/api/achievements/${achievementId}`)).body.title).toBe('Changed elsewhere');
});

test('AI switched off with the suggestion open: it stays readable, every Use goes inert with the reason', async ({ page }) => {
  await page.goto(`${server.url}/`);
  await composer(page).fill('Fixed the flaky checkout tests');
  await page.getByTestId('composer-tidy').click();
  await expect(page.getByTestId('tidy-sheet')).toBeVisible();
  await setAi(false);
  await expect(page.getByTestId('tidy-inert')).toContainText('switched off');
  await expect(page.getByTestId('tidy-use-title')).toBeDisabled();
  await expect(page.getByTestId('composer-tidy')).toHaveCount(0);
  await expect(composer(page)).toHaveValue('Fixed the flaky checkout tests');
  await setAi(true);
});
