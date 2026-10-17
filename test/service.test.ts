// `bragdoc service …` end to end, in-process, with everything that touches the machine injected: a fake launchctl /
// systemctl that keeps state, a fake health probe, a clock. Nothing here reaches a real service manager, and every
// file lands in a throwaway home.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { UsageError } from '../server/args.ts';
import { type Ctx, makeCtx } from '../server/commands/context.ts';
import type { Probe } from '../server/commands/ready.ts';
import { service } from '../server/commands/service.ts';
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
}

/**
 * A ctx on a throwaway home with a fake service manager. `answer(port)` is what the health probe sees; by default
 * BragDoc answers exactly while the fake manager has it running.
 */
function fake(platform: NodeJS.Platform, o: { answer?: (port: number, f: Fake) => Probe; bootstrapFailures?: number; bootstrapCode?: number; failed?: boolean; env?: NodeJS.ProcessEnv; cliScript?: string; packageRoot?: string; noBus?: boolean } = {}): Fake {
  const h = tmpHome();
  homes.push(h.cleanup);
  let out = '';
  let clock = 0;
  let bootstrapFailures = o.bootstrapFailures ?? 0;
  const f: Fake = {
    home: h.home,
    calls: [],
    out: () => out,
    state: { loaded: false, running: false, pid: 0 },
    probes: [],
    streamed: [],
    followed: [],
    ctx: undefined as unknown as Ctx,
  };
  const ok = (stdout = ''): RunResult => ({ code: 0, stdout, stderr: '' });
  const up = () => Object.assign(f.state, { loaded: true, running: true, pid: f.state.pid + 1 });
  const run = async (cmd: string, args: string[]): Promise<RunResult> => {
    f.calls.push([cmd, ...args].join(' '));
    if (cmd === 'launchctl') {
      switch (args[0]) {
        case 'print':
          return f.state.loaded ? ok(`x = {\n\tstate = ${f.state.running ? 'running' : 'waiting'}\n${f.state.running ? `\tpid = ${f.state.pid}\n` : ''}}\n`) : { code: 113, stdout: '', stderr: 'Could not find service' };
        case 'bootstrap':
          if (bootstrapFailures-- > 0) return { code: o.bootstrapCode ?? 5, stdout: '', stderr: `Bootstrap failed: ${o.bootstrapCode ?? 5}: Input/output error` };
          up();
          return ok();
        case 'bootout':
          if (!f.state.loaded) return { code: 3, stdout: '', stderr: 'No such process' };
          Object.assign(f.state, { loaded: false, running: false });
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
  assert.match(f.out(), /journalctl --user -u bragdoc\.service -f/);

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

test('status with nothing installed says so and how to install (exit 0)', async () => {
  for (const platform of ['linux', 'darwin'] as const) {
    const f = fake(platform);
    assert.equal(await service(f.ctx, ['status'], {}, undefined), 0);
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

test('stop and uninstall on Linux: stop keeps it enabled; uninstall disables, removes, reloads', async () => {
  const f = fake('linux');
  await service(f.ctx, ['install'], {}, undefined);
  f.calls.length = 0;
  await service(f.ctx, ['stop'], {}, undefined);
  assert.ok(f.calls.includes('systemctl --user stop bragdoc.service'));
  assert.ok(!f.calls.some((c) => c.includes('disable')), 'stop is for now, not for the next login');
  f.calls.length = 0;
  await service(f.ctx, ['uninstall'], {}, undefined);
  assert.ok(f.calls.includes('systemctl --user disable --now --quiet bragdoc.service'));
  assert.ok(f.calls.includes('systemctl --user daemon-reload'));
  assert.equal(fs.existsSync(unitFile(f)), false);
});

test('start, stop, restart and logs need it installed (exit 1, with the install hint)', async () => {
  const f = fake('linux');
  for (const sub of ['start', 'stop', 'restart', 'logs']) await assert.rejects(service(f.ctx, [sub], {}, undefined), /isn't installed as a service.*bragdoc service install/);
});

test('logs: journalctl --user -u bragdoc.service -f on Linux; the log file followed on macOS', async () => {
  const l = fake('linux');
  await service(l.ctx, ['install'], {}, undefined);
  assert.equal(await service(l.ctx, ['logs'], {}, undefined), 0);
  assert.deepEqual(l.streamed, [['journalctl', '--user', '-u', 'bragdoc.service', '-f']]);

  const m = fake('darwin');
  await service(m.ctx, ['install'], {}, undefined);
  const log = path.join(m.home, '.bragdoc', 'service', 'bragdoc.log');
  fs.writeFileSync(log, Array.from({ length: 60 }, (_, i) => `line ${i}`).join('\n') + '\n');
  assert.equal(await service(m.ctx, ['logs'], {}, undefined), undefined, 'it keeps running');
  assert.deepEqual(m.followed, [log]);
  assert.match(m.out(), /line 10\n[\s\S]*line 59\n$/);
  assert.doesNotMatch(m.out(), /line 9\n/);
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
  await assert.rejects(service(f.ctx, ['status'], {}, undefined), /can't reach systemd's per-user instance.*XDG_RUNTIME_DIR/);
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
  await service(f.ctx, ['status'], {}, undefined);
  assert.match(f.out(), /State: {5}not running \(failed \(failed\)\), last exit status 1/);
});
