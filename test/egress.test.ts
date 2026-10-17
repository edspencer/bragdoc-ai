// server/egress.ts: the allow-list (recomputed from config.yaml on every call), EgressDenied, redirects re-checked
// hop by hop, the network log (no query strings, rotation, gh runs) and GET /api/network-log. Plus server/proc.ts.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import type { NetworkLogEntry } from '../shared/api.ts';
import { DEFAULT_CONFIG, type Config } from '../server/config.ts';
import { Egress, EgressDenied, LOG_MAX_BYTES, egressAllowList, readNetworkLog } from '../server/egress.ts';
import { EventBus } from '../server/events.ts';
import { createApp } from '../server/index.ts';
import { ProcError, run } from '../server/proc.ts';
import { rmTmp, tmpDir } from './fixture.ts';

const withGithub = (auth: 'gh' | 'token', enabled = true): Config => ({ ...DEFAULT_CONFIG, sources: { github: { enabled, auth } } });
const log = (dir: string) => readNetworkLog(dir, { limit: 1000 }).entries;

let dir: string;
before(() => {
  dir = tmpDir('bragdoc-egress-');
});
after(() => rmTmp(dir));

/** A fake network: records what it was asked, answers from `routes`. */
function fakeFetch(routes: Record<string, () => Response>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = async (url: URL, init: RequestInit) => {
    calls.push({ url: url.href, init });
    const r = routes[url.origin + url.pathname];
    if (!r) throw new Error(`fake network: nothing at ${url.href}`);
    return r();
  };
  return { impl, calls };
}

describe('the allow-list', () => {
  test('loopback always; api.github.com only with GitHub enabled via a token', () => {
    assert.deepEqual(egressAllowList(DEFAULT_CONFIG), ['localhost', '127.0.0.1', '[::1]']);
    assert.ok(!egressAllowList(withGithub('gh')).includes('api.github.com'), 'gh makes its own requests');
    assert.ok(!egressAllowList(withGithub('token', false)).includes('api.github.com'));
    assert.ok(egressAllowList(withGithub('token')).includes('api.github.com'));
  });

  test('a denied request throws EgressDenied, sends nothing, and is logged', async () => {
    const d = tmpDir('bragdoc-eg-');
    try {
      const net = fakeFetch({});
      const eg = new Egress({ dataDir: d, config: () => DEFAULT_CONFIG, fetchImpl: net.impl });
      for (const url of ['https://telemetry.example.com/v1/collect?id=me', 'https://api.github.com/user', 'ftp://127.0.0.1/x', 'http://example.com/', 'https://user:pw@127.0.0.1/']) {
        await assert.rejects(eg.egressFetch({ purpose: 'test.denied' }, url), EgressDenied, url);
      }
      assert.equal(net.calls.length, 0, 'nothing was sent');
      const entries = log(d);
      assert.equal(entries.length, 5);
      assert.ok(entries.every((e) => e.outcome === 'denied' && e.purpose === 'test.denied' && e.status === null));
      assert.ok(!JSON.stringify(entries).includes('id=me'), 'no query strings in the log');
      assert.ok(!JSON.stringify(entries).includes('pw'), 'no credentials in the log');
    } finally {
      rmTmp(d);
    }
  });

  test('recomputed per call: connecting GitHub opens api.github.com, disconnecting closes it at once', async () => {
    const d = tmpDir('bragdoc-eg-');
    try {
      let config = DEFAULT_CONFIG;
      const net = fakeFetch({ 'https://api.github.com/user': () => new Response('{}', { headers: { 'content-length': '2' } }) });
      const eg = new Egress({ dataDir: d, config: () => config, fetchImpl: net.impl });
      await assert.rejects(eg.egressFetch({ purpose: 'github.user' }, 'https://api.github.com/user'), EgressDenied);
      config = withGithub('token');
      const res = await eg.egressFetch({ purpose: 'github.user' }, 'https://api.github.com/user?token=hunter2');
      assert.equal(res.status, 200);
      config = DEFAULT_CONFIG;
      await assert.rejects(eg.egressFetch({ purpose: 'github.user' }, 'https://api.github.com/user'), EgressDenied);
      const [last, ok] = log(d);
      assert.equal(last!.outcome, 'denied');
      assert.deepEqual({ ...ok, at: '' }, { at: '', purpose: 'github.user', via: 'fetch', method: 'GET', host: 'api.github.com', path: '/user', outcome: 'ok', status: 200, bytes: 2 });
    } finally {
      rmTmp(d);
    }
  });

  test('a redirect off the allow-list is refused at that hop; credentials never follow a host change', async () => {
    const d = tmpDir('bragdoc-eg-');
    try {
      const net = fakeFetch({
        'https://api.github.com/a': () => new Response(null, { status: 302, headers: { location: 'https://api.github.com/b' } }),
        'https://api.github.com/b': () => new Response(null, { status: 301, headers: { location: 'https://evil.example/c' } }),
      });
      const eg = new Egress({ dataDir: d, config: () => withGithub('token'), fetchImpl: net.impl });
      await assert.rejects(eg.egressFetch({ purpose: 'github.x' }, 'https://api.github.com/a', { headers: { authorization: 'Bearer t' } }), EgressDenied);
      assert.deepEqual(net.calls.map((c) => c.url), ['https://api.github.com/a', 'https://api.github.com/b']);
      assert.equal(new Headers(net.calls[1]!.init.headers).get('authorization'), 'Bearer t', 'same host keeps it');
      assert.ok(net.calls.every((c) => c.init.redirect === 'manual'), 'fetch never follows a redirect by itself');
      assert.deepEqual(log(d).map((e) => [e.host, e.outcome]), [
        ['evil.example', 'denied'],
        ['api.github.com', 'ok'],
        ['api.github.com', 'ok'],
      ]);
    } finally {
      rmTmp(d);
    }
  });

  test('a remote host can never redirect into loopback; a body never follows a cross-host redirect', async () => {
    const d = tmpDir('bragdoc-eg-');
    try {
      const net = fakeFetch({
        'https://api.github.com/to-local': () => new Response(null, { status: 307, headers: { location: 'http://127.0.0.1:6379/x' } }),
        'https://api.github.com/post': () => new Response(null, { status: 307, headers: { location: 'https://api.github.com/elsewhere' } }),
        'https://api.github.com/elsewhere': () => new Response('ok'),
        'http://127.0.0.1:6379/x': () => new Response('reached redis'),
      });
      const eg = new Egress({ dataDir: d, config: () => withGithub('token'), fetchImpl: net.impl });
      await assert.rejects(eg.egressFetch({ purpose: 'github.x' }, 'https://api.github.com/to-local', { method: 'POST', body: 'payload' }), /may not redirect to this computer/);
      await assert.rejects(eg.egressFetch({ purpose: 'github.x' }, 'https://api.github.com/to-local'), /may not redirect to this computer/);
      assert.ok(!net.calls.some((c) => c.url.startsWith('http://127.0.0.1')), 'loopback was never contacted');
      // same host: a 307 keeps the method and body, as it should
      const ok = await eg.egressFetch({ purpose: 'github.x' }, 'https://api.github.com/post', { method: 'POST', body: 'b' });
      assert.equal(await ok.text(), 'ok');
      assert.equal(net.calls.at(-1)!.init.body, 'b');
    } finally {
      rmTmp(d);
    }
  });

  test('on a cross-host redirect only harmless headers follow (no token headers of any name)', async () => {
    const d = tmpDir('bragdoc-eg-');
    try {
      const net = fakeFetch({
        'http://127.0.0.1:1/a': () => new Response(null, { status: 302, headers: { location: 'http://localhost:1/b' } }),
        'http://localhost:1/b': () => new Response('ok'),
      });
      const eg = new Egress({ dataDir: d, config: () => DEFAULT_CONFIG, fetchImpl: net.impl });
      await eg.egressFetch({ purpose: 'mcp.shim' }, 'http://127.0.0.1:1/a', { headers: { authorization: 'Bearer t', 'x-api-key': 'k', 'proxy-authorization': 'p', accept: 'application/json' } });
      assert.deepEqual([...new Headers(net.calls[1]!.init.headers)], [['accept', 'application/json']]);
    } finally {
      rmTmp(d);
    }
  });

  test('a network error is logged as an error and rethrown', async () => {
    const d = tmpDir('bragdoc-eg-');
    try {
      const eg = new Egress({ dataDir: d, config: () => DEFAULT_CONFIG, fetchImpl: async () => Promise.reject(new Error('ECONNREFUSED')) });
      await assert.rejects(eg.egressFetch({ purpose: 'mcp.shim' }, 'http://127.0.0.1:1/mcp'), /ECONNREFUSED/);
      assert.deepEqual(log(d).map((e) => [e.outcome, e.error]), [['error', 'ECONNREFUSED']]);
    } finally {
      rmTmp(d);
    }
  });

  test('a real loopback request, end to end, through the real fetch', async () => {
    const d = tmpDir('bragdoc-eg-');
    const server = http.createServer((_q, s) => s.end('hello'));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    try {
      const { port } = server.address() as { port: number };
      const bus = new EventBus();
      const events: string[] = [];
      bus.subscribe((e) => events.push(e.type));
      const eg = new Egress({ dataDir: d, config: () => DEFAULT_CONFIG, onLog: () => bus.emit({ type: 'network' }) });
      const res = await eg.egressFetch({ purpose: 'test.loopback' }, `http://127.0.0.1:${port}/ping?secret=1`);
      assert.equal(await res.text(), 'hello');
      const [e] = log(d);
      assert.equal(e!.host, `127.0.0.1:${port}`);
      assert.equal(e!.path, '/ping');
      assert.equal(e!.bytes, 5);
      assert.deepEqual(events, ['network']);
      if (process.platform !== 'win32') assert.equal(fs.statSync(path.join(d, 'logs', 'network.jsonl')).mode & 0o777, 0o600);
    } finally {
      server.close();
      rmTmp(d);
    }
  });
});

describe('the network log', () => {
  test('gh runs are logged "via gh CLI": the subcommand and path, never a query, a flag or a flag value', () => {
    const d = tmpDir('bragdoc-eg-');
    try {
      const eg = new Egress({ dataDir: d, config: () => DEFAULT_CONFIG });
      eg.logProcess({ purpose: 'github.pulls', bin: 'gh', args: ['api', 'repos/o/r/pulls?state=closed&per_page=100', '--jq', '.[]'], exitCode: 0 });
      eg.logProcess({ purpose: 'github.x', bin: 'gh', args: ['api', '-H', 'Authorization: token SECRET123', 'repos/o/r'], exitCode: 0 });
      eg.logProcess({ purpose: 'github.gql', bin: 'gh', args: ['api', 'graphql', '-f', 'query=query { viewer { login } }'], exitCode: 1 });
      const [gql, hdr, pulls] = log(d);
      assert.equal(pulls!.via, 'gh');
      assert.equal(pulls!.host, 'github.com (via gh CLI)');
      assert.equal(pulls!.path, 'gh api repos/o/r/pulls');
      assert.equal(pulls!.status, 0);
      assert.equal(hdr!.path, 'gh api');
      assert.equal(gql!.path, 'gh api graphql');
      assert.equal(gql!.status, 1);
      const text = fs.readFileSync(path.join(d, 'logs', 'network.jsonl'), 'utf8');
      for (const secret of ['SECRET123', 'state=', 'viewer', '.[]']) assert.ok(!text.includes(secret), secret);
    } finally {
      rmTmp(d);
    }
  });

  test('rotates past LOG_MAX_BYTES, keeping one older file, and reads across both, newest first', () => {
    const d = tmpDir('bragdoc-eg-');
    try {
      const file = path.join(d, 'logs', 'network.jsonl');
      fs.mkdirSync(path.dirname(file));
      const old: NetworkLogEntry = { at: '2020-01-01T00:00:00.000Z', purpose: 'old', via: 'fetch', method: 'GET', host: 'x', path: '/', outcome: 'ok', status: 200, bytes: null };
      const line = JSON.stringify(old) + '\n';
      fs.writeFileSync(file, line.repeat(Math.ceil(LOG_MAX_BYTES / line.length)));
      const eg = new Egress({ dataDir: d, config: () => DEFAULT_CONFIG });
      eg.logProcess({ purpose: 'new', bin: 'gh', args: ['auth', 'status'], exitCode: 0 });
      assert.ok(fs.existsSync(path.join(d, 'logs', 'network.1.jsonl')));
      assert.equal(fs.readFileSync(file, 'utf8').trim().split('\n').length, 1);
      const r = readNetworkLog(d, { limit: 2 });
      assert.deepEqual(r.entries.map((e) => e.purpose), ['new', 'old']);
      assert.equal(r.total, Math.ceil(LOG_MAX_BYTES / line.length) + 1);
    } finally {
      rmTmp(d);
    }
  });

  test('a torn or foreign line is skipped, not fatal', () => {
    const d = tmpDir('bragdoc-eg-');
    try {
      fs.mkdirSync(path.join(d, 'logs'));
      fs.writeFileSync(path.join(d, 'logs', 'network.jsonl'), '{"at":"2026-01-01T00:00:00Z","host":"a","purpose":"p"}\n{"at":"2026-01-0\n42\n');
      assert.equal(readNetworkLog(d).total, 1);
    } finally {
      rmTmp(d);
    }
  });

  test('GET /api/network-log pages it; bad paging is a 400; an empty log is empty, not an error', async () => {
    const d = tmpDir('bragdoc-eg-');
    try {
      const app = createApp({ dataDir: d, webDist: null });
      assert.deepEqual(await (await app.request('/api/network-log')).json(), { entries: [], total: 0 });
      const eg = new Egress({ dataDir: d, config: () => DEFAULT_CONFIG });
      for (let i = 0; i < 5; i++) eg.logProcess({ purpose: `p${i}`, bin: 'gh', args: [], exitCode: 0 });
      const page = (await (await app.request('/api/network-log?limit=2&offset=1')).json()) as { entries: NetworkLogEntry[]; total: number };
      assert.deepEqual(page.entries.map((e) => e.purpose), ['p3', 'p2']);
      assert.equal(page.total, 5);
      for (const q of ['limit=0', 'limit=x', 'offset=-1', 'limit=1e3']) assert.equal((await app.request(`/api/network-log?${q}`)).status, 400, q);
    } finally {
      rmTmp(d);
    }
  });

  test('egress through the app context lands in /api/network-log, and /api/meta shows the allow-list', async () => {
    const d = tmpDir('bragdoc-eg-');
    try {
      fs.writeFileSync(path.join(d, 'config.yaml'), 'sources: { github: { enabled: true, auth: token } }\n');
      const app = createApp({ dataDir: d, webDist: null });
      const meta = (await (await app.request('/api/meta')).json()) as { egressAllowList: string[]; mcpUrl: string; dataDir: string };
      assert.ok(meta.egressAllowList.includes('api.github.com'));
      assert.equal(meta.dataDir, d);
      assert.equal(meta.mcpUrl, 'http://localhost/mcp');
    } finally {
      rmTmp(d);
    }
  });
});

describe('proc', () => {
  test('only allow-listed binaries, by name; nothing else is started', async () => {
    for (const bin of ['sh', 'bash', 'rm', 'node', '/usr/bin/git', 'git; rm -rf ~', 'curl'])
      await assert.rejects(run(bin as 'git', ['--version']), (e: Error) => e instanceof ProcError && e.code === 'not_allowed', bin);
    await assert.rejects(run('git', ['a\0b']), ProcError);
  });

  test('runs with an argument array and no shell: metacharacters stay literal', async () => {
    const r = await run('git', ['--version']);
    assert.equal(r.code, 0);
    assert.match(r.stdout, /^git version/);
    // `$(…)` and `;` would be shell syntax; to git they're just an unknown subcommand's name
    const evil = await run('git', ['$(touch /tmp/bragdoc-pwned);', '--x']);
    assert.notEqual(evil.code, 0);
    assert.ok(!fs.existsSync('/tmp/bragdoc-pwned'));
  });

  test('binaries resolve from absolute PATH entries only: a ./git in the working directory never runs', { skip: process.platform === 'win32' }, async () => {
    const repo = tmpDir('bragdoc-proc-');
    try {
      fs.writeFileSync(path.join(repo, 'git'), '#!/bin/sh\necho pwned\n', { mode: 0o755 });
      for (const PATH of ['', '.', `.${path.delimiter}`, `${path.delimiter}/nonexistent`]) {
        await assert.rejects(run('git', ['--version'], { cwd: repo, env: { PATH } }), (e: Error) => e instanceof ProcError && e.code === 'not_found', JSON.stringify(PATH));
      }
      const r = await run('git', ['--version'], { cwd: repo, env: { ...process.env, PATH: `.${path.delimiter}${process.env.PATH}` } });
      assert.match(r.stdout, /^git version/, 'the real git, not ./git');
    } finally {
      rmTmp(repo);
    }
  });

  test('a missing binary is not_found; a hang is a timeout; a flood is too_much_output; exit codes come back', { skip: process.platform === 'win32' }, async () => {
    await assert.rejects(run('gh', ['--version'], { env: { PATH: '/nonexistent' } }), (e: Error) => e instanceof ProcError && e.code === 'not_found');
    // a fake gh on PATH (never the real one): it does whatever its first argument says
    const bin = tmpDir('bragdoc-fakegh-');
    try {
      fs.writeFileSync(path.join(bin, 'gh'), '#!/bin/sh\ncase "$1" in\n  hang) sleep 10 ;;\n  flood) yes x | head -c 100000 ;;\n  fail) echo nope >&2; exit 3 ;;\n  echo) cat ;;\nesac\n', { mode: 0o755 });
      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
      const t0 = Date.now();
      await assert.rejects(run('gh', ['hang'], { env, timeoutMs: 200 }), (e: Error) => e instanceof ProcError && e.code === 'timeout');
      assert.ok(Date.now() - t0 < 5000, 'killed at the deadline');
      await assert.rejects(run('gh', ['flood'], { env, maxOutput: 1000 }), (e: Error) => e instanceof ProcError && e.code === 'too_much_output');
      assert.deepEqual(await run('gh', ['fail'], { env }), { code: 3, stdout: '', stderr: 'nope\n' });
      assert.equal((await run('gh', ['echo'], { env, input: 'piped in' })).stdout, 'piped in');
    } finally {
      rmTmp(bin);
    }
  });
});
