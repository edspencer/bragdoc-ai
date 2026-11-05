// `bragdoc service …` end to end, in-process, with everything that touches the machine injected: a fake launchctl /
// systemctl that keeps state, a fake health probe, a clock. Nothing here reaches a real service manager, and every
// file lands in a throwaway home.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ExitError, UsageError } from '../server/args.ts';
import { type Ctx, makeCtx } from '../server/commands/context.ts';
import type { Probe } from '../server/commands/ready.ts';
import { installedVersion, service } from '../server/commands/service.ts';
import type { RunResult } from '../server/platform/runner.ts';
import { tmpHome } from './fixture.ts';

const homes: Array<() => void> = [];
after(() => homes.forEach((c) => c()));

interface Fake {
  ctx: Ctx;
  home: string;
  calls: string[];
  out: () => string;
  /** What the fake service manager thinks. */
  state: { loaded: boolean; running: boolean; pid: number };
  probes: number[];
  streamed: string[][];
  followed: string[];
  /** Every busy check: `<port>/api/busy`. */
  busyAsked: string[];
}

/**
 * A ctx on a throwaway home with a fake service manager. `answer(port)` is what the health probe sees; by default
 * BragDoc answers exactly while the fake manager has it running.
 */
function fake(platform: NodeJS.Platform, o: { answer?: (port: number, f: Fake) => Probe; busy?: (port: number) => Response; lingerPrints?: number; bootstrapFailures?: number; bootstrapCode?: number; failed?: boolean; env?: NodeJS.ProcessEnv; cliScript?: string; packageRoot?: string; noBus?: boolean } = {}): Fake {
  const h = tmpHome();
  homes.push(h.cleanup);
  let out = '';
  let clock = 0;
  let bootstrapFailures = o.bootstrapFailures ?? 0;
  // how many `launchctl print`s still find the job after a bootout (launchd removing it asynchronously)
  let lingering = 0;
  const f: Fake = {
    home: h.home,
    calls: [],
    out: () => out,
    state: { loaded: false, running: false, pid: 0 },
    probes: [],
    streamed: [],
    followed: [],
    busyAsked: [],
    ctx: undefined as unknown as Ctx,
  };
  const ok = (stdout = ''): RunResult => ({ code: 0, stdout, stderr: '' });
  const up = () => Object.assign(f.state, { loaded: true, running: true, pid: f.state.pid + 1 });
  const run = async (cmd: string, args: string[]): Promise<RunResult> => {
    f.calls.push([cmd, ...args].join(' '));
    if (cmd === 'launchctl') {
      switch (args[0]) {
        case 'print':
          if (lingering > 0) {
            lingering--;
            return ok('x = {\n\tstate = running\n}\n');
          }
          return f.state.loaded ? ok(`x = {\n\tstate = ${f.state.running ? 'running' : 'waiting'}\n${f.state.running ? `\tpid = ${f.state.pid}\n` : ''}}\n`) : { code: 113, stdout: '', stderr: 'Could not find service' };
        case 'bootstrap':
          if (bootstrapFailures-- > 0) return { code: o.bootstrapCode ?? 5, stdout: '', stderr: `Bootstrap failed: ${o.bootstrapCode ?? 5}: Input/output error` };
          up();
          return ok();
        case 'bootout':
          if (!f.state.loaded) return { code: 3, stdout: '', stderr: 'No such process' };
          Object.assign(f.state, { loaded: false, running: false });
          lingering = o.lingerPrints ?? 0;
          return ok();
        case 'kickstart':
          up();
          return ok();
        default:
          return ok();
      }
    }
    if (cmd === 'systemctl') {
      if (o.noBus) return { code: 1, stdout: '', stderr: 'Failed to connect to bus: No medium found' };
      const verb = args[1];
      if (verb === 'show')
        return ok(`LoadState=${f.state.loaded ? 'loaded' : 'not-found'}\nActiveState=${f.state.running ? 'active' : o.failed ? 'failed' : 'inactive'}\nSubState=${f.state.running ? 'running' : o.failed ? 'failed' : 'dead'}\nMainPID=${f.state.running ? f.state.pid : 0}\nExecMainPID=${o.failed ? 77 : 0}\nExecMainStatus=${o.failed ? 1 : 0}\n`);
      if (verb === 'start' || verb === 'restart') up();
      if (verb === 'stop') f.state.running = false;
      if (verb === 'disable' && args.includes('--now')) Object.assign(f.state, { loaded: false, running: false });
      if (verb === 'enable' || verb === 'daemon-reload') f.state.loaded = true;
      return ok();
    }
    return { code: 127, stdout: '', stderr: `${cmd}: command not found` };
  };
  f.ctx = makeCtx({
    env: { ...h.env, ...o.env },
    out: (s) => (out += s),
    err: (s) => (out += s),
    platform,
    homedir: h.home,
    uid: 501,
    node: { path: '/opt/node/bin/node', version: 'v24.1.0' },
    cliScript: o.cliScript ?? '/usr/local/lib/node_modules/@bragdoc/local/dist/server/cli.js',
    packageRoot: o.packageRoot ?? '/usr/local/lib/node_modules/@bragdoc/local',
    run,
    stream: async (cmd, args) => {
      f.streamed.push([cmd, ...args]);
      return 0;
    },
    probe: async (port) => {
      f.probes.push(port);
      if (o.answer) return o.answer(port, f);
      // BragDoc answers on the port its installed unit names, while the fake manager has it running
      const unit = [unitFile(f), plistFile(f)].filter((p) => fs.existsSync(p)).map((p) => fs.readFileSync(p, 'utf8'))[0] ?? '';
      const served = Number(/--port(?:<\/string>\s*<string>| )(\d+)/.exec(unit)?.[1]);
      return f.state.running && served === port ? { kind: 'bragdoc', version: '0.0.0' } : { kind: 'none' };
    },
    // /api/busy: nothing answers unless the test says what does (never a real request to 127.0.0.1)
    loopback: async (port, pathname) => {
      f.busyAsked.push(`${port}${pathname}`);
      if (!o.busy) throw new TypeError('fetch failed');
      return o.busy(port);
    },
    sleep: async (ms) => {
      clock += ms;
    },
    now: () => clock,
    follow: (file) => {
      f.followed.push(file);
    },
  });
  return f;
}

const unitFile = (f: Fake) => path.join(f.home, '.config', 'systemd', 'user', 'bragdoc.service');
const plistFile = (f: Fake) => path.join(f.home, 'Library', 'LaunchAgents', 'ai.bragdoc.local.plist');

test('install --dry-run prints the unit and the commands, and writes nothing at all', async () => {
  for (const platform of ['linux', 'darwin'] as const) {
    const f = fake(platform);
    const before = fs.readdirSync(f.home);
    assert.equal(await service(f.ctx, ['install'], { 'dry-run': '1', port: '5151' }, undefined), 0);
    assert.deepEqual(fs.readdirSync(f.home), before, 'nothing written');
    assert.deepEqual(f.calls, [], 'nothing run');
    const out = f.out();
    assert.match(out, /^Dry run: nothing is written and nothing is started\./);
    assert.match(out, platform === 'linux' ? /^ExecStart=\/opt\/node\/bin\/node \S+cli\.js serve --port 5151 --data-dir \S+\.bragdoc$/m : /<string>5151<\/string>/);
    assert.match(out, platform === 'linux' ? /systemctl --user enable --quiet bragdoc\.service/ : /launchctl bootstrap gui\/501 /);
    assert.match(out, /starts when you log in, not when the computer boots/);
    assert.ok(out.includes(platform === 'linux' ? '~/.config/systemd/user/bragdoc.service:' : '~/Library/LaunchAgents/ai.bragdoc.local.plist:'), out);
  }
});

test('install refuses to run from npx (or any transient cache), with the global-install hint', async () => {
  const f = fake('linux', { packageRoot: '/home/someone/.npm/_npx/1a2b/node_modules/@bragdoc/local', cliScript: '/home/someone/.npm/_npx/1a2b/node_modules/@bragdoc/local/dist/server/cli.js' });
  await assert.rejects(service(f.ctx, ['install'], {}, undefined), /npx's cache.*\n\n {2}npm i -g @bragdoc\/local && bragdoc service install/s);
  await assert.rejects(service(f.ctx, ['install'], { 'dry-run': '1' }, undefined), /npx's cache/);
  assert.equal(fs.existsSync(unitFile(f)), false);
});

test('install refuses the unbuilt CLI from a checkout (a unit can only run dist/server/cli.js)', async () => {
  const f = fake('linux', { cliScript: '/home/someone/Code/bragdoc/server/cli.ts' });
  await assert.rejects(service(f.ctx, ['install'], {}, undefined), /npm run build/);
});

test('install on Linux: writes the unit, reloads, enables, starts, waits for /api/health, says "at login, not boot"', async () => {
  const f = fake('linux');
  assert.equal(await service(f.ctx, ['install'], {}, undefined), 0);
  const unit = fs.readFileSync(unitFile(f), 'utf8');
  // $BRAGDOC_HOME was set (tmpHome), so the data home is written in; the port always is
  assert.match(unit, new RegExp(`serve --port 2724 --data-dir ${f.home.replace(/[/.]/g, '\\$&')}/\\.bragdoc$`, 'm'));
  assert.ok(fs.statSync(path.join(f.home, '.bragdoc', 'service')).isDirectory());
  assert.deepEqual(
    f.calls.filter((c) => !c.includes(' show ')),
    ['systemctl --user daemon-reload', 'systemctl --user enable --quiet bragdoc.service', 'systemctl --user start bragdoc.service'],
  );
  assert.match(f.out(), /BragDoc 0\.0\.0 is running at http:\/\/localhost:2724/);
  assert.match(f.out(), /not when the computer boots/);
  assert.match(f.out(), /loginctl enable-linger/);
  assert.match(f.out(), /Logs: {6}bragdoc service logs \(~\/\.bragdoc\/service\/bragdoc\.log\)/);

  // again, unchanged: no reload, no restart
  f.calls.length = 0;
  assert.equal(await service(f.ctx, ['install'], {}, undefined), 0);
  assert.ok(!f.calls.some((c) => c.includes('daemon-reload') || c.includes('restart')), f.calls.join('\n'));
  // again on another port: rewritten, reloaded, restarted
  f.calls.length = 0;
  assert.equal(await service(f.ctx, ['install'], { port: '5151' }, undefined), 0);
  assert.ok(f.calls.includes('systemctl --user daemon-reload') && f.calls.includes('systemctl --user restart bragdoc.service'), f.calls.join('\n'));
});

test('install without $BRAGDOC_HOME names no data home in the unit (the service and a terminal share ~/.bragdoc)', async () => {
  const f = fake('linux', { env: { BRAGDOC_HOME: '' } });
  await service(f.ctx, ['install'], {}, undefined);
  assert.match(fs.readFileSync(unitFile(f), 'utf8'), /^ExecStart=\S+ \S+ serve --port 2724$/m);
});

test('install on macOS: plist, enable + bootstrap (retried through EIO), and the background-item note', async () => {
  const f = fake('darwin', { bootstrapFailures: 2 });
  assert.equal(await service(f.ctx, ['install'], {}, undefined), 0);
  assert.match(fs.readFileSync(plistFile(f), 'utf8'), /<key>KeepAlive<\/key>\s+<true\/>/);
  assert.equal(f.calls.filter((c) => c.startsWith('launchctl bootstrap gui/501 ')).length, 3);
  assert.ok(f.calls.includes('launchctl enable gui/501/ai.bragdoc.local'));
  assert.match(f.out(), /background item/);
  assert.match(f.out(), /BragDoc 0\.0\.0 is running at http:\/\/localhost:2724/);
  assert.match(f.out(), /bragdoc service logs \(~\/\.bragdoc\/service\/bragdoc\.log\)/);
});

test("install: a readiness timeout is a caveat (exit 0), not an error", async () => {
  const f = fake('linux', { answer: () => ({ kind: 'none' }) });
  // a timeout would otherwise be a real 20 s: the fake clock advances with each sleep
  assert.equal(await service(f.ctx, ['install'], {}, undefined), 0);
  assert.match(f.out(), /BragDoc is installed, but http:\/\/localhost:2724 didn't answer within 20 seconds\. It may still be starting/);
  assert.ok(f.probes.length > 10, 'it kept polling until the deadline');
});

test('install refuses a port something else holds, BragDoc in a terminal or not, before writing anything', async () => {
  for (const [answer, re] of [
    [{ kind: 'bragdoc', version: '0.0.9' }, /BragDoc 0\.0\.9 is already running on port 2724, outside the service/],
    [{ kind: 'other' }, /port 2724 is already in use by something that isn't BragDoc/],
  ] as const) {
    const f = fake('linux', { answer: () => answer });
    await assert.rejects(service(f.ctx, ['install'], {}, undefined), re);
    assert.equal(fs.existsSync(unitFile(f)), false);
  }
});

test('status with nothing installed says so and how to install (exit 4)', async () => {
  for (const platform of ['linux', 'darwin'] as const) {
    const f = fake(platform);
    assert.equal(await service(f.ctx, ['status'], {}, undefined), 4);
    assert.match(f.out(), /^BragDoc isn't installed as a service \(there's no ~\//);
    assert.match(f.out(), /`bragdoc service install` sets it up/);
  }
});

test("status reads the port from the INSTALLED unit, not today's default", async () => {
  const f = fake('linux');
  await service(f.ctx, ['install'], { port: '5151' }, undefined);
  f.probes.length = 0;
  assert.equal(await service(f.ctx, ['status'], {}, undefined), 0);
  assert.deepEqual(f.probes, [5151]);
  assert.match(f.out(), /URL: {7}http:\/\/localhost:5151: BragDoc 0\.0\.0 is answering/);
  assert.match(f.out(), /State: {5}running, pid \d+/);
  // the unit names a Node that doesn't exist here (it's a placeholder path): status warns
  assert.match(f.out(), /Warning: {3}the service runs \/opt\/node\/bin\/node, which no longer exists/);
});

test('stop, start, restart and uninstall on macOS: bootout, bootstrap, re-read', async () => {
  const f = fake('darwin');
  await service(f.ctx, ['install'], {}, undefined);
  f.calls.length = 0;
  assert.equal(await service(f.ctx, ['stop'], {}, undefined), 0);
  assert.ok(f.calls.includes('launchctl bootout gui/501/ai.bragdoc.local'));
  assert.ok(!f.calls.some((c) => c.startsWith('launchctl stop')), 'never launchctl stop: KeepAlive overrules it');
  assert.match(f.out(), /starts again at your next login, or now with/);
  assert.equal(fs.existsSync(plistFile(f)), true, 'stop keeps it installed');
  assert.equal(await service(f.ctx, ['stop'], {}, undefined), 0);
  assert.match(f.out(), /already stopped/);

  assert.equal(await service(f.ctx, ['start'], {}, undefined), 0);
  assert.ok(f.calls.some((c) => c.startsWith('launchctl bootstrap')));
  assert.match(f.out(), /is running at http:\/\/localhost:2724/);
  assert.equal(await service(f.ctx, ['start'], {}, undefined), 0);
  assert.match(f.out(), /already running \(pid \d+\)/);

  f.calls.length = 0;
  assert.equal(await service(f.ctx, ['restart'], {}, undefined), 0);
  assert.deepEqual(f.calls.filter((c) => /bootout|bootstrap|kickstart/.test(c)).map((c) => c.split(' ')[1]), ['bootout', 'bootstrap', 'kickstart']);

  assert.equal(await service(f.ctx, ['uninstall'], {}, undefined), 0);
  assert.equal(fs.existsSync(plistFile(f)), false);
  assert.match(f.out(), /Your data in ~\/\.bragdoc is untouched/);
  assert.equal(await service(f.ctx, ['uninstall'], {}, undefined), 0);
  assert.match(f.out(), /nothing to do/);
});

// cli-contract SPEC §1: `stop` follows the managers' own convention and never disables; uninstall is for good
test('stop and uninstall on Linux: stop keeps it enabled and installed; uninstall disables, removes, reloads', async () => {
  const f = fake('linux');
  await service(f.ctx, ['install'], {}, undefined);
  f.calls.length = 0;
  assert.equal(await service(f.ctx, ['stop'], {}, undefined), 0);
  assert.deepEqual(f.calls.filter((c) => !c.includes(' show ')), ['systemctl --user stop bragdoc.service'], 'stop, and nothing else');
  assert.ok(!f.calls.some((c) => c.includes('disable')), 'stop is for now, not for the next login');
  assert.equal(fs.existsSync(unitFile(f)), true, 'stop keeps the unit');
  assert.match(f.out(), /still installed, so it starts again at your next login/);
  f.calls.length = 0;
  await service(f.ctx, ['uninstall'], {}, undefined);
  assert.ok(f.calls.includes('systemctl --user disable --now --quiet bragdoc.service'));
  assert.ok(f.calls.includes('systemctl --user daemon-reload'));
  assert.equal(fs.existsSync(unitFile(f)), false);
});

test('start, stop, restart and logs need it installed (exit 4, with the install hint)', async () => {
  const f = fake('linux');
  for (const sub of ['start', 'stop', 'restart', 'logs'])
    await assert.rejects(service(f.ctx, [sub], {}, undefined), (e: unknown) => {
      assert.ok(e instanceof ExitError, sub);
      assert.equal(e.exitCode, 4, sub);
      assert.match(e.message, /isn't installed as a service.*bragdoc service install/);
      return true;
    });
});

test('logs: the last 50 lines of the log file on both OSes (D85); -f follows it; -n sets how many', async () => {
  for (const platform of ['linux', 'darwin'] as const) {
    const f = fake(platform);
    await service(f.ctx, ['install'], {}, undefined);
    const log = path.join(f.home, '.bragdoc', 'service', 'bragdoc.log');
    fs.writeFileSync(log, Array.from({ length: 60 }, (_, i) => `line ${i}`).join('\n') + '\n');
    const start = f.out().length;
    assert.equal(await service(f.ctx, ['logs'], {}, undefined), 0, 'without -f it prints and exits');
    assert.deepEqual(f.followed, []);
    assert.deepEqual(f.streamed, [], 'no journalctl');
    const printed = f.out().slice(start);
    assert.match(printed, /^line 10\n[\s\S]*line 59\n$/);
    assert.doesNotMatch(printed, /line 9\n/);

    const again = f.out().length;
    assert.equal(await service(f.ctx, ['logs'], { follow: '1', lines: '3' }, undefined), undefined, 'with -f it keeps running');
    assert.deepEqual(f.followed, [log]);
    assert.equal(f.out().slice(again), 'line 57\nline 58\nline 59\n');
  }
  const f = fake('linux');
  await assert.rejects(service(f.ctx, ['logs'], { lines: 'lots' }, undefined), UsageError);
  await assert.rejects(service(f.ctx, ['logs'], { json: '1' }, undefined), UsageError);
});

test('logs and status: a systemd unit from before D85 still logs to the journal, and says to reinstall', async () => {
  const f = fake('linux');
  await service(f.ctx, ['install'], {}, undefined);
  // what an older BragDoc wrote: no StandardOutput=
  fs.writeFileSync(unitFile(f), fs.readFileSync(unitFile(f), 'utf8').replace(/^Standard.*\n/gm, ''));
  assert.equal(await service(f.ctx, ['logs'], { lines: '20' }, undefined), 0);
  assert.deepEqual(f.streamed, [['journalctl', '--user', '-u', 'bragdoc.service', '-n', '20']]);
  assert.match(f.out(), /still logs to the systemd journal.*Run `bragdoc service install` again/);
  await service(f.ctx, ['logs'], { follow: '1' }, undefined);
  assert.deepEqual(f.streamed[1], ['journalctl', '--user', '-u', 'bragdoc.service', '-n', '50', '-f']);
  const start = f.out().length;
  await service(f.ctx, ['status'], { json: '1' }, undefined);
  const r = JSON.parse(f.out().slice(start));
  assert.equal(r.log, null);
  assert.ok(r.warnings.some((w: string) => /systemd journal/.test(w)));
});

test('status --json: one document on stdout, the same exit codes (4 not installed, 0 answering, 3 stopped)', async () => {
  for (const platform of ['linux', 'darwin'] as const) {
    const f = fake(platform);
    const json = async (code: number) => {
      const start = f.out().length;
      assert.equal(await service(f.ctx, ['status'], { json: '1' }, undefined), code);
      return JSON.parse(f.out().slice(start));
    };
    const none = await json(4);
    assert.equal(none.installed, false);
    assert.equal(none.running, false);
    assert.equal(none.port, null);
    assert.equal(none.unit, platform === 'linux' ? unitFile(f) : plistFile(f));
    assert.equal(none.manager, platform === 'linux' ? 'systemd' : 'launchd');

    await service(f.ctx, ['install'], { port: '5151' }, undefined);
    const up = await json(0);
    assert.deepEqual(
      { ...up, pid: typeof up.pid, warnings: up.warnings.length > 0, state: typeof up.state },
      {
        installed: true,
        running: true,
        answering: true,
        stopped: false,
        manager: platform === 'linux' ? 'systemd' : 'launchd',
        unit: platform === 'linux' ? unitFile(f) : plistFile(f),
        state: 'string',
        pid: 'number',
        lastExitCode: null,
        installedVersion: null, // the fake cli.js has no package.json beside it
        runningVersion: '0.0.0',
        port: 5151,
        url: 'http://localhost:5151',
        dataDir: path.join(f.home, '.bragdoc'),
        log: path.join(f.home, '.bragdoc', 'service', 'bragdoc.log'),
        warnings: true, // the placeholder Node and CLI paths don't exist here
      },
    );

    await service(f.ctx, ['stop'], {}, undefined);
    const stopped = await json(3);
    assert.equal(stopped.installed, true, 'stop leaves it installed');
    assert.equal(stopped.running, false);
    assert.equal(stopped.stopped, true);
    assert.equal(stopped.answering, false);
    assert.equal(stopped.runningVersion, null);
  }
});

test('status exits 3 when the service runs but BragDoc doesn\'t answer (still starting, or something else holds the port)', async () => {
  const f = fake('linux', { answer: () => ({ kind: 'other' }) });
  f.state.running = false;
  fs.mkdirSync(path.dirname(unitFile(f)), { recursive: true });
  fs.writeFileSync(unitFile(f), 'ExecStart=/n/node /p/cli.js serve --port 2724\nStandardOutput=append:/x.log\n');
  Object.assign(f.state, { loaded: true, running: true, pid: 9 });
  assert.equal(await service(f.ctx, ['status'], {}, undefined), 3);
  assert.match(f.out(), /something that isn't BragDoc is answering/);
});

test('status shows the installed version, from the package.json above the cli.js the unit runs', async () => {
  const h = tmpHome();
  homes.push(h.cleanup);
  const root = path.join(h.home, 'lib', 'node_modules', '@bragdoc', 'local');
  fs.mkdirSync(path.join(root, 'dist', 'server'), { recursive: true });
  fs.writeFileSync(path.join(root, 'dist', 'server', 'cli.js'), '');
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: '@bragdoc/local', version: '9.8.7' }));
  const cli = path.join(root, 'dist', 'server', 'cli.js');
  assert.equal(installedVersion(cli), '9.8.7');
  assert.equal(installedVersion('/nowhere/dist/server/cli.js'), null);
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'something-else', version: '1.0.0' }));
  assert.equal(installedVersion(cli), null, "a package.json that isn't BragDoc's says nothing");

  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: '@bragdoc/local', version: '9.8.7' }));
  const f = fake('linux', { cliScript: cli, packageRoot: root });
  await service(f.ctx, ['install'], {}, undefined);
  await service(f.ctx, ['status'], {}, undefined);
  // the fake answers 0.0.0: the service hasn't been restarted since an upgrade
  assert.match(f.out(), /BragDoc 0\.0\.0 is answering \(9\.8\.7 is installed: `bragdoc service restart`\)/);
  assert.match(f.out(), /Version: {3}9\.8\.7/);
});

test('Windows (and anything else) says "not supported yet", after usage errors and before touching anything', async () => {
  const f = fake('win32');
  await assert.rejects(service(f.ctx, ['install'], {}, undefined), /isn't supported on Windows yet/);
  await assert.rejects(service(f.ctx, ['status'], {}, undefined), /isn't supported on Windows yet/);
  await assert.rejects(service(f.ctx, ['nonsense'], {}, undefined), UsageError);
  await assert.rejects(service(fake('freebsd').ctx, ['status'], {}, undefined), /macOS \(launchd\) and Linux \(systemd\), not freebsd/);
  assert.deepEqual(f.calls, []);
});

test('usage errors: no subcommand, an unknown one, a flag it does not take, an argument, a bad port', async () => {
  const f = fake('linux');
  for (const [pos, flags] of [[[], {}], [['nonsense'], {}], [['status'], { port: '1' }], [['install', 'extra'], {}], [['install'], { port: '0' }], [['install'], { port: 'abc' }], [['install'], { 'data-dir': '' }]] as const)
    await assert.rejects(service(f.ctx, [...pos], { ...flags }, undefined), UsageError, JSON.stringify([pos, flags]));
  assert.deepEqual(f.calls, []);
});

test("Linux without a reachable user manager: one clear error naming XDG_RUNTIME_DIR", async () => {
  const f = fake('linux', { noBus: true });
  fs.mkdirSync(path.dirname(unitFile(f)), { recursive: true });
  fs.writeFileSync(unitFile(f), 'ExecStart=/n/node /p/cli.js serve --port 2724\n');
  await assert.rejects(service(f.ctx, ['status'], {}, undefined), /can't reach systemd's per-user instance.*XDG_RUNTIME_DIR/);
  // with no unit either, it's plainly not installed (a container, a CI job): exit 4, not an error
  fs.rmSync(unitFile(f));
  assert.equal(await service(f.ctx, ['status'], {}, undefined), 4);
});

test('macOS over ssh with nobody logged in at the screen (bootstrap 125): one clear error, no retrying', async () => {
  const f = fake('darwin', { bootstrapFailures: 99, bootstrapCode: 125 });
  await assert.rejects(service(f.ctx, ['install'], {}, undefined), /no login session for this user at the screen/);
  assert.equal(f.calls.filter((c) => c.startsWith('launchctl bootstrap')).length, 1);
});

test('a failed systemd unit is shown as not running, with its exit status, not as "stopped"', async () => {
  const f = fake('linux', { failed: true });
  fs.mkdirSync(path.dirname(unitFile(f)), { recursive: true });
  fs.writeFileSync(unitFile(f), 'ExecStart=/n/node /p/cli.js serve --port 2724\n');
  f.state.loaded = true;
  assert.equal(await service(f.ctx, ['status'], {}, undefined), 3);
  assert.match(f.out(), /State: {5}not running \(failed \(failed\)\), last exit status 1/);
});

// ---------------------------------------------------------------------------------------------------------------
// the busy check before stop and restart (cli-contract SPEC §1, §4; D86)
// ---------------------------------------------------------------------------------------------------------------

const busyAnswer = (counts: Record<string, number>) => () => Response.json({ busy: Object.values(counts).some((n) => n > 0), version: '0.0.0', counts });

test('stop and restart refuse with exit 75 while BragDoc is busy, and say what is running', async () => {
  for (const platform of ['linux', 'darwin'] as const) {
    const f = fake(platform, { busy: busyAnswer({ import: 0, judge: 1, ai: 2 }) });
    await service(f.ctx, ['install'], { port: '5151' }, undefined);
    for (const sub of ['stop', 'restart']) {
      f.calls.length = 0;
      f.busyAsked.length = 0;
      const before = f.out().length;
      assert.equal(await service(f.ctx, [sub], {}, undefined), 75, `${platform} ${sub}`);
      assert.deepEqual(f.busyAsked, ['5151/api/busy'], "asked on the installed unit's port");
      assert.equal(f.out().slice(before), 'bragdoc: BragDoc is busy: 1 judge run and 2 AI requests are running. Try again once it has finished, or use --force.\n');
      assert.ok(!f.calls.some((c) => /bootout|bootstrap|kickstart| stop | restart /.test(` ${c} `)), f.calls.join('\n'));
      assert.ok(f.state.running, 'still running');
    }
  }
});

test('--force stops or restarts all the same, saying "Overriding:" first', async () => {
  const f = fake('linux', { busy: busyAnswer({ import: 1, judge: 0, ai: 0 }) });
  await service(f.ctx, ['install'], {}, undefined);
  let before = f.out().length;
  assert.equal(await service(f.ctx, ['restart'], { force: '1' }, undefined), 0);
  assert.match(f.out().slice(before), /^Overriding: BragDoc is busy: 1 import is running\.\nBragDoc 0\.0\.0 is running at/);
  before = f.out().length;
  assert.equal(await service(f.ctx, ['stop'], { force: '1' }, undefined), 0);
  assert.match(f.out().slice(before), /^Overriding: BragDoc is busy: 1 import is running\.\nStopped BragDoc/);
  assert.equal(f.state.running, false);
});

test('the busy check lets stop and restart through when BragDoc is idle, not answering, or too old to say', async () => {
  for (const busy of [busyAnswer({ import: 0, judge: 0, ai: 0 }), undefined, () => Response.json({ error: { code: 'not_found', message: 'no' } }, { status: 404 })]) {
    const f = fake('linux', { busy });
    await service(f.ctx, ['install'], {}, undefined);
    assert.equal(await service(f.ctx, ['restart'], {}, undefined), 0);
    assert.equal(await service(f.ctx, ['stop'], {}, undefined), 0);
    assert.doesNotMatch(f.out(), /busy|Overriding/);
    assert.equal(f.state.running, false);
  }
});

test('a stopped or missing service is never asked: exit 0 "already stopped", exit 4 not installed', async () => {
  const f = fake('linux', { busy: busyAnswer({ import: 1, judge: 0, ai: 0 }) });
  assert.equal(await service(f.ctx, ['stop'], {}, undefined).catch((e: { exitCode?: number }) => e.exitCode), 4);
  await service(f.ctx, ['install'], {}, undefined);
  await service(f.ctx, ['stop'], { force: '1' }, undefined);
  f.busyAsked.length = 0;
  assert.equal(await service(f.ctx, ['stop'], {}, undefined), 0);
  assert.match(f.out(), /already stopped/);
  assert.deepEqual(f.busyAsked, []);
});

test('--force is only for stop and restart: anywhere else it is a usage error', async () => {
  const f = fake('linux');
  for (const sub of ['start', 'uninstall', 'status', 'install', 'logs'])
    await assert.rejects(service(f.ctx, [sub], { force: '1' }, undefined), (e: Error) => e instanceof UsageError && /doesn't take --force/.test(e.message), sub);
});

test("launchd: bootout waits until launchd has let the job go before bootstrapping it again (D86)", async () => {
  const f = fake('darwin', { lingerPrints: 3 });
  await service(f.ctx, ['install'], {}, undefined);
  f.calls.length = 0;
  assert.equal(await service(f.ctx, ['restart'], {}, undefined), 0);
  const seq = f.calls.filter((c) => /bootout|bootstrap|kickstart|print/.test(c)).map((c) => c.split(' ')[1]);
  const out = seq.indexOf('bootout');
  // the job is still there for three prints after the bootout, and gone on the fourth; only then the bootstrap, once
  assert.deepEqual(seq.slice(out, out + 6), ['bootout', 'print', 'print', 'print', 'print', 'bootstrap']);
  assert.equal(seq.filter((s) => s === 'bootstrap').length, 1, 'no failed bootstrap to retry');
});

test("launchd: a job that never goes is waited for 10 s, then left to bootstrap's retries", async () => {
  const f = fake('darwin', { lingerPrints: 1000 });
  await service(f.ctx, ['install'], {}, undefined);
  f.calls.length = 0;
  assert.equal(await service(f.ctx, ['stop'], {}, undefined), 0);
  assert.equal(f.calls.filter((c) => c.startsWith('launchctl print')).length, 1 + 40, 'status, then 40 polls');
});
