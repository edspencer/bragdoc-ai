// proc.ts's launch() and runAttached()'s signal forwarding (D32), the service runner's adapters over them, and
// egress.ts's loopback-only readiness probe (D47). Every program run here is a fake on a throwaway PATH.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { loopbackAccepts, probeLoopback } from '../server/egress.ts';
import { defaultRunner, defaultStreamer } from '../server/platform/runner.ts';
import { ProcError, launch, runAttached } from '../server/proc.ts';
import { rmTmp, tmpDir } from './fixture.ts';

const posix = process.platform !== 'win32';
let bin: string;
let env: NodeJS.ProcessEnv;
before(() => {
  bin = tmpDir('bragdoc-fakebin-');
  env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` };
});
after(() => rmTmp(bin));

function fake(name: string, script: string): void {
  fs.writeFileSync(path.join(bin, name), `#!/bin/sh\n${script}\n`, { mode: 0o755 });
}

async function until(check: () => boolean, ms = 5000): Promise<void> {
  const deadline = Date.now() + ms;
  while (!check()) {
    if (Date.now() > deadline) throw new Error(`not after ${ms} ms`);
    await new Promise((r) => setTimeout(r, 20));
  }
}

const read = (f: string) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');

describe('launch', { skip: !posix }, () => {
  test("starts the program and doesn't wait for it: detached, in its own process group", async () => {
    const mark = path.join(bin, 'opened');
    // pauses before it writes, so a launch() that waited for it would be seen to
    // (its process group from /proc where there is one: not every Linux box has ps)
    fake('xdg-open', `sleep 1.5\npgid=$( [ -r /proc/$$/stat ] && cut -d' ' -f5 /proc/$$/stat || ps -o pgid= -p $$ )\necho "$$ $pgid $*" > "${mark}"`);
    const t0 = Date.now();
    await launch('xdg-open', ['http://localhost:2724'], { env });
    assert.ok(Date.now() - t0 < 1000, 'resolved once started, not when it finished');
    assert.equal(read(mark), '', 'still running');
    await until(() => read(mark).endsWith('\n'));
    const [pid, pgid, ...args] = read(mark).trim().split(/\s+/);
    assert.equal(pgid, pid, 'its own process group: a Ctrl-C to bragdoc never reaches the browser');
    assert.deepEqual(args, ['http://localhost:2724']);
  });

  test('refuses what proc refuses, and rejects for a program that is not there', async () => {
    await assert.rejects(launch('firefox' as 'open', ['x'], { env }), (e: Error) => e instanceof ProcError && e.code === 'not_allowed');
    await assert.rejects(launch('open', ['a\0b'], { env }), (e: Error) => e instanceof ProcError && e.code === 'not_allowed');
    await assert.rejects(launch('open', ['x'], { env: { PATH: '/nonexistent' } }), (e: Error) => e instanceof ProcError && e.code === 'not_found');
  });
});

describe('runAttached', { skip: !posix }, () => {
  for (const sig of ['SIGTERM', 'SIGHUP', 'SIGINT'] as const) {
    test(`forwards ${sig} sent to bragdoc to the child, and the run ends when the child does`, async () => {
      const mark = path.join(bin, `trapped-${sig}`);
      const name = sig.slice(3);
      // a stand-in for `journalctl -f`: runs until signalled, says which signal it got, exits 0
      fake('journalctl', `trap 'echo ${name} > "${mark}"; exit 0' ${name}\necho up > "${mark}.up"\nwhile :; do sleep 0.05; done`);
      const before = process.listenerCount(sig);
      const run = runAttached('journalctl', ['-f'], { env });
      await until(() => fs.existsSync(`${mark}.up`));
      assert.equal(process.listenerCount(sig), before + 1, 'listening while the child runs');
      // the real thing, to this very process: without the forwarding listener, the signal would end this test run
      process.kill(process.pid, sig);
      assert.equal(await run, 0);
      assert.equal(read(mark).trim(), name);
      assert.equal(process.listenerCount(sig), before, 'and not after');
    });
  }

  test('a child killed by a signal resolves 128 + its number; a missing one rejects not_found', async () => {
    const listening = process.listenerCount('SIGTERM');
    fake('journalctl', 'kill -TERM $$');
    assert.equal(await runAttached('journalctl', [], { env }), 128 + 15);
    await assert.rejects(runAttached('journalctl', [], { env: { PATH: '/nonexistent' } }), (e: Error) => e instanceof ProcError && e.code === 'not_found');
    assert.equal(process.listenerCount('SIGTERM'), listening);
  });
});

describe("the service runner's defaults are proc.ts", { skip: !posix }, () => {
  test('an exit code comes back; a stop by signal is 0; a program that is not installed is 127', async () => {
    const PATH = process.env.PATH;
    try {
      fake('systemctl', 'echo "$*"; echo warn >&2; exit 4');
      process.env.PATH = env.PATH;
      assert.deepEqual(await defaultRunner('systemctl', ['--user', 'is-active']), { code: 4, stdout: '--user is-active\n', stderr: 'warn\n' });
      fake('journalctl', 'exit 2');
      assert.equal(await defaultStreamer('journalctl', []), 2);
      // stopped by a signal (its own, or one bragdoc forwarded): a clean stop, as before the move onto proc.ts
      fake('journalctl', 'kill -TERM $$');
      assert.equal(await defaultStreamer('journalctl', []), 0);
      process.env.PATH = '/nonexistent';
      assert.deepEqual(await defaultRunner('launchctl', ['print']), { code: 127, stdout: '', stderr: 'launchctl: command not found' });
      assert.equal(await defaultStreamer('journalctl', ['-f']), 127);
    } finally {
      process.env.PATH = PATH;
    }
  });
});

describe('the loopback probe', () => {
  const listen = (s: net.Server) => new Promise<number>((r) => s.listen(0, '127.0.0.1', () => r((s.address() as net.AddressInfo).port)));
  const freePort = async () => {
    const s = net.createServer();
    const port = await listen(s);
    await new Promise((r) => s.close(r));
    return port;
  };

  test('asks 127.0.0.1, never follows a redirect, and only takes a port and a path', async () => {
    const seen: string[] = [];
    const s = http.createServer((req, res) => {
      seen.push(`${req.headers.host} ${req.url}`);
      if (req.url === '/away') res.writeHead(302, { location: 'http://example.com/' }).end();
      else res.writeHead(200, { 'content-type': 'application/json' }).end('{"ok":true}');
    });
    const port = await listen(s);
    try {
      const res = await probeLoopback(port, '/api/health', 1000);
      assert.deepEqual(await res.json(), { ok: true });
      assert.equal((await probeLoopback(port, '/away', 1000)).status, 302);
      assert.deepEqual(seen, [`127.0.0.1:${port} /api/health`, `127.0.0.1:${port} /away`]);
      for (const p of [0, -1, 65536, 1.5, Number.NaN]) await assert.rejects(probeLoopback(p, '/', 100), RangeError, String(p));
      // `//host/x` and `@host/x` would change the URL's host; neither is a path
      for (const p of ['', 'api', '//example.com/', '@example.com/']) await assert.rejects(probeLoopback(port, p, 100), RangeError, p);
      await assert.rejects(loopbackAccepts(70000, 100), RangeError);
    } finally {
      s.close();
    }
  });

  test('a closed port is refused; an open one accepts, HTTP or not', async () => {
    const port = await freePort();
    await assert.rejects(probeLoopback(port, '/api/health', 1000));
    assert.equal(await loopbackAccepts(port, 1000), false);
    const raw = net.createServer((c) => c.destroy());
    const open = await listen(raw);
    try {
      assert.equal(await loopbackAccepts(open, 1000), true);
    } finally {
      raw.close();
    }
  });
});
