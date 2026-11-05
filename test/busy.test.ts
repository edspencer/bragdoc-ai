// The busy check (cli-contract SPEC §4, D86): GET /api/busy's counts, the import lock as one of them, and `bragdoc
// busy`'s exit codes and --json, from source with a throwaway home.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { BusyResponse } from '../shared/api.ts';
import { busy } from '../server/commands/busy.ts';
import { busyJson, checkBusy, describeCounts } from '../server/commands/busy-client.ts';
import { makeCtx } from '../server/commands/context.ts';
import type { AppContext } from '../server/context.ts';
import { importRunning, takeImportLock } from '../server/import/lock.ts';
import { createApp } from '../server/index.ts';
import { busyCounts } from '../server/routes/busy.ts';
import { ROOT, rmTmp, stopChild, tmpDir, tmpHome } from './fixture.ts';

const h = tmpHome();
after(() => h.cleanup());

const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
const CLI = ['--import', 'tsx', path.join(ROOT, 'server', 'cli.ts')];
const run = (...args: string[]) => spawnSync(process.execPath, [...CLI, ...args], { cwd: ROOT, env: h.env, encoding: 'utf8' });

test('GET /api/busy: not busy, with the version and a count for each kind, and no auth', async () => {
  const dir = tmpDir();
  try {
    const res = await createApp({ dataDir: dir, webDist: null }).request('/api/busy');
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { busy: false, version: VERSION, counts: { import: 0, judge: 0, ai: 0 } } satisfies BusyResponse);
  } finally {
    rmTmp(dir);
  }
});

test("GET /api/busy: an import in this server is busy, and stops being busy when it's done", async () => {
  const dir = tmpDir();
  try {
    const app = createApp({ dataDir: dir, webDist: null });
    const release = takeImportLock(dir);
    try {
      assert.deepEqual(await (await app.request('/api/busy')).json(), { busy: true, version: VERSION, counts: { import: 1, judge: 0, ai: 0 } });
    } finally {
      release();
    }
    assert.equal(((await (await app.request('/api/busy')).json()) as BusyResponse).busy, false);
  } finally {
    rmTmp(dir);
  }
});

test("the counts: a judge run, and every AI request running or waiting on any connection", () => {
  const ctx = { dataDir: '/nonexistent', judge: { busy: () => true }, ai: { queue: () => ({ ollama: { running: 1, waiting: 2 }, cloud: { running: 1, waiting: 0 } }) } };
  assert.deepEqual(busyCounts(ctx as unknown as AppContext), { import: 0, judge: 1, ai: 4 });
});

test("importRunning: another process's fresh lock counts while its pid lives; a dead or hour-old one doesn't", () => {
  const dir = tmpDir();
  const lock = path.join(dir, 'cache', 'import.lock');
  const put = (pid: number, startedAt: Date) => {
    fs.mkdirSync(path.dirname(lock), { recursive: true });
    fs.writeFileSync(lock, JSON.stringify({ pid, startedAt: startedAt.toISOString() }));
  };
  try {
    assert.equal(importRunning(dir), false, 'no lock');
    put(process.ppid, new Date()); // a live process that isn't us: `bragdoc import` in a terminal
    assert.equal(importRunning(dir), true);
    put(process.ppid, new Date(Date.now() - 2 * 60 * 60 * 1000));
    assert.equal(importRunning(dir), false, 'over an hour old: left over from a crash');
    const dead = spawnSync(process.execPath, ['-e', '0']).pid!;
    put(dead, new Date());
    assert.equal(importRunning(dir), false, 'its process has gone');
    put(process.pid, new Date());
    assert.equal(importRunning(dir), false, 'our own pid without our flag is a previous life of this pid');
  } finally {
    rmTmp(dir);
  }
});

test('describeCounts: the non-zero kinds, in words', () => {
  assert.equal(describeCounts({ import: 0, judge: 0, ai: 0 }), '');
  assert.equal(describeCounts({ import: 1, judge: 0, ai: 0 }), '1 import is running');
  assert.equal(describeCounts({ import: 0, judge: 1, ai: 3 }), '1 judge run and 3 AI requests are running');
});

test('bragdoc busy with nothing running: exit 3, and --json is one document with running false', () => {
  const r = run('busy');
  assert.equal(r.status, 3, r.stderr);
  assert.equal(r.stdout, "BragDoc isn't running.\n");
  const j = run('busy', '--json');
  assert.equal(j.status, 3);
  assert.deepEqual(JSON.parse(j.stdout), { running: false, busy: false });
  assert.equal(j.stderr, "BragDoc isn't running.\n", 'the sentence goes to stderr under --json');
  assert.equal(fs.existsSync(h.dataDir), false, 'asking creates nothing');
});

test('bragdoc busy: usage errors exit 2', () => {
  for (const args of [['busy', 'extra'], ['busy', '--force'], ['busy', '--port', 'abc'], ['busy', '--port', '0'], ['busy', '--data-dir=']]) {
    const r = run(...args);
    assert.equal(r.status, 2, `${args.join(' ')}: ${r.stderr}`);
    assert.match(r.stderr, /Usage: bragdoc/);
  }
});

test('bragdoc busy against a running BragDoc: found through runtime.json, exit 0, the counts; and runtime.json has the contract fields', async () => {
  const child = spawn(process.execPath, [...CLI, 'serve', '--port', '0'], { cwd: ROOT, env: h.env });
  try {
    const url = await new Promise<string>((resolve, reject) => {
      let out = '';
      const timer = setTimeout(() => reject(new Error(`no first line: ${out}`)), 15_000);
      child.stdout!.on('data', (d) => {
        out += d;
        const m = /^BragDoc \S+: (http:\/\/\S+)\n/.exec(out);
        if (m) {
          clearTimeout(timer);
          resolve(m[1]!);
        }
      });
      child.on('exit', (code) => reject(new Error(`exited ${code}: ${out}`)));
    });
    // cli-contract reference/runtime-file.ts reads { pid, port, url, version, startedAt }; BragDoc's own mcpToken stays
    const rt = JSON.parse(fs.readFileSync(path.join(h.dataDir, 'runtime.json'), 'utf8'));
    assert.deepEqual(Object.keys(rt).sort(), ['mcpToken', 'pid', 'port', 'startedAt', 'url', 'version']);
    assert.equal(rt.pid, child.pid);
    assert.equal(rt.url, url);
    assert.equal(rt.version, VERSION);
    assert.ok(!Number.isNaN(Date.parse(rt.startedAt)));
    assert.equal(fs.statSync(path.join(h.dataDir, 'runtime.json')).mode & 0o777, 0o600);

    const r = spawnSync(process.execPath, [...CLI, 'busy', '--json'], { cwd: ROOT, env: h.env, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(JSON.parse(r.stdout), { running: true, busy: false, url, version: VERSION, counts: { import: 0, judge: 0, ai: 0 } });
    assert.equal(r.stderr, "BragDoc isn't busy.\n");
    // --port asks that port, whatever runtime.json says
    const p = spawnSync(process.execPath, [...CLI, 'busy', '--port', new URL(url).port, '--data-dir', path.join(h.home, 'elsewhere')], { cwd: ROOT, env: h.env, encoding: 'utf8' });
    assert.equal(p.status, 0, p.stderr);
    assert.equal(p.stdout, "BragDoc isn't busy.\n");
  } finally {
    await stopChild(child);
  }
  // runtime.json stays (its token outlives the server), but its pid has gone: not running
  assert.equal(run('busy').status, 3);
});

test('bragdoc busy: a busy answer is exit 75 with what is running; an answer that is not a busy answer is exit 1', async () => {
  const dir = tmpDir();
  try {
    for (const [answer, code, out] of [
      [Response.json({ busy: true, version: '9.9.9', counts: { import: 0, judge: 1, ai: 1 } }), 75, 'BragDoc is busy: 1 judge run and 1 AI request are running.\n'],
      [Response.json({ error: { code: 'not_found', message: 'no' } }, { status: 404 }), 1, "bragdoc: Something answered at http://localhost:5151/api/busy, but not as BragDoc's busy check (HTTP 404).\n"],
      [new Response('<html>'), 1, "bragdoc: Something answered at http://localhost:5151/api/busy, but not as BragDoc's busy check (the answer isn't JSON).\n"],
    ] as const) {
      let printed = '';
      const ctx = makeCtx({ env: {}, homedir: dir, out: (s) => (printed += s), err: (s) => (printed += s), loopback: async () => answer.clone() });
      assert.equal(await busy(ctx, [], { port: '5151' }, undefined), code);
      assert.equal(printed, out);
    }
    // the --json document for a busy answer matches the contract's busy.schema.json shape
    const r = await checkBusy({ dataDir: dir, port: 5151, get: async () => Response.json({ busy: true, version: '9.9.9', counts: { ai: 2 } }) });
    assert.deepEqual(busyJson(r), { running: true, busy: true, url: 'http://localhost:5151', version: '9.9.9', counts: { ai: 2 } });
  } finally {
    rmTmp(dir);
  }
});
