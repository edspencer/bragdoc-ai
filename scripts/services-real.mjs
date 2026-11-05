// `node scripts/services-real.mjs`: `bragdoc service` against the machine's REAL service manager (launchd on macOS,
// systemd's user instance on Linux), with the built CLI (dist/server/cli.js). Adapted from Hallway's
// scripts/services-real.mjs. CI only: it loads a real job into the real launchd / systemd under the real labels
// (ai.bragdoc.local, bragdoc.service), so it refuses to run unless CI=true and BRAGDOC_REAL_SERVICES=1, i.e. on a
// throwaway runner. It removes everything it installs.
//
// The home is a throwaway too (HOME and BRAGDOC_HOME in a temp dir), with one exception: on Linux the unit has to be
// where the user's systemd looks, which is the runner's real ~/.config/systemd/user, so XDG_CONFIG_HOME stays real.
//
// The lifecycle: install → health → status (the port, read from the unit; --json and its exit codes) → restart →
// SIGKILL and SIGTERM (KeepAlive / Restart=always brings it back both times, Paddock #872) → stop (still enabled: it
// comes back at the next login, cli-contract SPEC §1) → start → logs (the file, on both OSes: D85) → uninstall.
import { execFileSync, spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.env.CI !== 'true' || process.env.BRAGDOC_REAL_SERVICES !== '1') {
  console.error('services-real: refusing to run outside CI (set CI=true and BRAGDOC_REAL_SERVICES=1 on a throwaway machine)');
  process.exit(2);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'dist', 'server', 'cli.js');
assert.ok(fs.existsSync(cli), 'build first (npm run build)');
const darwin = process.platform === 'darwin';
const realConfig = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bragdoc-real-')));
const home = path.join(tmp, 'home');
const data = path.join(tmp, 'My Data'); // a space, so the unit's quoting is exercised for real
fs.mkdirSync(home);
const env = { ...process.env, HOME: home, BRAGDOC_HOME: data, ...(darwin ? {} : { XDG_CONFIG_HOME: realConfig }) };
for (const k of ['PORT', 'HOST', 'BRAGDOC_DEV', 'BRAGDOC_DANGEROUSLY_ALLOW_OPEN', 'NODE_OPTIONS']) delete env[k];
const unitFile = darwin ? path.join(home, 'Library', 'LaunchAgents', 'ai.bragdoc.local.plist') : path.join(realConfig, 'systemd', 'user', 'bragdoc.service');

const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const step = (s) => console.log(`services-real: ${s}`);
/** Run the CLI and return its exit code and output, whatever the code. */
const bdx = (...args) => {
  try {
    return { code: 0, stdout: execFileSync(process.execPath, [cli, ...args], { cwd: tmp, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (e) {
    return { code: e.status, stdout: String(e.stdout), stderr: String(e.stderr) };
  }
};
/** `service status --json`, asserting its exit code (cli-contract SPEC §2: 0 answering, 3 not running, 4 not installed). */
const statusJson = (code) => {
  const r = bdx('service', 'status', '--json');
  assert.equal(r.code, code, `service status --json exited ${r.code}, not ${code}:\n${r.stdout}\n${r.stderr ?? ''}`);
  return JSON.parse(r.stdout);
};
/** Is the service still enabled, i.e. will the next login start it? */
const enabled = () => {
  if (darwin) {
    // a booted-out agent is still enabled unless launchd's override database says otherwise
    const out = execFileSync('launchctl', ['print-disabled', `gui/${process.getuid()}`], { encoding: 'utf8' });
    return fs.existsSync(unitFile) && !/"ai\.bragdoc\.local" => (disabled|true)/.test(out);
  }
  const r = (() => {
    try {
      return execFileSync('systemctl', ['--user', 'is-enabled', 'bragdoc.service'], { encoding: 'utf8' });
    } catch (e) {
      return String(e.stdout);
    }
  })();
  return r.trim() === 'enabled';
};
const bd = (...args) => {
  try {
    return execFileSync(process.execPath, [cli, ...args], { cwd: tmp, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    throw new Error(`bragdoc ${args.join(' ')} exited ${e.status}:\n${e.stdout}\n${e.stderr}`);
  }
};
const freePort = () =>
  new Promise((resolve) => {
    const s = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(what, fn, ms = 45_000) {
  const end = Date.now() + ms;
  for (;;) {
    try {
      const v = await fn();
      if (v) return v;
    } catch {
      /* not yet */
    }
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
    await sleep(250);
  }
}
const health = async (url) => (await (await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(2000) })).json()).ok === true;
const down = async (url) => {
  try {
    await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(1000) });
    return false;
  } catch {
    return true;
  }
};
const pidOf = () => Number(/^State: +running, pid (\d+)/m.exec(bd('service', 'status'))?.[1]) || null;

/** Kill the service's process with `signal` and wait for the manager to bring it back with a new pid. */
async function killAndWait(url, signal) {
  const pid = await until('a pid in status', pidOf);
  process.kill(pid, signal);
  await until(`pid ${pid} to go`, () => {
    try {
      process.kill(pid, 0);
      return false;
    } catch {
      return true;
    }
  });
  const next = await until(`the service to come back after ${signal}`, async () => ((await health(url)) ? pidOf() : null), 60_000);
  assert.notEqual(next, pid);
  step(`${signal}: pid ${pid} → ${next}`);
}

try {
  const port = await freePort();
  const url = `http://localhost:${port}`;
  step(`${darwin ? `launchd (gui/${process.getuid()})` : 'systemd --user'}; port ${port}; data home ${data}`);

  step('service status, nothing installed: exit 4');
  const none = bdx('service', 'status');
  assert.equal(none.code, 4);
  assert.match(none.stdout, /isn't installed as a service/);
  assert.equal(statusJson(4).installed, false);
  for (const sub of ['start', 'stop', 'restart', 'logs']) assert.equal(bdx('service', sub).code, 4, `service ${sub} with nothing installed`);

  step('service install --dry-run writes nothing');
  assert.match(bd('service', 'install', '--dry-run', '--port', String(port)), /Dry run/);
  assert.equal(fs.existsSync(unitFile), false);

  step('service install');
  const installed = bd('service', 'install', '--port', String(port));
  console.log(installed);
  assert.match(installed, new RegExp(`is running at ${url}`));
  assert.ok(fs.existsSync(unitFile));
  assert.ok(await health(url));

  step('service status reads the port from the unit');
  const st = bd('service', 'status');
  console.log(st);
  assert.match(st, new RegExp(`URL: +${url}: BragDoc \\S+ is answering`));
  assert.match(st, /State: +running, pid \d+/);

  step('service status --json: exit 0, the versions, the port, the pid, the unit and the log');
  const up = statusJson(0);
  console.log(JSON.stringify(up, null, 2));
  assert.equal(up.installed, true);
  assert.equal(up.running, true);
  assert.equal(up.answering, true);
  assert.equal(up.installedVersion, version);
  assert.equal(up.runningVersion, version);
  assert.equal(up.port, port);
  assert.equal(up.url, url);
  assert.ok(Number.isInteger(up.pid) && up.pid > 0);
  assert.equal(up.unit, unitFile);
  assert.equal(up.log, path.join(data, 'service', 'bragdoc.log'));
  assert.deepEqual(up.warnings, []);

  step('busy: the idle service answers 0, through runtime.json and through --port (D86)');
  const idle = bdx('busy', '--json');
  assert.equal(idle.code, 0, idle.stderr);
  const answer = JSON.parse(idle.stdout);
  assert.equal(answer.running, true);
  assert.equal(answer.busy, false);
  assert.equal(answer.version, version);
  assert.deepEqual(answer.counts, { import: 0, judge: 0, ai: 0 });
  assert.equal(bdx('busy', '--port', String(port)).code, 0);

  step('service restart (idle, so the busy check lets it through; --force is accepted too)');
  assert.match(bd('service', 'restart'), new RegExp(`is running at ${url}`));
  assert.match(bd('service', 'restart', '--force'), new RegExp(`is running at ${url}`));

  // serve exits 0 on SIGTERM, so the second is the case a conditional KeepAlive / Restart=on-failure would leave down
  step('KeepAlive / Restart=always: a crash (SIGKILL) and a clean exit (SIGTERM, exit 0) both come back');
  await killAndWait(url, 'SIGKILL');
  await killAndWait(url, 'SIGTERM');

  step('service stop, then start');
  assert.ok(enabled(), 'enabled after install');
  assert.match(bd('service', 'stop'), /Stopped BragDoc/);
  await until('the service to stop', () => down(url));
  const stopped = bdx('service', 'status');
  assert.equal(stopped.code, 3, 'a stopped service: exit 3');
  assert.match(stopped.stdout, /State: +stopped/);
  assert.equal(statusJson(3).stopped, true);
  assert.equal(bdx('busy').code, 3, 'busy with the service stopped: nothing answers, exit 3');
  // cli-contract SPEC §1: stop doesn't disable, so the next login (or boot, with linger) starts it again
  assert.ok(enabled(), 'still enabled after stop');
  assert.ok(fs.existsSync(unitFile), 'stop keeps the unit');
  await sleep(2000);
  assert.ok(await down(url), 'a stopped service stays stopped');
  assert.match(bd('service', 'start'), new RegExp(`is running at ${url}`));

  step('service logs: the file, on both OSes (D85)');
  const log = path.join(data, 'service', 'bragdoc.log');
  assert.ok(fs.existsSync(log), `${log} exists`);
  const last = bd('service', 'logs', '-n', '200');
  console.log(last.slice(-2000));
  assert.match(last, new RegExp(`BragDoc \\S+: ${url}`));
  const logs = await new Promise((resolve) => {
    // its own process group, so nothing it started outlives the kill
    const child = spawn(process.execPath, [cli, 'service', 'logs', '-f', '-n', '0'], { env, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    // a restart writes a new banner while -f is following
    setTimeout(() => bdx('service', 'restart'), 1000);
    setTimeout(() => {
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch {
        child.kill();
      }
    }, 12_000);
    child.on('exit', () => {
      child.stdout.destroy();
      child.stderr.destroy();
      resolve(out);
    });
  });
  console.log(logs.slice(-2000));
  assert.match(logs, new RegExp(`BragDoc \\S+: ${url}`), '-f printed what the restarted service wrote');

  step('service uninstall');
  assert.match(bd('service', 'uninstall'), /Your data in .* is untouched/);
  await until('the service to go', () => down(url));
  assert.equal(fs.existsSync(unitFile), false);
  assert.equal(bdx('service', 'status').code, 4);
  assert.match(bd('service', 'uninstall'), /nothing to do/);
  step('ok');
} finally {
  // best effort, in case an assertion stopped the run halfway
  try {
    execFileSync(process.execPath, [cli, 'service', 'uninstall'], { cwd: tmp, env, stdio: 'ignore' });
  } catch {
    /* already gone */
  }
  const log = path.join(data, 'service', 'bragdoc.log');
  if (fs.existsSync(log)) console.log(`--- ${log}\n${fs.readFileSync(log, 'utf8').slice(-4000)}`);
  fs.rmSync(tmp, { recursive: true, force: true });
}
// a backstop: nothing this script started may keep the CI step alive once it's done
process.exit(process.exitCode ?? 0);
