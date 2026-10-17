// The CLI as a user runs it: a child process from source (tsx), with a throwaway HOME and BRAGDOC_HOME.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
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
  for (const args of [['frobnicate'], ['--nope'], ['serve', 'extra'], ['serve', '--port', 'abc'], ['serve', '--port']]) {
    const r = run(...args);
    assert.equal(r.status, 2, `${args.join(' ')}: ${r.stderr}`);
    assert.match(r.stderr, /Usage: bragdoc/);
  }
  assert.equal(fs.existsSync(h.dataDir), false);
});

test('a non-loopback --host is refused (exit 1) without the dangerous opt-in', () => {
  const r = run('serve', '--host', '0.0.0.0', '--port', '0');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /BRAGDOC_DANGEROUSLY_ALLOW_OPEN/);
});

test('serve prints "BragDoc on <url>" first, then answers /api/health; a taken port is an error, not a new port', async () => {
  const child = spawn(process.execPath, [...CLI, 'serve', '--port', '0', '--data-dir', h.dataDir], { cwd: ROOT, env: h.env });
  try {
    const url = await new Promise<string>((resolve, reject) => {
      let out = '';
      child.stdout.on('data', (d) => {
        out += d;
        const m = /^BragDoc on (http:\/\/localhost:(\d+))\n/.exec(out);
        if (m) resolve(m[1]!);
      });
      child.on('exit', (code) => reject(new Error(`exited ${code}: ${out}`)));
    });
    const port = new URL(url).port;
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.deepEqual(await res.json(), { ok: true, version: VERSION });

    const taken = run('serve', '--port', port);
    assert.equal(taken.status, 1);
    assert.match(taken.stderr, new RegExp(`port ${port} is already in use`));
  } finally {
    await stopChild(child);
  }
});
