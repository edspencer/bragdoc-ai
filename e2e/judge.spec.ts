// The Found judge (SPEC R21, PR24), end to end, on a server of its own (turning AI on in the shared e2e server's home
// would change what every other spec sees) and the fake model server: never a real model. A screenshot candidate (a
// drawn chat, read by the real OCR) → Judge now → the stamp and the why on its card. Then AI off: the stamp stays,
// marked "judged earlier", Judge now is gone, and no run can start.
import { spawn, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { startFakeLlm } from '../test/fixtures/fake-llm/server.ts';
import { chat, png } from '../test/screenshots.ts';

test.describe.configure({ mode: 'serial' });
test.skip(({ browserName }) => browserName !== 'chromium', 'runs once: it has its own server');

const ID = '01JAJDGE0E2E00000000000001';
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
  home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bragdoc-e2e-judge-')));
  const data = path.join(home, '.bragdoc');
  fs.mkdirSync(path.join(data, 'found'), { recursive: true });
  fs.writeFileSync(path.join(data, 'profile.yaml'), 'name: Alex Marlowe\naliases: [Alex, AM]\nnotMe: [Alex P]\n');
  // a screenshot the rules passed, as the screenshots folder would have left it
  const shot = chat({ title: '# payments', messages: [{ author: 'Jordan Kim', time: '9:10 AM', text: QUOTE }] });
  const bytes = png(shot.svg);
  const file = path.join(home, 'Screenshot praise.png');
  fs.writeFileSync(file, bytes);
  const sha = createHash('sha256').update(bytes).digest('hex');
  fs.writeFileSync(
    path.join(data, 'found', `${ID}.yaml`),
    [
      'schemaVersion: 1',
      `id: ${ID}`,
      'status: pending',
      'source: screenshots',
      `externalKey: "screenshot:${sha}"`,
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
      `  - path: "${file}"`,
      '    title: Screenshot praise.png',
      'matchedRules: ["Says your name: \\"Alex\\"", "Praise: \\"Amazing\\""]',
      '',
    ].join('\n'),
  );
  const port = 27420 + info.workerIndex;
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
  // AI on, a local connection to the fake, the judge on (what Settings → AI does)
  expect((await api('POST', '/api/ai/connections', { id: 'fake', kind: 'ollama', baseUrl: fake.url })).status).toBe(201);
  expect((await api('PUT', '/api/ai', { enabled: true, text: { connection: 'fake', model: 'qwen3.5:4b' } })).status).toBe(200);
  expect((await api('PUT', '/api/ai/features/judge', { enabled: true })).status).toBe(200);
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

test('Judge now puts the verdict on the card; with AI off it stays, marked "judged earlier", and nothing can run', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/status of 409/.test(m.text()) && errors.push(m.text()));

  await page.goto(url + '/found');
  const card = page.getByTestId('found-card').filter({ hasText: QUOTE });
  await expect(card).toBeVisible();
  await expect(card.getByTestId('found-verdict')).toHaveCount(0);
  await expect(card).not.toContainText('AI off'); // AI is on here (PR23's footer)
  await page.getByTestId('judge-now').click();
  await expect(card.getByTestId('found-verdict-stamp')).toHaveText('Looks like a win · 86%', { timeout: 30_000 });
  await expect(card.getByTestId('found-verdict-why')).toHaveText('Specific praise for something the user did.');
  await expect(card.getByTestId('found-verdict-by')).toHaveText('judged by qwen3.5:4b on this computer');
  await expect(page.getByTestId('judge-now')).toBeDisabled(); // nothing left waiting
  // the model was sent the marked, labelled text: never the picture's path
  const sent = fake!.requests.filter((r) => r.path.endsWith('/api/chat')).map((r) => JSON.stringify(r.body));
  expect(sent).toHaveLength(1);
  expect(sent[0]).toContain('The message to judge');
  expect(sent[0]).not.toContain(home);

  // AI off: the stamp stays, marked; Judge now is gone; the API refuses
  expect((await api('PUT', '/api/ai', { enabled: false })).status).toBe(200);
  await page.reload();
  await expect(card.getByTestId('found-verdict-stamp')).toHaveText('Looks like a win · 86%');
  await expect(card.getByTestId('found-verdict-by')).toHaveText('judged by qwen3.5:4b on this computer · judged earlier (the judge is off now)');
  await expect(page.getByTestId('judge-now')).toHaveCount(0);
  await expect(card).toContainText('plain rules · AI off');
  const refused = await api('POST', '/api/ai/judge/run', {});
  expect([refused.status, refused.body.error.code]).toEqual([409, 'ai_off']);
  expect(errors).toEqual([]);
});
