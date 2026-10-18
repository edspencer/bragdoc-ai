// With AI off, the AI SDK isn't even loaded (SPEC principle 3, R20). A child process runs a whole AI-off session
// (boot, the board, Found, Settings, the AI settings) under a module loader hook (fixtures/ai-lazy/) that writes down
// every `ai` or `@ai-sdk/*` resolution: there must be none. The control turns AI on and makes one call against the
// fake model server, and the hook sees the SDK load, so a silent hook can't pass the test.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, rmTmp, tmpDir, tmpHome } from './fixture.ts';
import { startFakeLlm } from './fixtures/fake-llm/server.ts';

const FIX = path.join(ROOT, 'test', 'fixtures', 'ai-lazy');
let fake: Awaited<ReturnType<typeof startFakeLlm>>;
let dir: string;
before(async () => {
  fake = await startFakeLlm();
  dir = tmpDir('bragdoc-lazy-log-');
});
after(async () => {
  await fake.close();
  rmTmp(dir);
});

/** Run the session in a child (asynchronously: the fake model server answering it lives in this process). */
async function session(mode: 'off' | 'on'): Promise<{ resolved: string[]; statuses: Record<string, number> }> {
  const log = path.join(dir, `${mode}.log`);
  fs.writeFileSync(log, '');
  const h = tmpHome();
  try {
    const child = spawn(process.execPath, ['--import', 'tsx', '--import', path.join(FIX, 'register.mjs'), path.join(FIX, 'session.ts')], {
      cwd: ROOT,
      env: { ...h.env, AI_LAZY_LOG: log, AI_LAZY_MODE: mode, AI_LAZY_FAKE: fake.url },
      timeout: 60_000,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    const status = await new Promise<number | null>((resolve) => child.on('close', resolve));
    assert.equal(status, 0, stderr);
    return { resolved: fs.readFileSync(log, 'utf8').split('\n').filter(Boolean), statuses: JSON.parse(stdout) };
  } finally {
    rmTmp(h.home);
  }
}

test('a whole AI-off session never resolves `ai` or `@ai-sdk/*`', async () => {
  const { resolved, statuses } = await session('off');
  assert.deepEqual(resolved, []);
  // it really did use the app: every page answered, the AI settings were written, and the model calls were refused
  for (const [k, s] of Object.entries(statuses)) if (k.startsWith('GET /api/')) assert.equal(s, 200, k);
  assert.equal(statuses['POST /api/ai/connections'], 201);
  assert.equal(statuses['PUT …/key'], 200);
  assert.equal(statuses['POST …/consent'], 200);
  assert.equal(statuses['POST …/test'], 409);
  assert.equal(statuses['GET …/models'], 409);
});

test('the control: with AI on, one test call loads the SDK, and the hook sees it', async () => {
  const { resolved, statuses } = await session('on');
  assert.equal(statuses['POST …/test'], 200);
  assert.ok(resolved.includes('ai'), resolved.join(', '));
});
