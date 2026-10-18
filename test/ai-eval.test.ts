// The live-eval harness (PR22, D68): it refuses under CI and without BRAGDOC_LIVE_AI=1, runs a spec through ctx.ai
// (here against the fake model server: CI never calls a real model), stops on a run-level failure (the runner down,
// AI turned off mid-eval) without recording, and its recordings replay through the fake server (test/ai-replay.ts),
// including the ones recorded from real models on a dev machine (test/fixtures/ai-recordings/).
import { after, afterEach, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { adHoc, formatReport, fromHome, readRecording, RECORDINGS, recordingPath, refusal, runEval, writeRecording, type Recording } from '../scripts/eval/lib.ts';
import { SMOKE } from '../scripts/eval/smoke.ts';
import { readActivity } from '../server/ai/activity.ts';
import { ConfigStore } from '../server/config.ts';
import { initHome } from '../server/home.ts';
import { replay } from './ai-replay.ts';
import { rmTmp, tmpDir, tmpHome } from './fixture.ts';
import { startFakeLlm } from './fixtures/fake-llm/server.ts';

const ROOT = path.resolve(import.meta.dirname, '..');

let fake: Awaited<ReturnType<typeof startFakeLlm>>;
before(async () => {
  fake = await startFakeLlm({ scenario: 'ok', slowMs: 600 });
});
after(() => fake.close());

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const f of cleanups.splice(0)) f();
});

function evalScript(args: string[], env: NodeJS.ProcessEnv): Promise<{ code: number | null; out: string; err: string }> {
  const child = spawn(process.execPath, ['--import', 'tsx', path.join(ROOT, 'scripts/eval/smoke.ts'), ...args], { cwd: ROOT, env });
  let out = '';
  let err = '';
  child.stdout.on('data', (d) => (out += d));
  child.stderr.on('data', (d) => (err += d));
  return new Promise((r) => child.on('exit', (code) => r({ code, out, err })));
}

test('refuses under CI, and without BRAGDOC_LIVE_AI=1, before it contacts anything', async () => {
  assert.match(refusal({ CI: 'true', BRAGDOC_LIVE_AI: '1' })!, /CI/);
  assert.match(refusal({})!, /BRAGDOC_LIVE_AI=1/);
  assert.match(refusal({ BRAGDOC_LIVE_AI: 'yes' })!, /BRAGDOC_LIVE_AI=1/);
  assert.equal(refusal({ BRAGDOC_LIVE_AI: '1' }), null);
  const h = tmpHome();
  cleanups.push(h.cleanup);
  const n = fake.requests.length;
  const args = ['--connection', `ollama@${fake.url}`, '--model', 'qwen3.5:4b'];
  const env: NodeJS.ProcessEnv = { ...h.env, BRAGDOC_LIVE_AI: '1' };
  delete env.CI;
  for (const [e, re] of [
    [{ ...env, CI: 'true' }, /refusing to call a real model with CI set/],
    [{ ...env, CI: '1' }, /CI set/],
    [{ ...env, BRAGDOC_LIVE_AI: '' }, /set BRAGDOC_LIVE_AI=1/],
  ] as const) {
    const r = await evalScript(args, e);
    assert.equal(r.code, 2, r.err);
    assert.match(r.err, re);
  }
  assert.equal(fake.requests.length, n, 'nothing was sent');
});

test('against the fake model server: every case through ctx.ai, scored, one activity run, and a table', async () => {
  const a = adHoc('ollama', fake.url, 'qwen3.5:4b', SMOKE.feature);
  cleanups.push(a.close);
  const report = await runEval(SMOKE, { ai: a.ai, slot: a.slot, activity: a.activity });
  assert.equal(report.stopped, null);
  assert.equal(report.rows.length, SMOKE.cases.length);
  assert.ok(report.rows.every((r) => r.pass === true), formatReport(report));
  assert.equal(report.where, 'this-computer');
  const table = formatReport(report);
  assert.match(table, /^case\s+pass/m);
  assert.match(table, /passed\s+8 \(100%\)/);
  const [line] = readActivity(a.dataDir).entries;
  assert.deepEqual([line!.trigger, line!.feature, line!.items, line!.counts.pass, line!.outcome], ['eval', 'test', 8, 8, 'ok']);
  // a cloud address can't be made up on the command line: it needs consent
  assert.throws(() => adHoc('openai-compatible', 'https://llm.example.com/v1', 'm', 'test'), /consent/);
});

test('an item-level failure is that row; the eval goes on', async () => {
  const a = adHoc('ollama', `${fake.url}/s/bad-json`, 'qwen3.5:4b', SMOKE.feature);
  cleanups.push(a.close);
  const report = await runEval(SMOKE, { ai: a.ai, slot: a.slot, limit: 3 });
  assert.equal(report.stopped, null);
  assert.deepEqual(report.rows.map((r) => r.error), ['bad_output', 'bad_output', 'bad_output']);
  assert.match(formatReport(report), /valid answers\s+0 of 3/);
});

test('the runner down: it stops at once with the reason, exit 1, and no recording', async () => {
  const a = adHoc('ollama', `${fake.url}/s/down`, 'qwen3.5:4b', SMOKE.feature);
  cleanups.push(a.close);
  const report = await runEval(SMOKE, { ai: a.ai, slot: a.slot, activity: a.activity });
  assert.equal(report.stopped?.code, 'unreachable');
  assert.equal(report.rows.length, 1);
  assert.match(formatReport(report), /stopped early: unreachable/);
  assert.deepEqual([readActivity(a.dataDir).entries[0]!.outcome, readActivity(a.dataDir).entries[0]!.error], ['error', 'unreachable']);
  // the command line says so, and writes nothing
  const h = tmpHome();
  cleanups.push(h.cleanup);
  const env: NodeJS.ProcessEnv = { ...h.env, BRAGDOC_LIVE_AI: '1' };
  delete env.CI;
  const r = await evalScript(['--connection', `ollama@${fake.url}/s/down`, '--model', 'qwen3.5:4b', '--record', '--limit', '2'], env);
  assert.equal(r.code, 1, r.err);
  assert.match(r.out, /stopped early: unreachable/);
  assert.match(r.err, /not recording/);
  assert.equal(fs.existsSync(recordingPath('smoke', 'qwen3.5:4b')) && fs.readFileSync(recordingPath('smoke', 'qwen3.5:4b'), 'utf8').includes('"unreachable"'), false);
});

test('AI turned off mid-eval: the data home’s switch is read live, the call in flight is stopped, the run says cancelled', async () => {
  const h = tmpHome();
  cleanups.push(h.cleanup);
  initHome(h.dataDir);
  const config = new ConfigStore(h.dataDir);
  config.update({ ai: { enabled: true, connections: { slow: { kind: 'ollama', baseUrl: `${fake.url}/s/slow` } } } });
  const s = fromHome(h.dataDir, 'slow', 'qwen3.5:4b', SMOKE.feature, h.env);
  const done = runEval(SMOKE, {
    ai: s.ai,
    slot: s.slot,
    activity: s.activity,
    onRow: (_row, i) => {
      if (i === 0) config.update({ ai: { enabled: false } }); // after the first answer, as Settings would
    },
  });
  const report = await done;
  assert.equal(report.stopped?.code, 'ai_off', formatReport(report));
  assert.ok(report.rows.length <= 2);
  assert.equal(report.rows[0]!.pass, true);
  const [line] = readActivity(h.dataDir).entries;
  assert.deepEqual([line!.trigger, line!.outcome], ['eval', 'cancelled']);
  // the feature's own switch is taken as on, the master switch never is
  assert.throws(() => fromHome(h.dataDir, 'nope', 'm', 'test', h.env), /no connection "nope"/);
  assert.throws(() => fromHome(path.join(h.home, 'empty'), 'slow', 'm', 'test', h.env), /no config\.yaml/);
});

test('record → replay round-trips: the same answers, the same scores, nothing stale', async () => {
  const a = adHoc('ollama', fake.url, 'qwen3.5:4b', SMOKE.feature);
  cleanups.push(a.close);
  const live = await runEval(SMOKE, { ai: a.ai, slot: a.slot });
  const root = tmpDir('bragdoc-recordings-');
  cleanups.push(() => rmTmp(root));
  const file = writeRecording(live.recording, [new URL(fake.url).host], root);
  assert.equal(path.relative(root, file), path.join('smoke', 'qwen3.5-4b.json'));
  const text = fs.readFileSync(file, 'utf8');
  assert.ok(!text.includes(new URL(fake.url).host) && !text.includes('127.0.0.1'), 'no host or address in a recording');
  const rec = readRecording(file);
  // a recording with a wrong answer in it: the replay shows that answer, not the fake's own right one
  const wrong: Recording = structuredClone(rec);
  (wrong.cases[0]!.calls[0]!.answer as { percent: number }).percent = 12;
  const r = await replay(SMOKE, wrong);
  assert.deepEqual([r.stale, r.missing], [[], []]);
  assert.equal(r.report.rows[0]!.pass, false);
  assert.equal(r.report.rows[0]!.cells.percent, 'got 12');
  assert.deepEqual(r.report.rows.slice(1).map((x) => x.pass), live.rows.slice(1).map((x) => x.pass));
  // the prompt changed since it was recorded: stale
  const changed = { ...SMOKE, run: (c: (typeof SMOKE.cases)[number], ask: Parameters<typeof SMOKE.run>[1]) => SMOKE.run({ ...c, input: { ...c.input, sentence: c.input.sentence + ' (edited)' } }, ask) };
  assert.equal((await replay(changed, rec)).stale.length, SMOKE.cases.length);
  // a recording never holds the connection's host or key
  assert.throws(() => writeRecording({ ...rec, cases: [{ id: 'x', calls: [{ hash: 'h', answer: 'see http://127.0.0.1:11434', ms: 1, tokensIn: null, tokensOut: null }] }] }, [], root), /local address/);
  assert.throws(() => writeRecording({ ...rec, cases: [{ id: 'x', calls: [{ hash: 'h', answer: 'sk-or-v1-abcdefghijklmnop', ms: 1, tokensIn: null, tokensOut: null }] }] }, ['sk-or-v1-abcdefghijklmnop'], root), /a secret/);
});

test('the recordings from real models replay: nothing stale, every case answered', async () => {
  const dir = path.join(RECORDINGS, 'smoke');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')) : [];
  assert.ok(files.length >= 1, 'a recording from a real local model is committed (npm run eval:smoke -- --record)');
  for (const f of files) {
    const rec = readRecording(path.join(dir, f));
    assert.equal(rec.where, 'this-computer', f);
    const r = await replay(SMOKE, rec);
    assert.deepEqual([r.stale, r.missing], [[], []], `${f}: re-record it (the prompt or the cases changed)`);
    assert.equal(r.report.rows.length, rec.cases.length);
    assert.ok(r.report.rows.every((x) => x.error === null), `${f}:\n${formatReport(r.report)}`);
  }
});
