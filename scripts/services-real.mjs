// `node scripts/services-real.mjs`: `bragdoc service` against the machine's REAL service manager (launchd on macOS,
// systemd's user instance on Linux), with the built CLI (dist/server/cli.js). Adapted from Hallway's
// scripts/services-real.mjs. CI only: it loads a real job into the real launchd / systemd under the real labels
// (ai.bragdoc.local, bragdoc.service), so it refuses to run unless CI=true and BRAGDOC_REAL_SERVICES=1, i.e. on a
// throwaway runner. It removes everything it installs.
//
// The home is a throwaway too (HOME and BRAGDOC_HOME in a temp dir), with one exception: on Linux the unit has to be
// where the user's systemd looks, which is the runner's real ~/.config/systemd/user, so XDG_CONFIG_HOME stays real.
//
// The lifecycle: install → health → status (the port, read from the unit) → restart → SIGKILL and SIGTERM (KeepAlive /
// Restart=always brings it back both times, Paddock #872) → stop → start → logs → uninstall.
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

const step = (s) => console.log(`services-real: ${s}`);
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

  step('service status, nothing installed');
  assert.match(bd('service', 'status'), /isn't installed as a service/);

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

  step('service restart');
  assert.match(bd('service', 'restart'), new RegExp(`is running at ${url}`));

  // serve exits 0 on SIGTERM, so the second is the case a conditional KeepAlive / Restart=on-failure would leave down
  step('KeepAlive / Restart=always: a crash (SIGKILL) and a clean exit (SIGTERM, exit 0) both come back');
  await killAndWait(url, 'SIGKILL');
  await killAndWait(url, 'SIGTERM');

  step('service stop, then start');
  assert.match(bd('service', 'stop'), /Stopped BragDoc/);
  await until('the service to stop', () => down(url));
  assert.match(bd('service', 'status'), /State: +stopped/);
  await sleep(2000);
  assert.ok(await down(url), 'a stopped service stays stopped');
  assert.match(bd('service', 'start'), new RegExp(`is running at ${url}`));

  step('service logs');
  const logs = await new Promise((resolve) => {
    // its own process group, so the kill reaches `journalctl -f` too: a grandchild left holding our pipes would keep
    // this script alive until the job's timeout
    const child = spawn(process.execPath, [cli, 'service', 'logs'], { env, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    setTimeout(() => {
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch {
        child.kill();
      }
    }, 3000);
    child.on('exit', () => {
      child.stdout.destroy();
      child.stderr.destroy();
      resolve(out);
    });
  });
  console.log(logs.slice(-2000));
  // the user journal isn't always readable on a CI runner; the file on macOS always is
  if (darwin) assert.match(logs, new RegExp(`BragDoc on ${url}`));

  step('service uninstall');
  assert.match(bd('service', 'uninstall'), /Your data in .* is untouched/);
  await until('the service to go', () => down(url));
  assert.equal(fs.existsSync(unitFile), false);
  assert.match(bd('service', 'status'), /isn't installed as a service/);
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
