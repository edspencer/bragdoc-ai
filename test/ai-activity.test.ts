// The AI activity log (PR22, D68): logs/ai-runs.jsonl, one line per ctx.ai call or per feature run, never any
// content. Rotation, paging, the API and its event, runs grouping calls, `bragdoc dev ai`, and with AI off: no file.
import { after, afterEach, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { activityFile, AiActivity, readActivity } from '../server/ai/activity.ts';
import { AiError } from '../server/ai/errors.ts';
import type { CallRecord } from '../server/ai/run.ts';
import { initHome } from '../server/home.ts';
import { ConfigStore } from '../server/config.ts';
import { aiHome, type AiHome } from './ai-fixture.ts';
import { rmTmp, tmpDir, tmpHome } from './fixture.ts';
import { startFakeLlm } from './fixtures/fake-llm/server.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MARKER = 'PLANTED-c0ffee-9b1d';

let fake: Awaited<ReturnType<typeof startFakeLlm>>;
before(async () => {
  fake = await startFakeLlm({ scenario: 'ok' });
});
after(() => fake.close());

let home: AiHome | undefined;
let dir: string | undefined;
afterEach(() => {
  home?.close();
  home = undefined;
  if (dir) rmTmp(dir);
  dir = undefined;
});

const on = () => ({
  enabled: true,
  connections: { local: { kind: 'ollama', baseUrl: fake.url }, gone: { kind: 'ollama', baseUrl: `${fake.url}/s/down` } },
  text: { connection: 'local', model: 'qwen3.5:4b' },
});
const schema = z.object({ ok: z.boolean() });
const rec = (over: Partial<CallRecord> = {}): CallRecord => ({ feature: 'test', purpose: 'ai.test', connection: 'local', model: 'qwen3.5:4b', where: 'this-computer', startedAt: new Date().toISOString(), ms: 5, outcome: 'ok', tokensIn: 10, tokensOut: 2, ...over });

test('one line per ctx.ai call against the fake model server, with no content anywhere in the file', async () => {
  home = aiHome({ ai: on() });
  const events: string[] = [];
  home.bus.subscribe((e) => events.push(e.type));
  const system = `You check connections. ${MARKER}-system`;
  await home.ctx.ai.object({ feature: 'test', purpose: 'ai.test', slot: { connection: 'local', model: 'qwen3.5:4b' }, system, prompt: `Reply with {"ok": true}. ${MARKER}-prompt`, schema });
  // a streamed call whose answer repeats the prompt (the fake's echo row): the answer holds the marker too
  const s = await home.ctx.ai.stream({ feature: 'test', purpose: 'ai.test', slot: { connection: 'local', model: 'qwen3.5:4b' }, system, prompt: `echo: ${MARKER}-stream` });
  let text = '';
  for await (const t of s.textStream) text += t;
  assert.match(text, new RegExp(MARKER));
  await assert.rejects(home.ctx.ai.object({ feature: 'test', purpose: 'ai.test', slot: { connection: 'gone', model: 'qwen3.5:4b' }, system, prompt: `${MARKER}-down`, schema }), (e) => e instanceof AiError && e.code === 'unreachable');
  const { entries, total } = home.ctx.aiActivity.read();
  assert.equal(total, 3);
  const [down, streamed, structured] = entries; // newest first
  assert.deepEqual([structured!.feature, structured!.trigger, structured!.model, structured!.where, structured!.connection, structured!.items, structured!.outcome], ['test', 'now', 'qwen3.5:4b', 'this-computer', 'local', 1, 'ok']);
  assert.deepEqual(structured!.calls, { ok: 1, error: 0, cancelled: 0 });
  assert.ok(structured!.tokensIn! > 0 && structured!.tokensOut! > 0, 'tokens, as the runner reported them');
  assert.ok(Date.parse(structured!.endedAt) >= Date.parse(structured!.startedAt));
  assert.equal(streamed!.outcome, 'ok');
  assert.deepEqual([down!.outcome, down!.error, down!.connection], ['error', 'unreachable', 'gone']);
  const raw = fs.readFileSync(activityFile(home.dir), 'utf8');
  assert.ok(!raw.includes(MARKER), 'no prompt, system prompt or answer in the activity log');
  assert.ok(!raw.includes('You check connections'));
  assert.equal(raw.trim().split('\n').length, 3);
  assert.equal((fs.statSync(activityFile(home.dir)).mode & 0o777).toString(8), '600');
  await new Promise((r) => setTimeout(r, 300));
  assert.ok(events.includes('ai-activity'));
});

test('a feature run groups its calls into one line, with its own counts; a run that asked nothing writes nothing', async () => {
  home = aiHome({ ai: on() });
  const run = home.ctx.aiActivity.start({ feature: 'test', trigger: 'schedule' });
  for (let i = 0; i < 3; i++) {
    await home.ctx.ai.object({ feature: 'test', purpose: 'ai.test', slot: { connection: 'local', model: 'qwen3.5:4b' }, system: 's', prompt: 'Reply with {"ok": true}.', schema, runId: run.id });
    run.count(i === 2 ? 'probably-not' : 'win');
  }
  await home.ctx.ai.object({ feature: 'test', purpose: 'ai.test', slot: { connection: 'gone', model: 'qwen3.5:4b' }, system: 's', prompt: 'p', schema, runId: run.id }).catch(() => {});
  run.count('failed');
  run.count('A sentence, not a code'); // dropped: counts are codes
  assert.equal(home.ctx.aiActivity.read().total, 0, 'nothing until the run ends');
  const line = run.end()!;
  assert.equal(run.end(), null, 'ending twice writes once');
  assert.deepEqual([line.id, line.trigger, line.items, line.outcome, line.error], [run.id, 'schedule', 4, 'ok', null]);
  assert.deepEqual(line.calls, { ok: 3, error: 1, cancelled: 0 });
  assert.deepEqual(line.counts, { win: 2, 'probably-not': 1, failed: 1 });
  assert.deepEqual(home.ctx.aiActivity.read().entries, [line]);
  // nothing to judge: no line
  const empty = home.ctx.aiActivity.start({ feature: 'judge', trigger: 'arrival' });
  assert.equal(empty.end(), null);
  assert.equal(home.ctx.aiActivity.read().total, 1);
  // every call failed: the run's error is the last call's code; a message given as the error is stored as a code
  const failing = home.ctx.aiActivity.start({ feature: 'test', trigger: 'now' });
  await home.ctx.ai.object({ feature: 'test', purpose: 'ai.test', slot: { connection: 'gone', model: 'qwen3.5:4b' }, system: 's', prompt: 'p', schema, runId: failing.id }).catch(() => {});
  assert.deepEqual([failing.end()!.outcome, home.ctx.aiActivity.read().entries[0]!.error], ['error', 'unreachable']);
  const said = home.ctx.aiActivity.start({ feature: 'test', trigger: 'now' });
  await home.ctx.ai.object({ feature: 'test', purpose: 'ai.test', slot: { connection: 'local', model: 'qwen3.5:4b' }, system: 's', prompt: 'p', schema, runId: said.id });
  assert.equal(said.end({ error: `couldn't read ${MARKER}` })!.error, 'failed');
});

test('rotation: at the size limit the log becomes ai-runs.1.jsonl (replacing the one before), and reads cover both', () => {
  dir = tmpDir('bragdoc-activity-');
  const log = new AiActivity({ dataDir: dir, maxBytes: 2000 });
  for (let i = 0; i < 40; i++) log.record(rec({ model: `m-${i}` }));
  const file = activityFile(dir);
  const older = file.replace(/\.jsonl$/, '.1.jsonl');
  assert.ok(fs.existsSync(older));
  assert.ok(fs.statSync(file).size < 2000 + 600, 'the current file stays near the limit');
  const all = readActivity(dir, { limit: 500 });
  assert.equal(all.entries[0]!.model, 'm-39', 'newest first');
  assert.ok(all.total < 40, 'the oldest went with the replaced file: the log is bounded');
  assert.ok(all.total >= 10);
  const models = all.entries.map((e) => Number(e.model!.slice(2)));
  assert.deepEqual(models, [...models].sort((a, b) => b - a), 'in order across the two files');
  assert.deepEqual(models, Array.from({ length: models.length }, (_, i) => 39 - i), 'contiguous: nothing lost between them');
  // a torn line (a crash mid-append) is skipped
  fs.appendFileSync(file, '{"id": "torn');
  assert.equal(readActivity(dir, { limit: 500 }).total, all.total);
});

test('paging: limit and offset, newest first; the API checks them', async () => {
  home = aiHome();
  for (let i = 0; i < 7; i++) home.ctx.aiActivity.record(rec({ model: `m-${i}` }));
  const page = (q: string) => home!.req('GET', `/api/ai/activity${q}`);
  let r = await page('?limit=3');
  assert.equal(r.status, 200);
  assert.deepEqual([r.body.total, r.body.entries.map((e: { model: string }) => e.model)], [7, ['m-6', 'm-5', 'm-4']]);
  r = await page('?limit=3&offset=6');
  assert.deepEqual(r.body.entries.map((e: { model: string }) => e.model), ['m-0']);
  r = await page('');
  assert.equal(r.body.entries.length, 7);
  for (const q of ['?limit=0', '?limit=501', '?limit=x', '?offset=-1']) assert.equal((await page(q)).status, 400, q);
});

test('with AI off, nothing is logged and there is no file at all', async () => {
  home = aiHome({ ai: { ...on(), enabled: false } });
  await assert.rejects(home.ctx.ai.object({ feature: 'test', purpose: 'ai.test', slot: { connection: 'local', model: 'qwen3.5:4b' }, system: 's', prompt: 'p', schema }), (e) => e instanceof AiError && e.code === 'ai_off');
  const run = home.ctx.aiActivity.start({ feature: 'judge', trigger: 'schedule' });
  run.end();
  assert.equal(fs.existsSync(activityFile(home.dir)), false);
  const r = await home.req('GET', '/api/ai/activity');
  assert.deepEqual(r.body, { entries: [], total: 0 });
  assert.equal(home.ctx.ai.loaded(), false);
});

test('`bragdoc dev ai` lands in the data home’s activity log (trigger cli), which a running server lists', async () => {
  const h = tmpHome();
  try {
    initHome(h.dataDir);
    new ConfigStore(h.dataDir).update({ ai: on() });
    const child = spawn(process.execPath, ['--import', 'tsx', path.join(ROOT, 'server', 'cli.ts'), 'dev', 'ai', '--connection', 'local', '--model', 'qwen3.5:4b', `echo: ${MARKER}`], { cwd: ROOT, env: h.env });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    const code = await new Promise<number | null>((r) => child.on('exit', r));
    assert.equal(code, 0, out);
    const { entries } = readActivity(h.dataDir);
    assert.equal(entries.length, 1);
    assert.deepEqual([entries[0]!.trigger, entries[0]!.feature, entries[0]!.outcome], ['cli', 'test', 'ok']);
    assert.ok(!fs.readFileSync(activityFile(h.dataDir), 'utf8').includes(MARKER));
  } finally {
    h.cleanup();
  }
});
