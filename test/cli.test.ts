// The CLI as a user runs it: a child process from source (tsx), with a throwaway HOME and BRAGDOC_HOME.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { ROOT, stopChild, tmpHome } from './fixture.ts';

const h = tmpHome();
after(() => h.cleanup());

const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
const CLI = ['--import', 'tsx', path.join(ROOT, 'server', 'cli.ts')];
const run = (...args: string[]) => spawnSync(process.execPath, [...CLI, ...args], { cwd: ROOT, env: h.env, encoding: 'utf8' });

test('--version and -v print the version', () => {
  for (const flag of ['--version', '-v']) {
    const r = run(flag);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, `${VERSION}\n`);
  }
});

test('--help and -h print the usage, naming the default port', () => {
  for (const flag of ['--help', '-h']) {
    const r = run(flag);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^Usage: bragdoc/);
    assert.match(r.stdout, /2724/);
  }
});

test('usage errors exit 2 with the usage; nothing is created', () => {
  for (const args of [['frobnicate'], ['--nope'], ['serve', 'extra'], ['serve', '--dry-run'], ['service'], ['service', 'frobnicate'], ['service', 'install', '--nope'], ['service', 'status', '--port', '1'], ['guide', 'extra'], ['serve', '--port', 'abc'], ['serve', '--port'], ['serve', '--port='], ['serve', '--data-dir='], ['serve', '--host=']]) {
    const r = run(...args);
    assert.equal(r.status, 2, `${args.join(' ')}: ${r.stderr}`);
    assert.match(r.stderr, /Usage: bragdoc/);
  }
  assert.equal(fs.existsSync(h.dataDir), false);
});

test('--help lists every command', () => {
  const r = run('--help');
  for (const c of ['serve', '--open', 'service install', '--dry-run', 'service status', 'service start | stop | restart', 'service logs', 'service uninstall', 'guide'])
    assert.ok(r.stdout.includes(c), c);
});

test('service install from a checkout refuses (a unit runs the built CLI) before touching the service manager', () => {
  const r = run('service', 'install', '--dry-run');
  if (process.platform === 'win32') return assert.match(r.stderr, /Windows yet/);
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stderr, /npm run build/);
});

test('a non-loopback --host is refused (exit 1) without the dangerous opt-in', () => {
  const r = run('serve', '--host', '0.0.0.0', '--port', '0');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /BRAGDOC_DANGEROUSLY_ALLOW_OPEN/);
});

/**
 * Start `bragdoc serve …` and wait for its "BragDoc on <url>" line. Rejects, with everything the child printed, if it
 * exits first or hasn't said anything within `ms`: a hung child fails this test, not the whole CI job's timeout.
 */
function startServe(args: string[], ms = 15_000): { child: ReturnType<typeof spawn>; ready: Promise<string> } {
  const child = spawn(process.execPath, [...CLI, 'serve', ...args], { cwd: ROOT, env: h.env });
  const ready = new Promise<string>((resolve, reject) => {
    let out = '';
    const timer = setTimeout(() => reject(new Error(`no "BragDoc on" line after ${ms} ms; output so far: ${JSON.stringify(out)}`)), ms);
    child.stdout!.on('data', (d) => {
      out += d;
      const m = /^BragDoc on (http:\/\/\S+)\n/.exec(out);
      if (m) {
        clearTimeout(timer);
        resolve(m[1]!);
      }
    });
    child.stderr!.on('data', (d) => (out += d));
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`exited ${code} before listening: ${JSON.stringify(out)}`));
    });
  });
  return { child, ready };
}

test('--host [::1] binds the IPv6 loopback, or fails to bind cleanly where there is none', async () => {
  const { child, ready } = startServe(['--host', '[::1]', '--port', '0']);
  try {
    assert.match(await ready, /^http:\/\/localhost:\d+$/);
  } catch (e) {
    // a machine without IPv6 can't bind ::1: that must be a clean exit, not a hang, and never the brackets' ENOTFOUND
    const msg = (e as Error).message;
    assert.match(msg, /^exited 1 before listening/, msg);
    assert.doesNotMatch(msg, /ENOTFOUND/);
  } finally {
    await stopChild(child);
  }
});

test('serve prints "BragDoc on <url>" first, then answers /api/health; a taken port is an error, not a new port', async () => {
  const { child, ready } = startServe(['--port', '0', '--data-dir', h.dataDir]);
  try {
    const url = await ready;
    assert.match(url, /^http:\/\/localhost:\d+$/);
    const port = new URL(url).port;
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.deepEqual(await res.json(), { ok: true, version: VERSION });

    const taken = run('serve', '--port', port);
    assert.equal(taken.status, 1);
    assert.match(taken.stderr, new RegExp(`port ${port} is already in use by BragDoc ${VERSION.replace(/\./g, '\\.')}`));
    assert.match(taken.stderr, /--port <n>/);
    assert.equal(taken.stderr.trim().split('\n').length, 1, 'exactly one line');
    assert.equal(taken.stdout, '', 'never "BragDoc on" another port');
  } finally {
    await stopChild(child);
  }
});

test("a port held by something that isn't BragDoc: one clear error, exit 1, never another port", async () => {
  const other = net.createServer((s) => s.end('HTTP/1.1 200 OK\r\ncontent-length: 2\r\n\r\nhi')).listen(0, '127.0.0.1');
  await new Promise((r) => other.once('listening', r));
  try {
    const port = (other.address() as net.AddressInfo).port;
    // spawn, not spawnSync: this process has to keep answering on `other` while the CLI probes it
    const child = spawn(process.execPath, [...CLI, 'serve', '--port', String(port)], { cwd: ROOT, env: h.env });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    const code = await new Promise((r) => child.on('exit', r));
    assert.equal(code, 1);
    assert.equal(out, '');
    assert.equal(err, `bragdoc: port ${port} is already in use by something that isn't BragDoc; pick another with --port <n>\n`);
  } finally {
    other.close();
  }
});

test('guide is there (a placeholder until the MCP server arrives)', () => {
  const r = run('guide');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /coding agents/);
});

test('a TCP listener that is not HTTP still counts as taken (the probe falls back to a plain connect)', async () => {
  const { probeHealth } = await import('../server/commands/ready.ts');
  const raw = net.createServer((s) => s.destroy()).listen(0, '127.0.0.1');
  await new Promise((r) => raw.once('listening', r));
  try {
    assert.deepEqual(await probeHealth((raw.address() as net.AddressInfo).port), { kind: 'other' });
  } finally {
    raw.close();
  }
  const free = net.createServer().listen(0, '127.0.0.1');
  await new Promise((r) => free.once('listening', r));
  const port = (free.address() as net.AddressInfo).port;
  await new Promise((r) => free.close(r));
  assert.deepEqual(await probeHealth(port), { kind: 'none' });
});

test('serve exits 0 on SIGTERM (a clean stop; the service is restarted after it anyway)', async () => {
  const { child, ready } = startServe(['--port', '0']);
  await ready;
  const code = await new Promise((r) => {
    child.once('exit', (c, sig) => r(c ?? sig));
    child.kill('SIGTERM');
  });
  assert.equal(code, 0);
});
