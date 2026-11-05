// From edspencer/cli-contract test/update.test.ts @ 0.2; local changes: imports from server/update/ and the published runner's
// schema validator; `fetch`'s type is server/update/health.ts's (a string URL). The tests of the reference code BragDoc
// copied (D88).
//
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { EXIT } from '../server/update/exit-codes.ts';
import type { HealthVerdict } from '../server/update/health.ts';
import { acquireLock, lockPath } from '../server/update/lock.ts';
import { createOutput } from '../server/update/output.ts';
import type { Spawn } from '../server/update/package-manager.ts';
import { readUpdateCheck } from '../server/update/update-check.ts';
import { findCli, runUpdate, type ServiceSnapshot, type UpdateEnvironment, type UpdateProduct } from '../server/update/update.ts';
import { loadSchema, validate } from '@edspencer/cli-conformance/dist/src/schema.js';
import { capture, tempDir } from './update-helpers.ts';

// SPEC §5, driven through the hooks. Every hook records what it was asked, so a test asserts the order as well as the
// outcome: the busy check before the stop, both fetches before the stop, the stop before the install.

const NPM_GLOBAL = path.join(path.sep, 'fake', 'lib', 'node_modules');
const PKG = '@s/tool';
const ROOT = path.join(NPM_GLOBAL, '@s', 'tool');
const CLI = path.join(ROOT, 'dist', 'cli.js');

interface Rig {
  product: UpdateProduct;
  env: UpdateEnvironment;
  calls: string[];
  out: () => string;
  err: () => string;
  installFails: boolean;
  refreshFails: boolean;
  /** What the health checks say, one per call. */
  health: HealthVerdict[];
  service: ServiceSnapshot;
  /** The version the CLI on disk reports. */
  onDisk: string;
  setOutput(json: boolean): void;
}

let home: string;
beforeEach(() => {
  home = tempDir('update-test-');
});

function rig(o: { latest?: string; current?: string; engines?: string | null } = {}): Rig {
  const latest = o.latest ?? '0.82.0';
  const current = o.current ?? '0.81.0';
  const engines = o.engines === undefined ? '>=22' : o.engines;
  const ok = { status: 0, stdout: '', stderr: '' };
  let stdout = capture();
  let stderr = capture();
  const r = {
    calls: [] as string[],
    out: () => stdout.text,
    err: () => stderr.text,
    installFails: false,
    refreshFails: false,
    health: [{ state: 'ok', version: latest }] as HealthVerdict[],
    service: { installed: true, running: true, url: 'http://127.0.0.1:7233', log: '/fake/service.log' } as ServiceSnapshot,
    onDisk: current,
  } as Rig;
  r.setOutput = (json: boolean) => {
    stdout = capture();
    stderr = capture();
    r.env.out = createOutput({ tool: 'tool', json, stdout, stderr, env: {} });
  };

  const spawn: Spawn = (cmd, args) => {
    // The npm beside this Node is run as `node npm-cli.js …`; label it `npm`.
    const npm = args[0]?.endsWith('npm-cli.js') ? args.slice(1) : path.basename(cmd) === 'npm' ? args : undefined;
    if (npm === undefined && args[1] === '--version') return { status: 0, stdout: `${r.onDisk}\n`, stderr: '' };
    assert.ok(npm, `only npm and the CLI are run: ${cmd} ${args.join(' ')}`);
    if (npm[0] === 'root') return { status: 0, stdout: `${NPM_GLOBAL}\n`, stderr: '' };
    if (npm[0] === 'config') return { status: 0, stdout: 'http://registry.test\n', stderr: '' };
    r.calls.push(`npm ${npm.join(' ')}`);
    if (npm[0] === 'install') {
      if (r.installFails) return { status: 1, stdout: '', stderr: 'ENOSPC' };
      r.onDisk = npm.at(-1)!.split('@').at(-1)!;
    }
    return ok;
  };

  r.product = {
    name: 'Tool',
    tool: 'tool',
    packageName: PKG,
    envPrefix: 'TOOL',
    home,
    currentVersion: current,
    entry: CLI,
    binSubpath: path.join('dist', 'cli.js'),
    image: 'ghcr.io/s/tool',
    usage: 'Usage: tool update [--check] [--to <version|tag>] [--yes] [--force] [--json]',
    changelogUrl: (v) => `https://example.test/releases/tag/v${v}`,
    healthTimeoutMs: 50,
    guardBusy: async ({ force }) => {
      r.calls.push(`busy(force=${String(force)})`);
      return null;
    },
    service: {
      inspect: () => r.service,
      stop: () => void r.calls.push('stop'),
      refresh: (cli) => {
        r.calls.push(`refresh(${r.onDisk})`);
        assert.equal(cli, CLI);
        return r.refreshFails ? { status: 1, stdout: '', stderr: 'refresh failed' } : ok;
      },
      tail: () => 'boot line 1\nboot line 2',
    },
    waitForVersion: async ({ version }) => {
      r.calls.push(`health(${version})`);
      return r.health.shift() ?? { state: 'no-answer' };
    },
  };

  r.env = {
    out: createOutput({ tool: 'tool', stdout, stderr, env: {} }),
    env: { npm_config_registry: 'http://registry.test' },
    isTTY: false,
    nodeVersion: '22.11.0',
    writable: () => true,
    spawn,
    // After the stop, nothing answers (step 9's wait).
    fetch: (async (url: string | URL) => {
      const u = String(url);
      if (u.endsWith('/api/health')) throw new Error('ECONNREFUSED');
      if (u.endsWith('/dist-tags')) return new Response(JSON.stringify({ latest }));
      return new Response(JSON.stringify({ name: PKG, version: u.split('/').at(-1), ...(engines !== null ? { engines: { node: engines } } : {}) }));
    }) as typeof fetch,
    // Only the package root has a manifest with our name, as in a real install.
    fs: {
      existsSync: (p: fs.PathLike) => p === path.join(ROOT, 'package.json') || p === CLI,
      readFileSync: (() => JSON.stringify({ name: PKG })) as unknown as typeof fs.readFileSync,
      realpathSync: ((p: string) => p) as typeof fs.realpathSync,
    },
  };
  return r;
}

const run = (r: Rig, opts: Parameters<typeof runUpdate>[1]) => runUpdate(r.product, opts, r.env);

test('up to date: says so, exits 0, caches the answer, and releases the lock', async () => {
  const r = rig({ latest: '0.81.0' });
  assert.equal(await run(r, { yes: true }), EXIT.OK);
  assert.match(r.out(), /Tool 0\.81\.0 is up to date\./);
  assert.equal(readUpdateCheck(home)?.updateAvailable, false);
  assert.deepEqual(r.calls, []);
  assert.equal(fs.existsSync(lockPath(home)), false);
});

test('--check reports on stderr, changes nothing, and exits 0', async () => {
  const r = rig();
  assert.equal(await run(r, { check: true }), EXIT.OK);
  assert.equal(r.out(), '', 'the notice goes to stderr (SPEC §3)');
  assert.match(r.err(), /Tool 0\.82\.0 is available \(you have 0\.81\.0\)\.\n {2}Run: tool update\n {2}Changes: https:\/\/example\.test\/releases\/tag\/v0\.82\.0/);
  assert.deepEqual(r.calls, []);
  const cached = readUpdateCheck(home);
  assert.deepEqual(
    { ...cached, checkedAt: '' },
    {
      name: PKG,
      current: '0.81.0',
      target: '0.82.0',
      tag: 'latest',
      updateAvailable: true,
      installMethod: 'npm-global',
      canUpdate: true,
      command: 'tool update',
      engines: '>=22',
      nodeOk: true,
      changelog: 'https://example.test/releases/tag/v0.82.0',
      checkedAt: '',
    },
  );
});

test('--check --json: one document on stdout, valid against the schema, and the prose on stderr', async () => {
  const r = rig();
  r.setOutput(true);
  assert.equal(await run(r, { check: true, json: true }), EXIT.OK);
  const doc = JSON.parse(r.out()) as Record<string, unknown>;
  assert.equal(doc.outcome, 'available');
  assert.deepEqual(validate(loadSchema('update-check'), doc), []);
  assert.match(r.err(), /is available/);
});

test('updates: busy, fetch both, stop, install, refresh with the new CLI, health for the target, in that order', async () => {
  const r = rig();
  assert.equal(await run(r, { yes: true }), EXIT.OK);
  assert.deepEqual(r.calls, [
    'busy(force=false)',
    'npm cache add @s/tool@0.82.0',
    'npm cache add @s/tool@0.81.0',
    'stop',
    'npm install --global --no-audit --no-fund @s/tool@0.82.0',
    'refresh(0.82.0)',
    'health(0.82.0)',
  ]);
  assert.match(r.out(), /Updated Tool 0\.81\.0 → 0\.82\.0\. Running at http:\/\/127\.0\.0\.1:7233/);
  // The cache is rewritten: status mustn't go on advertising the version that's now installed.
  assert.deepEqual([readUpdateCheck(home)?.current, readUpdateCheck(home)?.updateAvailable, readUpdateCheck(home)?.command], ['0.82.0', false, null]);
});

test('--force reaches the busy check as force, and changes nothing else', async () => {
  const r = rig();
  assert.equal(await run(r, { yes: true, force: true }), EXIT.OK);
  assert.equal(r.calls[0], 'busy(force=true)');
  assert.ok(r.calls.includes('health(0.82.0)'));
});

test('busy: exits 75 before anything is stopped', async () => {
  const r = rig();
  r.product.guardBusy = async () => {
    r.calls.push('busy');
    return EXIT.BUSY;
  };
  assert.equal(await run(r, { yes: true }), EXIT.BUSY);
  assert.deepEqual(r.calls, ['busy']);
});

test('no TTY and no --yes: exit 2, with the usage after the message', async () => {
  const r = rig();
  assert.equal(await run(r, {}), EXIT.USAGE);
  assert.match(r.err(), /^tool: there's no terminal to ask, so --yes is needed: tool update --yes\n\nUsage: tool update/m);
  assert.deepEqual(r.calls, ['busy(force=false)']);
});

test('on a TTY it asks on stderr, and a no changes nothing', async () => {
  const r = rig();
  r.env.isTTY = true;
  const asked: string[] = [];
  r.env.confirm = async (q) => {
    asked.push(q);
    return false;
  };
  assert.equal(await run(r, {}), EXIT.OK);
  assert.equal(asked.length, 1);
  assert.match(r.err(), /Update Tool 0\.81\.0 → 0\.82\.0\? The service will restart\./);
  assert.match(r.out(), /Nothing was changed/);
  assert.deepEqual(r.calls, ['busy(force=false)']);
});

test("can't update itself: prints the right command and exits 5; --check there reports and exits 0", async () => {
  const r = rig();
  r.env.env = { ...r.env.env, TOOL_IN_DOCKER: '1' };
  assert.equal(await run(r, { yes: true }), EXIT.CANNOT_UPDATE);
  assert.match(r.err(), /Run: docker compose pull && docker compose up -d {4}\(image ghcr\.io\/s\/tool:0\.82\.0\)/);
  assert.match(r.err(), /this install can't update itself: it's running from a container image/);
  assert.deepEqual(r.calls, []);
  const c = rig();
  c.env.env = { ...c.env.env, TOOL_IN_DOCKER: '1' };
  assert.equal(await run(c, { check: true }), EXIT.OK);
  assert.deepEqual([readUpdateCheck(home)?.installMethod, readUpdateCheck(home)?.canUpdate], ['docker', false]);
  assert.match(c.err(), /Run: docker compose pull/);
});

test('not writable: prints the sudo command, runs nothing, exits 5', async () => {
  const r = rig();
  r.env.writable = () => false;
  assert.equal(await run(r, { yes: true }), EXIT.CANNOT_UPDATE);
  assert.match(r.err(), /Run: sudo npm install -g @s\/tool@0\.82\.0 {4}\(the global folder isn't writable\)/);
  assert.match(r.err(), /isn't writable by this user/);
  assert.deepEqual(r.calls, []);
});

test('a target that needs a newer Node: exit 1, naming it', async () => {
  const r = rig({ engines: '>=24' });
  assert.equal(await run(r, { yes: true }), EXIT.FAILED);
  assert.match(r.err(), /0\.82\.0 needs Node >=24, and this is Node 22\.11\.0/);
  assert.deepEqual(r.calls, []);
  const unreadable = rig({ engines: '1.2 - 2.3' });
  assert.equal(await run(unreadable, { yes: true }), EXIT.OK, "a range it can't read doesn't block");
});

test('a lower version needs --to, and --to gets it', async () => {
  const r = rig({ latest: '0.80.0' });
  assert.equal(await run(r, { yes: true }), EXIT.OK);
  assert.match(r.out(), /is newer than the registry's latest \(0\.80\.0\)\. Nothing to do\./);
  assert.deepEqual(r.calls, []);
  const down = rig({ latest: '0.80.0' });
  assert.equal(await run(down, { yes: true, to: '0.80.0' }), EXIT.OK);
  assert.ok(down.calls.includes('npm install --global --no-audit --no-fund @s/tool@0.80.0'));
  assert.match(down.out(), /Updated Tool 0\.81\.0 → 0\.80\.0/);
});

test("won't take a prerelease on latest unless --to names it, and doesn't cache it as available", async () => {
  const r = rig({ latest: '0.82.0-rc.1' });
  assert.equal(await run(r, { yes: true }), EXIT.OK);
  assert.match(r.out(), /latest is a prerelease \(0\.82\.0-rc\.1\)/);
  assert.equal(readUpdateCheck(home)?.updateAvailable, false);
  assert.deepEqual(r.calls, []);
  const to = rig({ latest: '0.82.0-rc.1' });
  assert.equal(await run(to, { yes: true, to: '0.82.0-rc.1' }), EXIT.OK);
  assert.ok(to.calls.includes('health(0.82.0-rc.1)'));
});

test("two updates can't interleave: the second exits 1", async () => {
  // The parent's pid, which is alive: a made-up pid would be stale, and taken.
  acquireLock({ home, pid: process.ppid });
  const r = rig();
  assert.equal(await run(r, { yes: true }), EXIT.FAILED);
  assert.match(r.err(), new RegExp(`another update is already running \\(pid ${process.ppid}`));
  assert.deepEqual(r.calls, []);
});

test('a failed install: npm put the old one back, so the old CLI refreshes the unit, and it exits 6', async () => {
  const r = rig();
  r.installFails = true;
  r.health = [{ state: 'ok', version: '0.81.0' }];
  assert.equal(await run(r, { yes: true }), EXIT.ROLLED_BACK);
  assert.match(r.err(), /installing 0\.82\.0 failed/);
  assert.match(r.err(), /0\.82\.0 didn't start; 0\.81\.0 is running again\./);
  assert.deepEqual(r.calls.slice(4), ['npm install --global --no-audit --no-fund @s/tool@0.82.0', 'refresh(0.81.0)', 'health(0.81.0)']);
});

test('a target that fails its health check: the log, a reinstall, the old CLI, the old version answering, exit 6', async () => {
  const r = rig();
  r.health = [{ state: 'no-answer' }, { state: 'ok', version: '0.81.0' }];
  assert.equal(await run(r, { yes: true }), EXIT.ROLLED_BACK);
  assert.match(r.err(), /didn't answer within 0\.05 seconds/);
  assert.match(r.err(), /The last 20 lines of \/fake\/service\.log:\n {4}boot line 1\n {4}boot line 2/);
  assert.deepEqual(r.calls, [
    'busy(force=false)',
    'npm cache add @s/tool@0.82.0',
    'npm cache add @s/tool@0.81.0',
    'stop',
    'npm install --global --no-audit --no-fund @s/tool@0.82.0',
    'refresh(0.82.0)',
    'health(0.82.0)',
    'npm install --global --no-audit --no-fund @s/tool@0.81.0',
    'refresh(0.81.0)',
    'health(0.81.0)',
  ]);
  assert.match(r.err(), /0\.82\.0 didn't start; 0\.81\.0 is running again\./);
});

test('--json on a rollback: one document, outcome rolled-back', async () => {
  const r = rig();
  r.setOutput(true);
  r.health = [{ state: 'wrong-version', version: '0.81.0' }, { state: 'ok', version: '0.81.0' }];
  assert.equal(await run(r, { yes: true, json: true }), EXIT.ROLLED_BACK);
  assert.equal((JSON.parse(r.out()) as { outcome: string }).outcome, 'rolled-back');
  assert.match(r.err(), /answers with 0\.81\.0, not 0\.82\.0/);
});

test("a rollback that can't be restored exits 7, with the commands to run", async () => {
  const r = rig();
  r.health = [{ state: 'no-answer' }, { state: 'no-answer' }];
  assert.equal(await run(r, { yes: true }), EXIT.ROLLBACK_FAILED);
  assert.match(r.err(), /0\.81\.0 isn't answering at http:\/\/127\.0\.0\.1:7233 either\. Run these by hand:/);
  assert.match(r.err(), / {4}npm install --global --no-audit --no-fund @s\/tool@0\.81\.0\n {4}tool service install --refresh\n {4}tool service status/);
});

test('a failed reinstall exits 7', async () => {
  const r = rig();
  r.health = [{ state: 'no-answer' }];
  const spawn = r.env.spawn!;
  let installs = 0;
  r.env.spawn = (cmd, args, o) => (args.includes('install') && ++installs === 2 ? { status: 1, stdout: '', stderr: 'E404' } : spawn(cmd, args, o));
  assert.equal(await run(r, { yes: true }), EXIT.ROLLBACK_FAILED);
  assert.match(r.err(), /0\.81\.0 couldn't be reinstalled/);
});

test("a refresh that fails rolls back; when the old CLI's fails too, it's 7", async () => {
  const r = rig();
  r.refreshFails = true;
  assert.equal(await run(r, { yes: true }), EXIT.ROLLBACK_FAILED);
  assert.match(r.err(), /0\.82\.0 couldn't refresh the service unit/);
  assert.match(r.err(), /the service couldn't be started again on 0\.81\.0/);
});

test("an install that says it worked but left the old CLI rolls back", async () => {
  const r = rig();
  const spawn = r.env.spawn!;
  r.env.spawn = (cmd, args, o) => {
    const res = spawn(cmd, args, o);
    if (args.includes('install')) r.onDisk = '0.81.0';
    return res;
  };
  assert.equal(await run(r, { yes: true }), EXIT.ROLLED_BACK);
  assert.match(r.err(), /no CLI on disk reports that version/);
});

test('without a service: refuses under a foreground serve (3), and with nothing running installs and stops there', async () => {
  const r = rig();
  r.service = { installed: false, running: true, url: 'http://127.0.0.1:7233' };
  r.env.fetch = async (url: string) => (String(url).endsWith('/api/health') ? new Response('{"ok":true,"version":"0.81.0"}') : rig().env.fetch!(url));
  assert.equal(await run(r, { yes: true }), EXIT.NOT_RUNNING);
  assert.match(r.err(), /Tool is running at http:\/\/127\.0\.0\.1:7233, and there's no service to stop\. Stop it \(Ctrl-C in its terminal\)/);
  assert.ok(!r.calls.some((c) => c.startsWith('npm install')));

  const idle = rig();
  idle.service = { installed: false, running: false };
  assert.equal(await run(idle, { yes: true }), EXIT.OK);
  assert.deepEqual(idle.calls, ['busy(force=false)', 'npm cache add @s/tool@0.82.0', 'npm cache add @s/tool@0.81.0', 'npm install --global --no-audit --no-fund @s/tool@0.82.0']);
  assert.match(idle.out(), /Updated Tool 0\.81\.0 → 0\.82\.0\./);
  assert.equal(readUpdateCheck(home)?.updateAvailable, false);
});

test('a registry it can\'t reach: exit 1 before anything is touched, and the lock is gone', async () => {
  const r = rig();
  r.env.fetch = (async () => Promise.reject(new Error('ECONNREFUSED'))) as typeof fetch;
  assert.equal(await run(r, { yes: true }), EXIT.FAILED);
  assert.match(r.err(), /couldn't reach the registry/);
  assert.deepEqual(r.calls, []);
  assert.equal(fs.existsSync(lockPath(home)), false);
});

test('a failed fetch of the target stops before the stop; a missing current version is only a note', async () => {
  const r = rig();
  const spawn = r.env.spawn!;
  r.env.spawn = (cmd, args, o) => (args.includes('cache') && args.at(-1)!.endsWith('0.82.0') ? { status: 1, stdout: '', stderr: '404' } : spawn(cmd, args, o));
  assert.equal(await run(r, { yes: true }), EXIT.FAILED);
  assert.match(r.err(), /couldn't fetch @s\/tool@0\.82\.0/);
  assert.ok(!r.calls.includes('stop'));

  const n = rig();
  const spawn2 = n.env.spawn!;
  n.env.spawn = (cmd, args, o) => (args.includes('cache') && args.at(-1)!.endsWith('0.81.0') ? { status: 1, stdout: '', stderr: '404' } : spawn2(cmd, args, o));
  assert.equal(await run(n, { yes: true }), EXIT.OK);
  assert.match(n.err(), /a rollback would need the network/);
});

test('a service still answering after the stop is a note, not a failure', async () => {
  const r = rig();
  const fetch = r.env.fetch!;
  r.env.fetch = async (url: string) => (String(url).endsWith('/api/health') ? new Response('{"ok":true}') : fetch(url));
  r.env.sleep = async () => {};
  assert.equal(await run(r, { yes: true }), EXIT.OK);
  assert.match(r.err(), /still answered 15 seconds after the stop/);
});

test('findCli tries the re-resolved entry first, and takes only a CLI that reports the version', () => {
  const asked: string[] = [];
  const versions: Record<string, string> = { '/pnpm/store/tool@2/dist/cli.js': '2.0.0', [CLI]: '1.0.0' };
  const spawn: Spawn = (cmd, args) => {
    if (args[0]?.endsWith('npm-cli.js') || path.basename(cmd) === 'npm') return { status: 0, stdout: `${NPM_GLOBAL}\n`, stderr: '' };
    asked.push(args[0]);
    return { status: 0, stdout: `${versions[args[0]] ?? ''}\n`, stderr: '' };
  };
  const fsFake = { existsSync: () => true, realpathSync: (() => '/pnpm/store/tool@2/dist/cli.js') as unknown as typeof fs.realpathSync };
  const product = { entry: '/bin/tool', packageName: PKG, binSubpath: path.join('dist', 'cli.js') };
  assert.equal(findCli(product, undefined, '2.0.0', { spawn, fs: fsFake }), '/pnpm/store/tool@2/dist/cli.js');
  assert.equal(findCli(product, undefined, '1.0.0', { spawn, fs: fsFake }), CLI);
  assert.deepEqual(asked, ['/pnpm/store/tool@2/dist/cli.js', '/pnpm/store/tool@2/dist/cli.js', CLI]);
  assert.equal(findCli(product, undefined, '3.0.0', { spawn, fs: fsFake }), undefined);
});

test('releases the lock whatever happens', async () => {
  for (const opts of [{ yes: true }, { check: true }, {}]) {
    await run(rig(), opts);
    assert.equal(fs.existsSync(lockPath(home)), false, JSON.stringify(opts));
  }
});
