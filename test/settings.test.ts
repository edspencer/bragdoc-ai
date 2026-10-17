// Settings' server side (SPEC R13): config.yaml edits that keep comments and never overwrite a broken file, the MCP
// token (copy, rotate), the Problems list and its live event, the backups list, and the egress guard check.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { BackupsResponse, GuardCheckResponse, McpTokenResponse, NetworkLogResponse, ProblemsResponse, ServerEvent, SettingsResponse } from '../shared/api.ts';
import { CONFIG_TEMPLATE, ConfigStore, ConfigWriteError } from '../server/config.ts';
import { Egress } from '../server/egress.ts';
import { EventBus } from '../server/events.ts';
import { initHome } from '../server/home.ts';
import { createApp } from '../server/index.ts';
import { GUARD_CHECK_HOST } from '../server/routes/network.ts';
import { snapshotTime } from '../server/routes/settings.ts';
import { openStore } from '../server/store/index.ts';
import { Runtime, readRuntime } from '../server/runtime.ts';
import { rmTmp, tmpDir } from './fixture.ts';

function withHome(fn: (dir: string) => void | Promise<void>) {
  return async () => {
    const root = tmpDir('bragdoc-settings-');
    const dir = path.join(root, '.bragdoc');
    try {
      initHome(dir);
      await fn(dir);
    } finally {
      rmTmp(root);
    }
  };
}

const json = (body: unknown): RequestInit => ({ method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const post: RequestInit = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' };

describe('config.yaml edits from Settings', () => {
  test('a change keeps every comment, key order and unknown key, and is in force at once', withHome((dir) => {
    const file = path.join(dir, 'config.yaml');
    fs.writeFileSync(file, `${CONFIG_TEMPLATE}\n# my own note\nfuture: { thing: 1 }\n`);
    let changed = 0;
    const config = new ConfigStore(dir, { onChange: () => changed++ });
    config.load();
    const after = config.update({ mcp: { writeTo: 'found' } });
    assert.equal(after.mcp.writeTo, 'found');
    assert.equal(config.get().mcp.writeTo, 'found');
    assert.equal(changed, 1);
    const text = fs.readFileSync(file, 'utf8');
    assert.equal(text, `${CONFIG_TEMPLATE.replace('writeTo: board   #', 'writeTo: found   #')}\n# my own note\nfuture: { thing: 1 }\n`);
  }));

  test('a key that is missing, or written in flow style, is added or changed too', withHome((dir) => {
    const file = path.join(dir, 'config.yaml');
    const config = new ConfigStore(dir);
    fs.writeFileSync(file, '# mine\nallowedHosts: []\n');
    config.update({ mcp: { writeTo: 'found' } });
    assert.equal(fs.readFileSync(file, 'utf8'), '# mine\nallowedHosts: []\nmcp:\n  writeTo: found\n');
    fs.writeFileSync(file, 'mcp: { writeTo: found } # flow\n');
    config.update({ mcp: { writeTo: 'board' } });
    assert.equal(fs.readFileSync(file, 'utf8'), 'mcp: { writeTo: board } # flow\n');
    assert.equal(config.get().mcp.writeTo, 'board');
  }));

  test('an empty section (`mcp:` with its keys commented out) is the defaults, and can be set', withHome((dir) => {
    const file = path.join(dir, 'config.yaml');
    fs.writeFileSync(file, 'mcp:\n  # writeTo: found\n');
    const config = new ConfigStore(dir);
    assert.equal(config.get().mcp.writeTo, 'board');
    assert.deepEqual(config.notices(), []);
    config.update({ mcp: { writeTo: 'found' } });
    assert.equal(config.get().mcp.writeTo, 'found');
  }));

  test('a symlinked config.yaml stays a symlink, and a mode you chose is kept', { skip: process.platform === 'win32' }, withHome((dir) => {
    const real = path.join(path.dirname(dir), 'dotfiles-config.yaml');
    fs.renameSync(path.join(dir, 'config.yaml'), real);
    fs.chmodSync(real, 0o600);
    fs.symlinkSync(real, path.join(dir, 'config.yaml'));
    new ConfigStore(dir).update({ mcp: { writeTo: 'found' } });
    assert.ok(fs.lstatSync(path.join(dir, 'config.yaml')).isSymbolicLink());
    assert.match(fs.readFileSync(real, 'utf8'), /writeTo: found/);
    assert.equal(fs.statSync(real).mode & 0o777, 0o600);
  }));

  test('an anchored value is never spliced: an alias to it keeps its own value', withHome((dir) => {
    const file = path.join(dir, 'config.yaml');
    fs.writeFileSync(file, 'mcp:\n  writeTo: &w board\nx-mine: *w\n');
    const config = new ConfigStore(dir);
    config.update({ mcp: { writeTo: 'found' } });
    assert.equal(config.get().mcp.writeTo, 'found');
    const text = fs.readFileSync(file, 'utf8');
    assert.match(text, /x-mine: (?:\*w|board)/);
    assert.doesNotMatch(text, /x-mine: found/);
  }));

  test('a broken config.yaml is never overwritten; the change is refused and nothing is written', withHome((dir) => {
    const file = path.join(dir, 'config.yaml');
    for (const broken of ['mcp: [unclosed\n', 'mcp: { writeTo: sideways }\n', 'schemaVersion: 9\n']) {
      fs.writeFileSync(file, broken);
      const config = new ConfigStore(dir);
      assert.throws(() => config.update({ mcp: { writeTo: 'found' } }), ConfigWriteError, broken);
      assert.equal(fs.readFileSync(file, 'utf8'), broken, 'untouched');
    }
  }));

  test('a missing config.yaml starts from the starter template', withHome((dir) => {
    const file = path.join(dir, 'config.yaml');
    fs.rmSync(file);
    new ConfigStore(dir).update({ mcp: { writeTo: 'found' } });
    assert.match(fs.readFileSync(file, 'utf8'), /^# BragDoc settings/);
    assert.match(fs.readFileSync(file, 'utf8'), /writeTo: found/);
  }));

  test('a change that would not validate is refused', withHome((dir) => {
    const config = new ConfigStore(dir);
    assert.throws(() => config.update({ mcp: { writeTo: 'sideways' } }), ConfigWriteError);
    assert.equal(fs.readFileSync(path.join(dir, 'config.yaml'), 'utf8'), CONFIG_TEMPLATE);
  }));
});

describe('the settings API', () => {
  test('GET /api/settings and PUT /api/settings/mcp; a bad body is 400, a broken file 409', withHome(async (dir) => {
    const events: ServerEvent[] = [];
    const bus = new EventBus();
    bus.subscribe((e) => events.push(e));
    const config = new ConfigStore(dir, { onChange: () => bus.emit({ type: 'config' }) });
    config.load();
    const app = createApp({ dataDir: dir, webDist: null, config, bus });
    assert.deepEqual(await (await app.request('/api/settings')).json(), { mcp: { writeTo: 'board' }, sources: { github: { enabled: false, auth: 'gh' } } } satisfies SettingsResponse);

    const res = await app.request('/api/settings/mcp', json({ writeTo: 'found' }));
    assert.equal(res.status, 200);
    assert.equal(((await res.json()) as SettingsResponse).mcp.writeTo, 'found');
    assert.deepEqual(events, [{ type: 'config' }], 'other tabs hear about it');

    for (const bad of [{}, { writeTo: 'nowhere' }, { writeTo: 'found', extra: 1 }]) assert.equal((await app.request('/api/settings/mcp', json(bad))).status, 400, JSON.stringify(bad));

    fs.writeFileSync(path.join(dir, 'config.yaml'), 'mcp: [broken\n');
    const refused = await app.request('/api/settings/mcp', json({ writeTo: 'board' }));
    assert.equal(refused.status, 409);
    assert.match(((await refused.json()) as { error: { message: string } }).error.message, /won't overwrite it/);
    assert.equal(fs.readFileSync(path.join(dir, 'config.yaml'), 'utf8'), 'mcp: [broken\n');
  }));

  test('the MCP token: copy it, rotate it; the old one is gone at once, from runtime.json too', withHome(async (dir) => {
    const runtime = new Runtime(dir);
    runtime.write({ pid: process.pid, port: 2724, url: 'http://localhost:2724', version: '0.0.0', startedAt: new Date().toISOString() });
    const events: ServerEvent[] = [];
    const bus = new EventBus();
    bus.subscribe((e) => events.push(e));
    const app = createApp({ dataDir: dir, webDist: null, runtime, bus });
    const res = await app.request('/api/mcp/token');
    assert.equal(res.headers.get('cache-control'), 'no-store');
    const first = (await res.json()) as McpTokenResponse;
    assert.deepEqual(first, { token: runtime.mcpToken(), url: 'http://localhost:2724/mcp' });

    assert.equal((await app.request('/api/mcp/token/rotate')).status, 404, 'rotating is a POST');
    const rotated = (await (await app.request('/api/mcp/token/rotate', post)).json()) as McpTokenResponse;
    assert.notEqual(rotated.token, first.token);
    assert.equal(runtime.mcpToken(), rotated.token);
    assert.equal(readRuntime(dir)!.mcpToken, rotated.token, 'what `bragdoc mcp` and installed clients read');
    assert.deepEqual(events.filter((e) => e.type !== 'config'), [{ type: 'mcp-token' }]);
    assert.equal(((await (await app.request('/api/mcp/token')).json()) as McpTokenResponse).token, rotated.token);
  }));

  test('the token is refused to a cross-site page and to a foreign Host', withHome(async (dir) => {
    const app = createApp({ dataDir: dir, webDist: null });
    assert.equal((await app.request('/api/mcp/token', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
    assert.equal((await app.request('http://evil.example/api/mcp/token')).status, 403);
    assert.equal((await app.request('/api/mcp/token/rotate', { ...post, headers: { ...post.headers, Origin: 'https://evil.example' } })).status, 403);
  }));

  test('GET /api/backups: snapshots newest first, with times from their names', withHome(async (dir) => {
    for (const n of ['2026-10-16T08-00-00Z', '2026-10-17T09-30-00Z', '2026-10-17T09-30-00Z-2', 'not-a-snapshot']) fs.mkdirSync(path.join(dir, 'backups', n));
    const app = createApp({ dataDir: dir, webDist: null });
    const b = (await (await app.request('/api/backups')).json()) as BackupsResponse;
    assert.deepEqual(b.snapshots.map((s) => s.name), ['2026-10-17T09-30-00Z-2', '2026-10-17T09-30-00Z', '2026-10-16T08-00-00Z']);
    assert.equal(b.snapshots[2]!.at, '2026-10-16T08:00:00Z');
    assert.match(b.dirDisplay, /backups$/);
    assert.ok(b.keepRecent > 0 && b.keepDays > 0);
    assert.equal(snapshotTime('2026-10-17T09-30-00Z-2'), '2026-10-17T09:30:00Z');
  }));

  test('no backups yet is an empty list, not an error', withHome(async (dir) => {
    fs.rmSync(path.join(dir, 'backups'), { recursive: true });
    const app = createApp({ dataDir: dir, webDist: null });
    assert.deepEqual(((await (await app.request('/api/backups')).json()) as BackupsResponse).snapshots, []);
  }));
});

describe('Problems', () => {
  test('GET /api/problems lists broken files, and a `problems` event follows a break, a fix and a stray file', withHome(async (dir) => {
    const events: ServerEvent[] = [];
    const bus = new EventBus();
    bus.subscribe((e) => events.push(e));
    const store = openStore(dir);
    const app = createApp({ dataDir: dir, webDist: null, bus, store });
    const get = async () => ((await (await app.request('/api/problems')).json()) as ProblemsResponse).problems;
    assert.deepEqual(await get(), []);

    const settle = () => new Promise((r) => setTimeout(r, 250)); // the route debounces bursts (150 ms)
    const n = () => events.filter((e) => e.type === 'problems').length;

    // what the watcher does on a hand edit: the file changes, then the store re-reads that path
    const file = path.join(dir, 'projects', '01JABCDEFGHJKMNPQRSTVWXYZ0.yaml');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'name: [unclosed\n');
    store.reloadPath(file);
    await settle();
    assert.equal(n(), 1, 'a break is pushed');
    const broken = await get();
    assert.equal(broken.length, 1);
    assert.equal(broken[0]!.file, 'projects/01JABCDEFGHJKMNPQRSTVWXYZ0.yaml');
    assert.equal(broken[0]!.severity, 'error');
    assert.equal(broken[0]!.code, 'syntax');

    store.reloadPath(file); // the same bytes again: no change, no push
    await settle();
    assert.equal(n(), 1);

    fs.writeFileSync(file, 'schemaVersion: 1\nid: 01JABCDEFGHJKMNPQRSTVWXYZ0\nname: Fixed\ncolor: "#3b6cf6"\nstart: 2026-01-01\n');
    store.reloadPath(file);
    await settle();
    assert.equal(n(), 2, 'a fix is pushed');
    assert.deepEqual(await get(), []);

    const stray = path.join(dir, 'projects', 'notes.yml'); // a misnamed file: a Problem with no entity behind it
    fs.writeFileSync(stray, 'x: 1\n');
    store.reloadPath(stray);
    await settle();
    assert.equal(n(), 3, 'a stray file is pushed');
    assert.equal((await get())[0]!.code, 'stray');
  }));
});

describe('the new writes keep the security rules', () => {
  test('a CORS-safelisted content type is 415 and a foreign Origin 403, on every Settings write', withHome(async (dir) => {
    const app = createApp({ dataDir: dir, webDist: null });
    for (const [p, method] of [['/api/settings/mcp', 'PUT'], ['/api/network-log/guard-check', 'POST'], ['/api/mcp/token/rotate', 'POST']] as const) {
      assert.equal((await app.request(p, { method, headers: { 'Content-Type': 'text/plain' }, body: '{"writeTo":"found"}' })).status, 415, p);
      assert.equal((await app.request(p, { method, headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' }, body: '{"writeTo":"found"}' })).status, 403, p);
    }
    assert.match(fs.readFileSync(path.join(dir, 'config.yaml'), 'utf8'), /writeTo: board/, 'nothing changed');
  }));
});

describe('the egress guard check', () => {
  test('a guard that let the request through is reported as broken, whichever way it failed', withHome(async (dir) => {
    const config = new ConfigStore(dir);
    for (const fetchImpl of [async () => new Response('hi'), async (): Promise<Response> => Promise.reject(new Error('ENOTFOUND'))]) {
      // an allow-list that (wrongly) includes the host: what a broken guard would look like
      const egress = new Egress({ dataDir: dir, config: () => config.get(), fetchImpl });
      (egress as unknown as { allowList: () => string[] }).allowList = () => [GUARD_CHECK_HOST];
      const app = createApp({ dataDir: dir, webDist: null, config, egress });
      const r = (await (await app.request('/api/network-log/guard-check', post)).json()) as GuardCheckResponse;
      assert.equal(r.refused, false);
      assert.match(r.message, /not refused/);
    }
  }));

  test('a request to a .invalid host is refused before anything is sent, and the refusal is logged', withHome(async (dir) => {
    let sent = 0;
    const events: ServerEvent[] = [];
    const bus = new EventBus();
    bus.subscribe((e) => events.push(e));
    const config = new ConfigStore(dir);
    const egress = new Egress({
      dataDir: dir,
      config: () => config.get(),
      onLog: () => bus.emit({ type: 'network' }),
      fetchImpl: async () => {
        sent++;
        return new Response('');
      },
    });
    const app = createApp({ dataDir: dir, webDist: null, config, bus, egress });
    const res = (await (await app.request('/api/network-log/guard-check', post)).json()) as GuardCheckResponse;
    assert.equal(res.refused, true);
    assert.equal(res.host, GUARD_CHECK_HOST);
    assert.match(res.message, /isn't on the allow-list/);
    assert.equal(sent, 0, 'nothing reached the network');
    assert.deepEqual(events, [{ type: 'network' }]);
    const log = (await (await app.request('/api/network-log')).json()) as NetworkLogResponse;
    assert.equal(log.total, 1);
    assert.equal(log.entries[0]!.outcome, 'denied');
    assert.equal(log.entries[0]!.purpose, 'settings.guard-check');
    assert.equal((await app.request('/api/network-log/guard-check')).status, 404, 'a POST only');
  }));
});
