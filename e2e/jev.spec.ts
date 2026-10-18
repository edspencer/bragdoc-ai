// Jev as the judge (PR28, D82), end to end, on a server of its own and the fake model server's /systemone: never a
// real model. Settings → AI: the Jev tile says to add OpenRouter first when there's none; then Jev goes through an
// OpenRouter connection (pointed at the fake, so it's local and needs no consent here; cloud consent is in
// test/ai-jev.test.ts), "Use for the judge", and Judge now on a screenshot candidate: the stamp, "judged by
// typesafe/jev-1.14", and no reason, because Jev gives none and none is made up.
import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { startFakeLlm } from '../test/fixtures/fake-llm/server.ts';

test.describe.configure({ mode: 'serial' });
test.skip(({ browserName }) => browserName !== 'chromium', 'runs once: it has its own server');

const ID = '01JAJEV0E2E000000000000001';
const QUOTE = 'Amazing work Alex, p95 is down 40% since the batching went out.';

let url = '';
let home = '';
let child: ChildProcess | null = null;
let fake: Awaited<ReturnType<typeof startFakeLlm>> | null = null;

const api = async (method: string, p: string, body?: unknown) => {
  const res = await fetch(url + p, { method, headers: { 'Content-Type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  return { status: res.status, body: await res.json().catch(() => null) };
};

test.beforeAll(async ({}, info) => {
  fake = await startFakeLlm();
  home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bragdoc-e2e-jev-')));
  const data = path.join(home, '.bragdoc');
  fs.mkdirSync(path.join(data, 'found'), { recursive: true });
  fs.writeFileSync(path.join(data, 'profile.yaml'), 'name: Alex Marlowe\naliases: [Alex, AM]\n');
  // a screenshot candidate whose picture is gone: the quote the rules kept is what's judged
  fs.writeFileSync(
    path.join(data, 'found', `${ID}.yaml`),
    [
      'schemaVersion: 1',
      `id: ${ID}`,
      'status: pending',
      'source: screenshots',
      `externalKey: "screenshot:${'b'.repeat(64)}"`,
      `title: "${QUOTE}"`,
      'happenedAt: 2026-10-14',
      'foundAt: 2026-10-17T12:00:00.000Z',
      'evidence:',
      `  - id: ${ID.slice(0, -1)}Q`,
      '    kind: quote',
      '    quote:',
      `      text: "${QUOTE}"`,
      '      from: Jordan Kim',
      '      where: "#payments"',
      'files:',
      `  - path: "${path.join(home, 'gone.png')}"`,
      '    title: gone.png',
      'matchedRules: ["Says your name: \\"Alex\\""]',
      '',
    ].join('\n'),
  );
  const port = 27440 + info.workerIndex;
  url = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ['dist/server/cli.js', 'serve', '--port', String(port), '--quiet'], {
    env: { ...process.env, HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: path.join(home, '.config'), BRAGDOC_HOME: data, BRAGDOC_DEV: '', BRAGDOC_DANGEROUSLY_ALLOW_OPEN: '', PORT: '' },
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
  expect((await api('PUT', '/api/ai', { enabled: true })).status).toBe(200);
  expect((await api('PUT', '/api/ai/features/judge', { enabled: true })).status).toBe(200);
});

test.afterAll(async () => {
  if (child && child.exitCode === null) {
    const gone = new Promise((r) => child!.once('exit', r));
    child.kill('SIGTERM');
    await gone;
  }
  await fake?.close();
  fs.rmSync(home, { recursive: true, force: true });
});

test('with no OpenRouter connection, the Jev tile says to add one first', async ({ page }) => {
  await page.goto(url + '/settings/ai');
  await page.getByTestId('ai-add-jev').click();
  await expect(page.getByTestId('ai-add-via-none')).toContainText('Add OpenRouter first');
  await expect(page.getByTestId('ai-add-save')).toBeDisabled();
});

test('Jev through OpenRouter judges a candidate: a probability, and no reason', async ({ page }) => {
  // an OpenRouter connection at the fake (this computer: no consent), with a placeholder key
  expect((await api('POST', '/api/ai/connections', { id: 'or', kind: 'openrouter', baseUrl: `${fake!.url}/v1` })).status).toBe(201);
  expect((await api('PUT', '/api/ai/connections/or/key', { key: 'sk-or-v1-e2e-placeholder-0000' })).status).toBe(200);
  await page.goto(url + '/settings/ai');
  await page.getByTestId('ai-add-jev').click();
  await expect(page.getByTestId('ai-add-via')).toHaveValue('or');
  await page.getByTestId('ai-add-save').click();
  const card = page.getByTestId('ai-connection-jev');
  await expect(card.getByTestId('ai-connection-jev-note')).toContainText('answers with a probability only');
  await expect(card.getByTestId('ai-connection-model')).toHaveValue('typesafe/jev-1.14');
  await card.getByTestId('ai-connection-test-go').click();
  await expect(card.getByTestId('ai-connection-outcome')).toContainText('answered a yes-or-no question with a probability');
  await card.getByTestId('ai-connection-use').click();
  await expect(card.getByTestId('ai-connection-use')).toHaveText('The judge’s model');
  // Tidy's model chooser never offers Jev, and the server refuses it there anyway
  await page.getByTestId('ai-tidy-choose').click();
  await expect(page.getByTestId('ai-tidy-chooser').locator('select option')).toHaveText(['OpenRouter']);
  expect((await api('PUT', '/api/ai/features/tidy', { model: { connection: 'jev', model: 'typesafe/jev-1.14' } })).status).toBe(400);

  await page.goto(url + '/found');
  const found = page.getByTestId('found-card').filter({ hasText: QUOTE });
  await page.getByTestId('judge-now').click();
  await expect(found.getByTestId('found-verdict-stamp')).toHaveText('Looks like a win · 86%', { timeout: 30_000 });
  await expect(found.getByTestId('found-verdict-by')).toHaveText('judged by typesafe/jev-1.14 on this computer');
  await expect(found.getByTestId('found-verdict-why')).toHaveCount(0);
  const sent = fake!.requests.filter((r) => r.path === '/v1/systemone' && JSON.stringify(r.body).includes('"keep"'));
  expect(sent).toHaveLength(1);
  expect(JSON.stringify(sent[0]!.body)).toContain('The message to judge');
  expect(JSON.stringify(sent[0]!.body)).not.toContain(home);
});

test('a Jev through a cloud OpenRouter asks for its own consent; "Not now" sends nothing', async ({ page }) => {
  // OpenRouter at its real address (cloud), allowed and keyed; nothing here makes a request to it
  expect((await api('POST', '/api/ai/connections', { id: 'or-cloud', kind: 'openrouter', name: 'OpenRouter (cloud)' })).status).toBe(201);
  expect((await api('POST', '/api/ai/connections/or-cloud/consent', { version: 1 })).status).toBe(200);
  await page.goto(url + '/settings/ai');
  await page.getByTestId('ai-add-jev').click();
  await page.getByTestId('ai-add-via').selectOption('or-cloud');
  await page.getByTestId('ai-add-save').click();
  await expect(page.getByRole('dialog')).toContainText('Allow BragDoc to send to openrouter.ai?');
  await expect(page.getByTestId('ai-consent-sends-judge')).toContainText('For a merged pull request');
  await page.getByRole('button', { name: 'Not now' }).click();
  const card = page.getByTestId('ai-connection-jev-2');
  await expect(card.getByTestId('ai-connection-status')).toContainText('allow it first');
  await expect(card.getByTestId('ai-connection-test-go')).toBeDisabled();
  // the OpenRouter card says a Jev goes through it, and removing it warns
  const or = page.getByTestId('ai-connection-or-cloud');
  await expect(or).toContainText('in use by Jev (via OpenRouter)');
  await or.getByTestId('ai-connection-remove').click();
  await expect(or).toContainText('goes through it: the judge stops using it');
  const egress = await api('GET', '/api/network-log?limit=200');
  expect(egress.body.entries.filter((e: { host: string }) => e.host === 'openrouter.ai')).toEqual([]);
});
