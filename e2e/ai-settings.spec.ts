// Settings → AI (PR23, SPEC R17, R18, R26) end to end, on a server of its own (turning AI on mustn't leak into the
// shared server's other specs) and the fake model server (test/fixtures/fake-llm, loopback only). No step sends anything
// to a real provider host: the cloud connection here is driven as far as Allow and Revoke, and checked through
// GET /api/ai and an empty network log (SPEC R28). Detection's "found" states and the hardware readings are staged by
// answering those two requests in the browser; "none running" is real.
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { startFakeLlm } from '../test/fixtures/fake-llm/server.ts';

interface Server {
  url: string;
  data: string;
  stop: () => Promise<void>;
}

async function serve(port: number): Promise<Server> {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bragdoc-e2e-ai-')));
  const data = path.join(home, '.bragdoc');
  fs.mkdirSync(data, { recursive: true });
  fs.writeFileSync(path.join(data, 'profile.yaml'), 'name: Alex Marlowe\n');
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
    data,
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
  // a refused test or a gate is a 4xx the browser reports by itself; anything else is a bug
  page.on('console', (m) => m.type() === 'error' && !/status of 4\d\d/.test(m.text()) && errors.push(m.text()));
  return errors;
};

const aiLines = async (page: Page, server: Server) => {
  const r = await page.request.get(`${server.url}/api/network-log?limit=500`);
  return ((await r.json()).entries as { feature?: string; where?: string; host: string; via: string; outcome: string }[]).filter((e) => e.feature);
};

test.describe.configure({ mode: 'serial' });

let server: Server;
let fake: Awaited<ReturnType<typeof startFakeLlm>>;
test.beforeAll(async ({}, info) => {
  server = await serve(27350 + info.workerIndex);
  fake = await startFakeLlm({ pullStepMs: 120 });
});
test.afterAll(async () => {
  await server?.stop();
  await fake?.close();
});

test('AI off: only the tab says anything about AI; no chip, nothing contacted', async ({ page }) => {
  const errors = watchErrors(page);
  for (const p of ['/', '/found', '/projects', '/folio', '/settings/network']) {
    await page.goto(server.url + p);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.getByTestId('ai-chip')).toHaveCount(0);
  }
  await expect(page.getByTestId('network-ai-sentence')).toHaveText('AI is off, so no model is contacted.');
  await expect(page.getByTestId('network-ai-internet')).toHaveCount(0);
  await page.goto(server.url + '/settings/ai');
  await expect(page.getByTestId('ai-master-sentence')).toHaveText('AI is off. Nothing is sent to any model.');
  await expect(page.getByTestId('ai-off')).toBeVisible();
  // nothing that could contact a runner is offered while it's off
  await expect(page.getByTestId('ai-detect')).toHaveCount(0);
  await expect(page.getByTestId('ai-connections')).toHaveCount(0);
  expect(await aiLines(page, server)).toEqual([]);
  expect(errors).toEqual([]);
});

test('local: turn AI on, add the fake Ollama, test it, pick a model: the header chip says this computer', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto(server.url + '/settings/ai');
  await page.getByRole('switch', { name: 'AI' }).click();
  await expect(page.getByTestId('ai-master-sentence')).toHaveText('AI is on. No feature is on until you switch it on below.');
  await expect(page.getByTestId('ai-chip')).toHaveText(/AI · no model yet/);
  for (const f of ['judge', 'tidy', 'draft']) await expect(page.getByTestId(`ai-feature-${f}`)).toContainText('off');
  await expect(page.getByTestId('ai-activity-empty')).toHaveText(/Nothing has asked a model anything/);

  await page.getByTestId('ai-add-ollama').click();
  await page.getByTestId('ai-add-url').fill(fake.url);
  await expect(page.getByTestId('ai-add-where')).toHaveAttribute('data-class', 'this-computer');
  await page.getByTestId('ai-add-save').click();
  const card = page.getByTestId('ai-connection-ollama');
  await expect(card.getByTestId('ai-connection-class')).toHaveText('this computer');
  await expect(card.getByTestId('ai-connection-models')).toContainText('2 models');
  await expect(card.getByTestId('ai-connection-model')).toHaveValue('qwen3.5:4b');
  await card.getByTestId('ai-connection-test-go').click();
  await expect(card.getByTestId('ai-connection-outcome')).toHaveAttribute('data-ok', 'true');
  await expect(card.getByTestId('ai-connection-outcome')).toContainText('Structured answers: yes');
  await expect(page.getByTestId('ai-activity-line').filter({ hasText: 'Test connection' }).first()).toBeVisible();
  await card.getByTestId('ai-connection-use').click();
  await expect(page.getByTestId('ai-chip')).toHaveText(/AI · this computer/);
  await expect(page.getByTestId('ai-text-slot-model')).toHaveText('qwen3.5:4b');
  const lines = await aiLines(page, server);
  expect(lines.length).toBeGreaterThan(0);
  expect(lines.every((l) => l.where === 'this-computer')).toBe(true);
  expect(errors).toEqual([]);
});

test('the runner stops: Test says it isn’t answering, in words', async ({ page }) => {
  await page.goto(server.url + '/settings/ai');
  const card = page.getByTestId('ai-connection-ollama');
  await card.getByTestId('ai-connection-url').fill(`${fake.url}/s/down`);
  await card.getByTestId('ai-connection-url-save').click();
  await expect(card.getByTestId('ai-connection-url-save')).toHaveCount(0);
  await card.getByTestId('ai-connection-test-go').click();
  await expect(card.getByTestId('ai-connection-outcome')).toContainText('The runner isn’t answering');
  // a typo and plain http to the internet are refused with their reasons
  await card.getByTestId('ai-connection-url').fill('htp//127.0.0.1:11434');
  await card.getByTestId('ai-connection-url-save').click();
  await expect(card.getByTestId('ai-connection-url-error')).toContainText(/isn.t a web address/);
  await card.getByTestId('ai-connection-url').fill('http://203.0.113.5:11434');
  await card.getByTestId('ai-connection-url-save').click();
  await expect(card.getByTestId('ai-connection-url-error')).toContainText('only https leaves this computer');
  await card.getByTestId('ai-connection-url').fill(fake.url);
  await card.getByTestId('ai-connection-url-save').click();
  await expect(card.getByTestId('ai-connection-url-save')).toHaveCount(0);
});

test('cloud: a custom https server is internet; consent comes first and nothing is sent before Allow; Revoke takes it off', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto(server.url + '/settings/ai');
  await page.getByTestId('ai-add-openai-compatible').click();
  await page.getByTestId('ai-add-url').fill('https://llm.example.com/v1');
  await expect(page.getByTestId('ai-add-where')).toHaveAttribute('data-class', 'internet');
  await page.getByTestId('ai-add-save').click();
  const consent = page.locator('dialog[open][data-testid=ai-consent]');
  await expect(consent).toBeVisible();
  await expect(consent.getByTestId('ai-consent-host')).toHaveText('llm.example.com');
  await expect(consent.getByTestId('ai-consent-unknown')).toBeVisible();
  for (const f of ['judge', 'tidy', 'draft', 'test']) await expect(consent.getByTestId(`ai-consent-sends-${f}`)).toBeVisible();
  expect((await aiLines(page, server)).filter((l) => l.host.includes('example.com'))).toEqual([]);
  let s = await (await page.request.get(`${server.url}/api/ai`)).json();
  expect(s.egressHosts).not.toContain('llm.example.com');

  await consent.getByTestId('ai-consent-allow').click();
  await expect(consent).toHaveCount(0);
  // allowed: "What it sends" is a reminder, with no Allow
  await page.getByTestId('ai-connection-what').click();
  await expect(consent.getByTestId('ai-consent-allow')).toHaveCount(0);
  await consent.getByTestId('ai-consent-close').click();
  s = await (await page.request.get(`${server.url}/api/ai`)).json();
  expect(s.egressHosts).toContain('llm.example.com');
  const card = page.getByTestId('ai-connection-openai-compatible');
  await expect(card).toHaveAttribute('data-class', 'internet');

  // a key: masked, never in the page once saved
  const key = 'sk-test-0123456789-abcd';
  await card.getByTestId('ai-connection-key-input').fill(key);
  await card.getByTestId('ai-connection-key-save').click();
  await expect(card.getByTestId('ai-connection-key-hint')).toHaveText('…abcd');
  expect(await page.content()).not.toContain(key);
  // an over-long paste is caught before it's sent
  await card.getByTestId('ai-connection-key-forget').click();
  await card.getByTestId('ai-connection-key-input').fill('x'.repeat(600));
  await expect(card.getByTestId('ai-connection-key-long')).toBeVisible();
  await expect(card.getByTestId('ai-connection-key-save')).toBeDisabled();

  await card.getByTestId('ai-connection-revoke').click();
  await expect(card.getByTestId('ai-connection-allow')).toBeVisible();
  s = await (await page.request.get(`${server.url}/api/ai`)).json();
  expect(s.egressHosts).not.toContain('llm.example.com');
  expect((await aiLines(page, server)).filter((l) => l.host.includes('example.com'))).toEqual([]);
  await card.getByTestId('ai-connection-remove').click();
  await card.getByTestId('ai-connection-remove-yes').click();
  await expect(card).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('detection: none running → BragDoc doesn’t install runners; a runner with 0 models; one with 2 → Use it', async ({ page }) => {
  await page.goto(server.url + '/settings/ai');
  await page.getByTestId('ai-detect-go').click();
  await expect(page.getByTestId('ai-detect-none')).toContainText('BragDoc doesn’t install model runners');
  await expect(page.getByTestId('ai-detect-ollama-link')).toHaveAttribute('href', 'https://ollama.com');
  const detectLines = (await aiLines(page, server)).filter((l) => l.feature === 'detect');
  expect(detectLines.length).toBeGreaterThanOrEqual(3);
  expect(detectLines.every((l) => l.where === 'this-computer')).toBe(true);

  // staged: what the server would answer with a runner on its usual port
  const runner = (models: string[], connectionId: string | null = null) => ({ at: new Date().toISOString(), ollamaOnPath: true, inDocker: false, runners: [{ kind: 'lmstudio', baseUrl: `${fake.url}/v1`, where: 'this-computer', version: null, models: models.map((name) => ({ name, sizeBytes: null })), connectionId }] });
  await page.route('**/api/ai/detect', (r) => (r.request().method() === 'POST' ? r.fulfill({ json: runner([]) }) : r.continue()));
  await page.getByTestId('ai-detect-go').click();
  await expect(page.getByTestId('ai-detect-models')).toContainText('No models installed yet');
  await page.unroute('**/api/ai/detect');
  // the server's answer once it's a connection: GET works out connectionId against the connections as they are
  await page.route('**/api/ai/detect', (r) => r.fulfill({ json: r.request().method() === 'POST' ? runner(['qwen3.5:4b', 'gemma4:e4b']) : runner(['qwen3.5:4b', 'gemma4:e4b'], 'lmstudio') }));
  await page.getByTestId('ai-detect-go').click();
  await expect(page.getByTestId('ai-detect-models')).toContainText('2 models installed');
  await page.getByTestId('ai-detect-use').click();
  await expect(page.getByTestId('ai-connection-lmstudio')).toBeVisible();
  await expect(page.getByTestId('ai-detect-runner-lmstudio')).toContainText('Added, as lmstudio');
  await expect(page.getByTestId('ai-detect-use')).toHaveCount(0);
  await page.unroute('**/api/ai/detect');
  await page.getByTestId('ai-connection-lmstudio').getByTestId('ai-connection-remove').click();
  await page.getByTestId('ai-connection-lmstudio').getByTestId('ai-connection-remove-yes').click();
});

test('hardware: 6 GB → no local recommendation; 16 GB → gemma4:e4b (staged readings)', async ({ page }) => {
  const staged = (gb: number) => (r: import('@playwright/test').Route) =>
    r.fulfill({ json: { ramBytes: gb * 1024 ** 3, cpu: 'Test CPU', cores: 8, arch: 'x64', appleSilicon: false, freeDiskBytes: 40e9, inDocker: false, recommended: gb >= 16 ? 'gemma4:e4b' : gb >= 8 ? 'qwen3.5:4b' : null, speedNote: 'Roughly 15–20 s per item without a GPU: fine in the background.', modelsAsOf: '2026-10-18' } });
  await page.route('**/api/ai/hardware', staged(6));
  await page.goto(server.url + '/settings/ai');
  await expect(page.getByTestId('ai-recommendation')).toContainText('A local model will struggle');
  await page.unroute('**/api/ai/hardware');
  await page.route('**/api/ai/hardware', staged(16));
  await page.reload();
  await expect(page.getByTestId('ai-recommendation')).toContainText('start with gemma4:e4b');
  await expect(page.getByTestId('ai-model-gemma4:e4b')).toContainText('for this computer');
  await expect(page.getByTestId('ai-model-qwen3.5:4b').getByText('ollama pull qwen3.5:4b')).toHaveCount(0); // installed on the fake
});

test('download: nothing without the confirm; Cancel stops the fake’s stream; both log lines appear', async ({ page }) => {
  await page.goto(server.url + '/settings/ai');
  const card = page.getByTestId('ai-connection-ollama');
  await card.getByTestId('ai-connection-url').fill(`${fake.url}/s/no-models`);
  await card.getByTestId('ai-connection-url-save').click();
  const row = page.getByTestId('ai-model-qwen3.5:4b');
  await expect(row.getByTestId('ai-model-state')).toHaveText('not installed');
  await expect(row.getByText('ollama pull qwen3.5:4b')).toBeVisible();
  const pulls = () => fake.requests.filter((r) => r.path === '/api/pull').length;
  const before = pulls();
  await page.getByTestId('ai-pull-qwen3.5:4b').click();
  const d = page.getByTestId('ai-pull-dialog');
  await expect(d.getByTestId('ai-pull-size')).toHaveText('about 3.3 GB');
  await expect(d.getByTestId('ai-pull-disk')).toHaveText(/GB|couldn’t tell/);
  await expect(d.getByTestId('ai-pull-ram')).toContainText('8 GB');
  await d.getByTestId('ai-pull-no').click();
  expect(pulls()).toBe(before);

  await page.getByTestId('ai-pull-qwen3.5:4b').click();
  await d.getByTestId('ai-pull-yes').click();
  await expect(d.getByTestId('ai-pull-progress')).toBeVisible();
  await d.getByTestId('ai-pull-cancel').click();
  await expect(d.getByTestId('ai-pull-cancelled')).toBeVisible();
  await d.getByTestId('ai-pull-close').click();
  await expect(row.getByTestId('ai-model-state')).toHaveText('not installed');
  expect(pulls()).toBe(before + 1);
  await expect.poll(async () => (await aiLines(page, server)).filter((l) => l.feature === 'pull').map((l) => `${l.via}:${l.outcome}`).sort()).toEqual(['fetch:ok', 'ollama:error']);
});

test('390 px and dark: the tab fits, and turning AI off hides the chip again', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(server.url + '/settings/ai');
  await expect(page.getByTestId('ai-connections')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.getByRole('switch', { name: 'AI' }).click();
  await expect(page.getByTestId('ai-master-sentence')).toHaveText('AI is off. Nothing is sent to any model.');
  await expect(page.getByTestId('ai-chip')).toHaveCount(0);
  await expect(page.getByTestId('ai-off-saved')).toContainText('Ollama');
  const s = await (await page.request.get(`${server.url}/api/ai`)).json();
  expect(s.egressHosts).toEqual([]);
});
