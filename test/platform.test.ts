// The platform's boot pieces: the bind guard, config.yaml (defaults, validation, the downgrade guard, live reload), the
// data home's layout and the old CLI's move-aside, and runtime.json (0600, a token that survives restarts).
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { evaluateBindSafety, isLoopbackHost } from '../server/bind-safety.ts';
import { CONFIG_TEMPLATE, ConfigFromTheFuture, ConfigStore, DEFAULT_CONFIG, normalizeHostname, parseConfig } from '../server/config.ts';
import { GITIGNORE, initHome } from '../server/home.ts';
import { createApp, startServer } from '../server/index.ts';
import { Runtime, constantTimeEqual, displayUrl, readRuntime } from '../server/runtime.ts';
import { rmTmp, tmpDir } from './fixture.ts';

const mode = (p: string) => fs.statSync(p).mode & 0o777;
const posix = process.platform !== 'win32';

function withDir(fn: (dir: string) => void | Promise<void>) {
  return async () => {
    const dir = tmpDir('bragdoc-plat-');
    try {
      await fn(dir);
    } finally {
      rmTmp(dir);
    }
  };
}

describe('the bind guard', () => {
  test('loopback in every form is allowed; every interface and LAN addresses are not', () => {
    for (const h of ['127.0.0.1', '127.1.2.3', 'localhost', 'LOCALHOST', '::1', '[::1]', '::ffff:127.0.0.1', ' 127.0.0.1 ']) assert.ok(isLoopbackHost(h), h);
    for (const h of ['0.0.0.0', '::', '[::]', '192.168.1.10', '10.0.0.1', 'example.com', '128.0.0.1', '::ffff:10.0.0.1']) assert.ok(!isLoopbackHost(h), h);
  });

  test('a non-loopback host is refused without the flag, warned about with it; only "1" counts', () => {
    assert.deepEqual(evaluateBindSafety('127.0.0.1', {}), { action: 'allow' });
    const refused = evaluateBindSafety('0.0.0.0', {});
    assert.equal(refused.action, 'refuse');
    assert.match((refused as { message: string }).message, /BRAGDOC_DANGEROUSLY_ALLOW_OPEN=1/);
    assert.equal(evaluateBindSafety('0.0.0.0', { BRAGDOC_DANGEROUSLY_ALLOW_OPEN: '1' }).action, 'warn');
    for (const v of ['true', 'yes', '0', '']) assert.equal(evaluateBindSafety('0.0.0.0', { BRAGDOC_DANGEROUSLY_ALLOW_OPEN: v }).action, 'refuse', v);
  });
});

describe('config.yaml', () => {
  test('missing, empty or the starter template all give the defaults', () => {
    for (const text of ['', '# just a comment\n', CONFIG_TEMPLATE]) {
      const r = parseConfig(text);
      assert.ok(r.ok, text);
      assert.deepEqual(r.config, { ...DEFAULT_CONFIG, schemaVersion: 1 });
    }
    assert.deepEqual(DEFAULT_CONFIG.allowedHosts, []);
    assert.equal(DEFAULT_CONFIG.mcp.writeTo, 'board');
    assert.equal(DEFAULT_CONFIG.sources.github.enabled, false);
  });

  test('a config from the future, or with an unreadable schemaVersion, refuses to boot', withDir((dir) => {
    for (const v of ['2', '99', '"banana"', '1.5', '0', '-1', '[1]']) {
      fs.writeFileSync(path.join(dir, 'config.yaml'), `schemaVersion: ${v}\nallowedHosts: []\n`);
      const r = parseConfig(fs.readFileSync(path.join(dir, 'config.yaml'), 'utf8'));
      assert.ok(!r.ok && r.future, v);
      assert.throws(() => new ConfigStore(dir).load(), (e: Error) => e instanceof ConfigFromTheFuture && /newer BragDoc/.test(e.message), v);
    }
    // a string spelling a supported version is fine (YAML quoting is easy to get wrong by hand)
    assert.ok(parseConfig('schemaVersion: "1"\n').ok);
  }));

  test('startServer refuses a config from the future, and touches nothing', withDir(async (dir) => {
    fs.writeFileSync(path.join(dir, 'config.yaml'), 'schemaVersion: 2\n');
    await assert.rejects(startServer(0, { dataDir: dir, webDist: null }), ConfigFromTheFuture);
    assert.deepEqual(fs.readdirSync(dir), ['config.yaml']);
    assert.equal(fs.readFileSync(path.join(dir, 'config.yaml'), 'utf8'), 'schemaVersion: 2\n');
  }));

  test('an invalid file is a notice, never a crash; the last good settings stay', withDir((dir) => {
    const file = path.join(dir, 'config.yaml');
    fs.writeFileSync(file, 'allowedHosts: [a.example]\n');
    const store = new ConfigStore(dir);
    assert.deepEqual(store.load().allowedHosts, ['a.example']);
    for (const bad of ['allowedHosts: nope\n', 'mcp: { writeTo: sideways }\n', ': : :\n  - [', '- a list\n']) {
      fs.writeFileSync(file, bad);
      bumpMtime(file);
      assert.deepEqual(store.get().allowedHosts, ['a.example'], bad);
      const [n] = store.notices();
      assert.equal(n?.id, 'config-invalid', bad);
      assert.equal(n?.level, 'warning');
      assert.match(n!.message, /\. BragDoc is using the last settings/, 'two sentences, not one run-on');
    }
    fs.writeFileSync(file, 'allowedHosts: [b.example]\n');
    bumpMtime(file);
    assert.deepEqual(store.get().allowedHosts, ['b.example']);
    assert.deepEqual(store.notices(), []);
  }));

  test('a future version written while running is a notice, not a crash', withDir((dir) => {
    const file = path.join(dir, 'config.yaml');
    fs.writeFileSync(file, 'allowedHosts: [a.example]\n');
    const store = new ConfigStore(dir);
    store.load();
    fs.writeFileSync(file, 'schemaVersion: 7\nallowedHosts: [b.example]\n');
    bumpMtime(file);
    assert.deepEqual(store.get().allowedHosts, ['a.example']);
    assert.match(store.notices()[0]!.message, /newer BragDoc/);
  }));

  test('a config.yaml that becomes unreadable while running is a notice, not a 500 on every request', withDir(async (dir) => {
    const file = path.join(dir, 'config.yaml');
    fs.writeFileSync(file, 'allowedHosts: [a.example]\n');
    const config = new ConfigStore(dir);
    config.load();
    const app = createApp({ dataDir: dir, webDist: null, config });
    fs.rmSync(file);
    fs.mkdirSync(file); // EISDIR on read
    const res = await app.request('/api/meta');
    assert.equal(res.status, 200);
    const meta = (await res.json()) as { notices: { id: string; message: string }[]; allowedHosts: string[] };
    assert.equal(meta.notices[0]!.id, 'config-invalid');
    assert.match(meta.notices[0]!.message, /can't be read \(EISDIR\)/);
    assert.deepEqual(meta.allowedHosts, ['a.example']);
    fs.rmdirSync(file);
    fs.writeFileSync(file, 'allowedHosts: [b.example]\n');
    assert.deepEqual(config.allowedHosts(), ['b.example'], 'recovers when it is fixed');
  }));

  test('a change calls onChange (the bus\'s config event); an unchanged file does not', withDir((dir) => {
    const file = path.join(dir, 'config.yaml');
    fs.writeFileSync(file, 'mcp: { writeTo: board }\n');
    let n = 0;
    const store = new ConfigStore(dir, { onChange: () => n++ });
    store.load();
    store.get();
    assert.equal(n, 0);
    fs.writeFileSync(file, 'mcp: { writeTo: found }\n');
    bumpMtime(file);
    assert.equal(store.get().mcp.writeTo, 'found');
    assert.equal(n, 1);
  }));

  test('hostnames are normalised: case, ports, IPv6 brackets', () => {
    assert.equal(normalizeHostname(' Example.COM:8080 '), 'example.com');
    assert.equal(normalizeHostname('[::1]:2724'), '[::1]');
    assert.equal(normalizeHostname('fd00::1'), '[fd00::1]');
    assert.equal(normalizeHostname('bragdoc.example'), 'bragdoc.example');
  });
});

/** Writes within one mtime tick look unchanged to a stat; push the clock on so the reload is deterministic. */
function bumpMtime(file: string) {
  const t = new Date(Date.now() + Math.floor(Math.random() * 1e6) + 1000);
  fs.utimesSync(file, t, t);
}

describe('the data home', () => {
  test('a first run lays out the home: 0700 dirs, .gitignore and config.yaml', withDir((root) => {
    const dir = path.join(root, '.bragdoc');
    const r = initHome(dir);
    assert.deepEqual(fs.readdirSync(dir).sort(), ['.gitignore', 'backups', 'cache', 'config.yaml', 'logs']);
    if (posix) for (const d of [dir, path.join(dir, 'logs'), path.join(dir, 'cache'), path.join(dir, 'backups')]) assert.equal(mode(d), 0o700, d);
    assert.equal(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8'), GITIGNORE);
    for (const e of ['/runtime.json', '/secrets.yaml', '/logs/', '/cache/', '/backups/', '/service/', '/legacy-cli/', '/legacy-cli.partial/']) assert.match(GITIGNORE, new RegExp(`^${e.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}$`, 'm'));
    assert.equal(fs.readFileSync(path.join(dir, 'config.yaml'), 'utf8'), CONFIG_TEMPLATE);
    assert.deepEqual(r.moved, []);
    assert.deepEqual(r.notices, []);
  }));

  test('it is idempotent and never replaces your files', withDir((dir) => {
    initHome(dir);
    fs.writeFileSync(path.join(dir, '.gitignore'), 'mine\n');
    fs.writeFileSync(path.join(dir, 'config.yaml'), '# mine\n');
    const r = initHome(dir);
    assert.deepEqual(r.created, []);
    assert.equal(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8'), 'mine\n');
    assert.equal(fs.readFileSync(path.join(dir, 'config.yaml'), 'utf8'), '# mine\n');
  }));

  /** The old @bragdoc/cli's ~/.bragdoc: a config.yml holding a token (0600), cache/commits/ and logs/combined.log. */
  function legacyHome(dir: string) {
    fs.writeFileSync(path.join(dir, 'config.yml'), 'auth:\n  token: secret-cloud-token\n', { mode: 0o600 });
    fs.chmodSync(path.join(dir, 'config.yml'), 0o600);
    fs.mkdirSync(path.join(dir, 'cache', 'commits'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'cache', 'commits', 'abc.json'), '{"x":1}');
    fs.mkdirSync(path.join(dir, 'logs'));
    fs.writeFileSync(path.join(dir, 'logs', 'combined.log'), 'old log\n', { mode: 0o640 });
    fs.chmodSync(path.join(dir, 'logs', 'combined.log'), 0o640);
  }

  test("the old CLI's files are moved into legacy-cli/, untouched, modes kept, before cache/ is made", withDir((dir) => {
    legacyHome(dir);
    const r = initHome(dir);
    assert.deepEqual(r.moved, ['config.yml', 'cache', 'logs']);
    const L = path.join(dir, 'legacy-cli');
    assert.equal(fs.readFileSync(path.join(L, 'config.yml'), 'utf8'), 'auth:\n  token: secret-cloud-token\n');
    assert.equal(fs.readFileSync(path.join(L, 'cache', 'commits', 'abc.json'), 'utf8'), '{"x":1}');
    assert.equal(fs.readFileSync(path.join(L, 'logs', 'combined.log'), 'utf8'), 'old log\n');
    if (posix) {
      assert.equal(mode(path.join(L, 'config.yml')), 0o600);
      assert.equal(mode(path.join(L, 'logs', 'combined.log')), 0o640);
      assert.equal(mode(L), 0o700);
    }
    // our own cache/ and logs/ are new and empty: nothing of the old CLI's mixed in
    assert.deepEqual(fs.readdirSync(path.join(dir, 'cache')), []);
    assert.deepEqual(fs.readdirSync(path.join(dir, 'logs')), []);
    assert.ok(!fs.existsSync(path.join(dir, 'config.yml')));
    assert.equal(r.notices.length, 1);
    assert.equal(r.notices[0]!.id, 'legacy-moved');
    assert.match(r.notices[0]!.message, /nothing was deleted/);
  }));

  test('the move is idempotent: a second start moves nothing and says nothing', withDir((dir) => {
    legacyHome(dir);
    initHome(dir);
    const before = fs.readdirSync(path.join(dir, 'legacy-cli')).sort();
    const r = initHome(dir);
    assert.deepEqual(r.moved, []);
    assert.deepEqual(r.notices, []);
    assert.deepEqual(fs.readdirSync(path.join(dir, 'legacy-cli')).sort(), before);
  }));

  test('if the old CLI recreates config.yml, it is left in place with a notice (no move loop)', withDir((dir) => {
    legacyHome(dir);
    initHome(dir);
    fs.writeFileSync(path.join(dir, 'config.yml'), 'auth: {}\n');
    for (let i = 0; i < 2; i++) {
      const r = initHome(dir);
      assert.deepEqual(r.moved, []);
      assert.deepEqual(r.notices.map((n) => n.id), ['legacy-recreated']);
      assert.match(r.notices[0]!.message, /npm uninstall -g @bragdoc\/cli/);
      assert.ok(fs.existsSync(path.join(dir, 'config.yml')));
      assert.equal(fs.readdirSync(path.join(dir, 'legacy-cli')).includes('config.yml'), true, 'the first one is still in legacy-cli/');
    }
  }));

  test('a home BragDoc already uses never has its own cache/ or logs/ moved', withDir((dir) => {
    initHome(dir);
    fs.writeFileSync(path.join(dir, 'logs', 'network.jsonl'), '{}\n');
    fs.rmSync(path.join(dir, 'config.yaml')); // even with config.yaml gone, runtime.json says this home is ours
    fs.writeFileSync(path.join(dir, 'runtime.json'), '{}');
    const r = initHome(dir);
    assert.deepEqual(r.moved, []);
    assert.ok(fs.existsSync(path.join(dir, 'logs', 'network.jsonl')));
    assert.ok(!fs.existsSync(path.join(dir, 'legacy-cli')));
  }));

  test("a folder of someone's own with a logs/ but no sign of the old CLI is left alone", withDir((dir) => {
    fs.mkdirSync(path.join(dir, 'logs'));
    fs.writeFileSync(path.join(dir, 'logs', 'mine.log'), 'mine\n');
    fs.writeFileSync(path.join(dir, 'notes.md'), '# notes\n');
    const r = initHome(dir);
    assert.deepEqual(r.moved, []);
    assert.ok(!fs.existsSync(path.join(dir, 'legacy-cli')));
    assert.equal(fs.readFileSync(path.join(dir, 'logs', 'mine.log'), 'utf8'), 'mine\n');
  }));

  test('a move cut short (legacy-cli.partial/) is finished on the next start', withDir((dir) => {
    legacyHome(dir);
    // as if the process died after moving config.yml and cache/, before logs/
    fs.mkdirSync(path.join(dir, 'legacy-cli.partial'));
    fs.renameSync(path.join(dir, 'config.yml'), path.join(dir, 'legacy-cli.partial', 'config.yml'));
    fs.renameSync(path.join(dir, 'cache'), path.join(dir, 'legacy-cli.partial', 'cache'));
    const r = initHome(dir);
    assert.deepEqual(r.moved, ['logs']);
    assert.deepEqual(fs.readdirSync(path.join(dir, 'legacy-cli')).sort(), ['cache', 'config.yml', 'logs']);
    assert.ok(!fs.existsSync(path.join(dir, 'legacy-cli.partial')));
    assert.match(r.notices[0]!.message, /config\.yml, cache\/, logs\//);
    assert.deepEqual(fs.readdirSync(path.join(dir, 'logs')), [], 'our logs/ is fresh');
  }));

  test('the move notice is in /api/meta after startServer', withDir(async (dir) => {
    legacyHome(dir);
    const { port, close } = await startServer(0, { dataDir: dir, webDist: null });
    try {
      const meta = (await (await fetch(`http://127.0.0.1:${port}/api/meta`)).json()) as { notices: { id: string }[] };
      assert.deepEqual(meta.notices.map((n) => n.id), ['legacy-moved']);
    } finally {
      await close();
    }
  }));
});

describe('runtime.json', () => {
  test('written 0600 on boot; the MCP token is stable across two boots', withDir(async (dir) => {
    const file = path.join(dir, 'runtime.json');
    const first = await startServer(0, { dataDir: dir, webDist: null });
    let token: string;
    try {
      if (posix) assert.equal(mode(file), 0o600);
      const r = readRuntime(dir)!;
      assert.equal(r.pid, process.pid);
      assert.equal(r.port, first.port);
      assert.equal(r.url, `http://localhost:${first.port}`);
      assert.equal(r.running, true);
      assert.match(r.mcpToken, /^[A-Za-z0-9_-]{43}$/);
      token = r.mcpToken;
    } finally {
      await first.close();
    }
    assert.ok(fs.existsSync(file), 'kept on exit: it holds the token');
    const second = await startServer(0, { dataDir: dir, webDist: null });
    try {
      const r = readRuntime(dir)!;
      assert.equal(r.mcpToken, token);
      assert.equal(r.port, second.port);
      if (posix) assert.equal(mode(file), 0o600);
    } finally {
      await second.close();
    }
  }));

  test('0600 even when an older copy was world-readable, and under a permissive umask', withDir((dir) => {
    fs.writeFileSync(path.join(dir, 'runtime.json'), '{}', { mode: 0o644 });
    const prev = process.umask(0);
    try {
      new Runtime(dir).write({ pid: 1, port: 2, url: 'http://localhost:2', version: '0', startedAt: '' });
    } finally {
      process.umask(prev);
    }
    if (posix) assert.equal(mode(path.join(dir, 'runtime.json')), 0o600);
  }));

  test('rotate() replaces the token at once and persists it; a bad token on disk is replaced', withDir((dir) => {
    const rt = new Runtime(dir);
    rt.write({ pid: process.pid, port: 1, url: 'http://localhost:1', version: '0', startedAt: '' });
    const old = rt.mcpToken();
    const next = rt.rotate();
    assert.notEqual(next, old);
    assert.equal(readRuntime(dir)!.mcpToken, next);
    assert.equal(new Runtime(dir).mcpToken(), next);
    fs.writeFileSync(path.join(dir, 'runtime.json'), JSON.stringify({ mcpToken: 'short' }));
    assert.match(new Runtime(dir).mcpToken(), /^[A-Za-z0-9_-]{43}$/);
  }));

  test('readRuntime: missing, garbage or a dead pid', withDir((dir) => {
    assert.equal(readRuntime(dir), null);
    fs.writeFileSync(path.join(dir, 'runtime.json'), 'not json');
    assert.equal(readRuntime(dir), null);
    const rt = new Runtime(dir);
    rt.write({ pid: 2 ** 22 + 12345, port: 1, url: 'http://localhost:1', version: '0', startedAt: '' });
    assert.equal(readRuntime(dir)!.running, false);
  }));

  test('displayUrl and constantTimeEqual', () => {
    assert.equal(displayUrl('127.0.0.1', 2724), 'http://localhost:2724');
    assert.equal(displayUrl('0.0.0.0', 2724), 'http://localhost:2724');
    assert.equal(displayUrl('192.168.1.5', 80), 'http://192.168.1.5:80');
    assert.equal(displayUrl('fd00::5', 80), 'http://[fd00::5]:80');
    assert.ok(constantTimeEqual('abc', 'abc'));
    assert.ok(!constantTimeEqual('abc', 'abd'));
    assert.ok(!constantTimeEqual('abc', 'abcd'));
  });
});
