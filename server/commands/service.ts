// `bragdoc service install | uninstall | status | start | stop | restart | logs`: BragDoc as a per-user login service,
// a LaunchAgent on macOS and a systemd user unit on Linux (SPEC R1). The writers are server/platform/; this file is
// the dispatch and what people read. Adapted from Hallway's server/commands/services.ts (the daemon half) and Paddock's
// packages/server/src/cli/service/index.ts (its lessons: the npx refusal, waiting for /api/health before saying
// "running", reading the port back from the installed unit, "starts at login, not boot").
import fs from 'node:fs';
import { posix as path } from 'node:path';
import { EXIT_NOT_INSTALLED, EXIT_NOT_RUNNING, ExitError, UsageError, check } from '../args.js';
import { DEFAULT_PORT, parsePort } from '../port.js';
import { VERSION, resolveDataDir } from '../paths.js';
import { type ServiceManager, type ServiceStatus, managerFor } from '../platform/index.js';
import { servicePath } from '../platform/path.js';
import { buildSpec, readArgv, serviceDir, stableNodePath, transientInstall, transientRefusal } from '../platform/spec.js';
import { type Ctx, lastLines, show } from './context.js';
import { guardBusy } from './busy-client.js';
import { readUpdateCheck, updateNotice, updateSummary, type UpdateSummary } from '../update/update-check.js';
import { READY_TIMEOUT_LABEL, waitForReady } from './ready.js';

const SERVICE_USAGE = 'service needs one of: install, uninstall, status, start, stop, restart, logs';

export async function service(ctx: Ctx, pos: string[], flags: Record<string, string>, rest: string[] | undefined): Promise<number | undefined> {
  const [sub, ...args] = pos;
  // usage first (exit 2 on any OS), then the platform (Windows: exit 1, "not supported yet")
  switch (sub) {
    case 'install':
      check('service install', flags, ['port', 'data-dir', 'dry-run', 'refresh'], args, 0, rest);
      return install(ctx, flags);
    case 'status':
      check('service status', flags, ['json'], args, 0, rest);
      return status(ctx, manager(ctx), !!flags.json);
    case 'logs': {
      check('service logs', flags, ['follow', 'lines'], args, 0, rest);
      const n = flags.lines === undefined ? 50 : Number(flags.lines);
      if (!Number.isInteger(n) || n < 0) throw new UsageError(`--lines must be a whole number, not '${flags.lines}'`);
      return logs(ctx, manager(ctx), { follow: !!flags.follow, lines: n });
    }
    case 'uninstall':
    case 'start':
    case 'stop':
    case 'restart': {
      // --force is stop's and restart's: they're the two that ask whether BragDoc is busy first (SPEC §1, §4).
      // uninstall doesn't ask: removing the service is an explicit act
      check(`service ${sub}`, flags, sub === 'stop' || sub === 'restart' ? ['force'] : [], args, 0, rest);
      const mgr = manager(ctx);
      return { uninstall, start: startOrRestart, restart: startOrRestart, stop }[sub](ctx, mgr, sub, !!flags.force);
    }
    default:
      throw new UsageError(sub ? `unknown service command '${sub}'; ${SERVICE_USAGE}` : SERVICE_USAGE);
  }
}

export const manager = (ctx: Ctx) => managerFor({ platform: ctx.platform, homedir: ctx.homedir, env: ctx.env, uid: ctx.uid, run: ctx.run, sleep: ctx.sleep });
export const urlOf = (port: number) => `http://localhost:${port}`;
const AT_LOGIN = 'BragDoc starts when you log in, not when the computer boots.';

/** How to read the logs, for people. */
function logsHint(ctx: Ctx, mgr: ServiceManager, dataDir: string): string {
  const src = mgr.logs({ log: buildLog(dataDir) });
  return 'file' in src ? `bragdoc service logs (${show(src.file, ctx.homedir)})` : `bragdoc service logs (${[src.command[0], ...src.command[1]].join(' ')})`;
}
export const buildLog = (dataDir: string) => `${serviceDir(dataDir)}/bragdoc.log`;

/** The data home an installed unit serves: the one it names, else the default (the service's env names none). */
export const installedDataDir = (ctx: Ctx, st: ServiceStatus) => readArgv(st.argv).dataDir ?? resolveDataDir(undefined, {}, ctx.homedir);

/**
 * Stopped on purpose (or never started), as opposed to between restarts: launchd's booted-out job isn't loaded at all;
 * systemd's stays loaded and `inactive`. A job waiting to be restarted isn't stopped, and nor is a `failed` one: status
 * shows that as not running, with its exit status.
 */
function isStopped(mgr: ServiceManager, st: ServiceStatus): boolean {
  if (st.running) return false;
  return mgr.kind === 'launchd' ? !st.loaded : !st.loaded || /^inactive\b/.test(st.state ?? 'inactive');
}

/**
 * Before stop and restart: is the service's BragDoc busy (D86)? Asked on the port the INSTALLED unit names, not
 * through runtime.json, which a BragDoc in a terminal on the same data home may have written since. Exit 75 when it is,
 * unless --force. Nothing answering, or an older BragDoc with no /api/busy, goes ahead.
 */
function busyGuard(ctx: Ctx, st: ServiceStatus, force: boolean): Promise<number | null> {
  return guardBusy({ dataDir: installedDataDir(ctx, st), port: readArgv(st.argv).port, get: ctx.loopback, io: ctx, force });
}

/** Why the installed unit is stale (its Node or CLI has gone, or it's an older format), or null. */
function staleUnit(mgr: ServiceManager, st: ServiceStatus): string | null {
  const gone = st.argv.slice(0, 2).find((f) => !fs.existsSync(f));
  if (gone) return `the service runs ${gone}, which no longer exists.`;
  const older = mgr.stale();
  // its first sentence: the "run `service install` again" that follows is what this restart is about to do
  return older ? `${older.split('. Run ')[0]}.` : null;
}

/** assertInstallable, as a yes or no. */
function installable(ctx: Ctx): boolean {
  try {
    assertInstallable(ctx);
    return true;
  } catch {
    return false;
  }
}

/** start, stop, restart and logs on a service that isn't there: exit 4 (cli-contract SPEC §2, D85). */
function notInstalled(ctx: Ctx, mgr: ServiceManager): Error {
  return new ExitError(`BragDoc isn't installed as a service (there's no ${show(mgr.file, ctx.homedir)}). \`bragdoc service install\` sets it up.`, EXIT_NOT_INSTALLED);
}

/**
 * The version of the BragDoc a unit runs, from the package.json above its cli.js (`<root>/dist/server/cli.js`), or null
 * when that's gone or isn't BragDoc's. It can differ from the running one: an upgrade the service hasn't restarted for.
 */
export function installedVersion(cli: string | undefined): string | null {
  if (!cli) return null;
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(path.dirname(path.dirname(path.dirname(cli))), 'package.json'), 'utf8')) as { name?: string; version?: string };
    return pkg.name === '@bragdoc/local' && typeof pkg.version === 'string' ? pkg.version : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// install
// ---------------------------------------------------------------------------------------------------------------

/** Refuses (throws) where this CLI can't be what a unit runs: a checkout's server/cli.ts, or npx's cache. */
function assertInstallable(ctx: Ctx): void {
  // from a checkout, the CLI is server/cli.ts, which only runs under tsx: a unit can't run it
  if (!ctx.cliScript.endsWith('.js'))
    throw new Error(`a service runs the built CLI, and this is ${show(ctx.cliScript, ctx.homedir)}. Run \`npm run build\`, then \`node dist/server/cli.js service install\`.`);
  const transient = transientInstall(ctx.packageRoot) ?? transientInstall(ctx.cliScript);
  if (transient) throw new Error(transientRefusal(transient));
}

/** The unit this CLI writes, run by this Node, for `port` and `dataDir` (written in only when `chosen`). */
function specFor(ctx: Ctx, port: number, dataDir: string, chosen: boolean) {
  const nodePath = stableNodePath(ctx.node.path, fs.existsSync);
  return buildSpec({
    nodePath,
    nodeVersion: ctx.node.version,
    cliScript: ctx.cliScript,
    dataDir,
    dataDirChosen: chosen,
    port,
    pathEnv: servicePath(path.dirname(nodePath), ctx.env.PATH),
  });
}

/**
 * The settings an installed unit records (D88): its port and, if it names one, its data home. Not the invoking
 * shell's flags or $BRAGDOC_HOME: `--refresh` (which `bragdoc update` runs through the new CLI) and a restart of a
 * stale unit re-render the service that's there, not a new one.
 */
function recorded(ctx: Ctx, st: ServiceStatus): { port: number; dataDir: string; chosen: boolean } {
  const { port, dataDir } = readArgv(st.argv);
  return { port, dataDir: dataDir ?? resolveDataDir(undefined, {}, ctx.homedir), chosen: dataDir !== null };
}

async function install(ctx: Ctx, flags: Record<string, string>): Promise<number> {
  let port = DEFAULT_PORT;
  if (flags.port !== undefined) {
    const p = parsePort(flags.port);
    if (p === null || p === 0) throw new UsageError(`--port must be a port number (1-65535), not '${flags.port}'`);
    port = p;
  }
  if (flags['data-dir'] === '') throw new UsageError('--data-dir needs a directory');
  const mgr = manager(ctx);
  const refresh = !!flags.refresh;
  let dataDir: string;
  let chosen: boolean;
  if (refresh) {
    // re-render what's installed (cli-contract SPEC 0.2 §1): its port and data home, with any flag given winning.
    // Nothing installed is exit 4, not a first install with defaults
    const st = await mgr.status();
    if (!st.installed) throw notInstalled(ctx, mgr);
    const r = recorded(ctx, st);
    if (flags.port === undefined) port = r.port;
    chosen = flags['data-dir'] !== undefined || r.chosen;
    dataDir = flags['data-dir'] !== undefined ? resolveDataDir(flags['data-dir'], {}, ctx.homedir) : r.dataDir;
  } else {
    // a data home named on the command line or in $BRAGDOC_HOME is written into the unit, since the service won't
    // inherit this shell's environment; with neither, the unit names none, so it and a terminal `bragdoc` share ~/.bragdoc
    const named = flags['data-dir'] || ctx.env.BRAGDOC_HOME || undefined;
    dataDir = resolveDataDir(named, {}, ctx.homedir);
    chosen = named !== undefined;
  }
  assertInstallable(ctx);
  const spec = specFor(ctx, port, dataDir, chosen);
  const url = urlOf(port);

  if (flags['dry-run']) {
    ctx.out(
      [
        `Dry run: nothing is written and nothing is started.`,
        '',
        `bragdoc service install would create ${show(spec.cwd, ctx.homedir)}/ and write ${show(mgr.file, ctx.homedir)}:`,
        '',
        mgr.render(spec).trimEnd(),
        '',
        'then run:',
        ...mgr.installCommands().map((c) => `  ${c}`),
        '',
        `and wait for ${url} to answer. ${AT_LOGIN}`,
        '',
      ].join('\n'),
    );
    return 0;
  }

  // something else on the port would leave the service crash-looping (restarted every 10 s, "running" in between)
  const before = await mgr.status();
  if (!(before.running && readArgv(before.argv).port === port)) {
    const p = await ctx.probe(port);
    if (p.kind === 'bragdoc')
      throw new Error(`BragDoc ${p.version} is already running on port ${port}, outside the service (in a terminal?). Stop it first, or install on another port with --port <n>.`);
    if (p.kind === 'other') throw new Error(`port ${port} is already in use by something that isn't BragDoc. Stop it, or install on another port with --port <n>.`);
  }

  ctx.out(`${refresh ? 'Re-writing' : 'Installing BragDoc as'} ${refresh ? `BragDoc's ${mgr.noun}` : `a ${mgr.noun}`} (${show(mgr.file, ctx.homedir)})…\n`);
  // bootstrap is followed by macOS registering the background item, a few silent seconds (Paddock #861)
  if (mgr.kind === 'launchd') ctx.out('macOS may take a few seconds to approve the background item.\n');
  await mgr.install(spec);
  ctx.out(`Waiting for ${url} to answer…\n`);
  const w = await waitForReady(port, { probe: ctx.probe, sleep: ctx.sleep, now: ctx.now });
  if (refresh) {
    // `bragdoc update` hands over through this, and rolls back when it fails: so "it didn't answer" is a failure here
    if (!w.ready) throw new Error(`the service was re-written, but ${url} didn't answer within ${READY_TIMEOUT_LABEL}. ${logsHint(ctx, mgr, dataDir)} says why.`);
    ctx.out(`BragDoc ${w.version} is running at ${url}\n`);
    return 0;
  }
  ctx.out(
    [
      '',
      w.ready
        ? `BragDoc ${w.version} is running at ${url}`
        : `BragDoc is installed, but ${url} didn't answer within ${READY_TIMEOUT_LABEL}. It may still be starting, or failing to start: the logs say which.`,
      `Data home: ${show(dataDir, ctx.homedir)}`,
      `Logs:      ${logsHint(ctx, mgr, dataDir)}`,
      '',
      mgr.lifetime,
      '',
      '  bragdoc service status      is it up, and where',
      '  bragdoc service restart     restart it (after an upgrade, say)',
      '  bragdoc service uninstall   stop it and remove the service; your data stays',
      '',
    ].join('\n'),
  );
  return 0;
}

// ---------------------------------------------------------------------------------------------------------------
// uninstall, status, start, restart, stop, logs
// ---------------------------------------------------------------------------------------------------------------

async function uninstall(ctx: Ctx, mgr: ServiceManager): Promise<number> {
  const st = await mgr.status();
  // a loaded job without its file (deleted by hand) is still removed from the manager
  if (!st.installed && !st.loaded) {
    ctx.out(`BragDoc isn't installed as a service (there's no ${show(mgr.file, ctx.homedir)}); nothing to do.\n`);
    return 0;
  }
  await mgr.uninstall();
  const dataDir = installedDataDir(ctx, st);
  ctx.out(
    `Stopped BragDoc's service and removed ${show(mgr.file, ctx.homedir)}.\n` +
      `Your data in ${show(dataDir, ctx.homedir)} is untouched${mgr.kind === 'launchd' ? `, and so is the service's log in ${show(serviceDir(dataDir), ctx.homedir)}/` : ''}.\n`,
  );
  return 0;
}

/** `service status --json` (cli-contract SPEC §1). Every path is absolute; null where it doesn't apply. */
export interface ServiceStatusReport {
  installed: boolean;
  /** The manager knows it and it has a process. */
  running: boolean;
  /** BragDoc answers /api/health on the unit's port. */
  answering: boolean;
  manager: ServiceManager['kind'];
  /** The plist or unit. */
  unit: string;
  /** The manager's own word for its state (`running`, `active (running)`, `inactive (dead)`), or null. */
  state: string | null;
  /** Stopped on purpose (`service stop`), rather than failing or between restarts. */
  stopped: boolean;
  pid: number | null;
  lastExitCode: number | null;
  /** The version the unit runs (its package.json), and the version that's answering. */
  installedVersion: string | null;
  runningVersion: string | null;
  port: number | null;
  url: string | null;
  dataDir: string | null;
  /** The file `service logs` reads; null while an older systemd unit still logs to the journal. */
  log: string | null;
  warnings: string[];
  /**
   * What the last `bragdoc update --check` or `doctor` found (`<data home>/update-check.json`), never asked of the
   * registry here (D87). Left out, not null, when there's nothing to repeat (cli-contract SPEC §1).
   */
  update?: UpdateSummary;
}

/** The cached update check worth repeating for this data home, as `{ update }`, or `{}`. */
const updateOf = (dataDir: string): { update?: UpdateSummary } => {
  const update = updateSummary(dataDir, { currentVersion: VERSION });
  return update ? { update } : {};
};

export async function statusReport(ctx: Ctx, mgr: ServiceManager): Promise<ServiceStatusReport> {
  const st = await mgr.status();
  if (!st.installed) {
    return { installed: false, running: false, answering: false, stopped: false, manager: mgr.kind, unit: mgr.file, state: null, pid: null, lastExitCode: null, installedVersion: null, runningVersion: null, port: null, url: null, dataDir: null, log: null, warnings: [], ...updateOf(resolveDataDir(undefined, ctx.env, ctx.homedir)) };
  }
  // everything here is read back out of the INSTALLED unit, not recomputed from today's flags (Paddock): the port in
  // the file is the port the service is on
  const { port } = readArgv(st.argv);
  const dataDir = installedDataDir(ctx, st);
  const p = await ctx.probe(port);
  const src = mgr.logs({ log: buildLog(dataDir) });
  const warnings: string[] = [];
  // the Node or the CLI the unit runs has gone (a Node upgrade, an uninstalled package): it can't start any more
  for (const f of st.argv.slice(0, 2).filter((f) => !fs.existsSync(f))) warnings.push(`the service runs ${f}, which no longer exists. Run \`bragdoc service install\` again.`);
  if (p.kind === 'other') warnings.push(otherAnswering(port));
  const stale = mgr.stale();
  if (stale) warnings.push(stale);
  return {
    installed: true,
    running: st.running,
    answering: p.kind === 'bragdoc',
    stopped: isStopped(mgr, st),
    manager: mgr.kind,
    unit: mgr.file,
    state: st.state,
    pid: st.pid,
    lastExitCode: st.lastExitCode,
    installedVersion: installedVersion(st.argv[1]),
    runningVersion: p.kind === 'bragdoc' ? p.version : null,
    port,
    url: urlOf(port),
    dataDir,
    log: 'file' in src ? src.file : null,
    warnings,
    ...updateOf(dataDir),
  };
}

/** SPEC §3's notice, on stderr, when the last check found a newer version: the prose `status` repeats from the cache. */
function sayUpdate(ctx: Ctx, r: ServiceStatusReport): void {
  if (!r.update?.updateAvailable) return;
  const cached = readUpdateCheck(r.dataDir ?? resolveDataDir(undefined, ctx.env, ctx.homedir));
  ctx.err(
    updateNotice({ name: 'BragDoc', current: VERSION, target: r.update.latest, command: cached?.command ?? 'bragdoc update', changelog: cached?.changelog ?? null }) + '\n',
  );
}

const otherAnswering = (port: number) => `something that isn't BragDoc is answering on port ${port}.`;

/** Exit 0 answering, 3 not running or not answering, 4 not installed (cli-contract SPEC §2, D85), with or without --json. */
async function status(ctx: Ctx, mgr: ServiceManager, json: boolean): Promise<number> {
  const r = await statusReport(ctx, mgr);
  const code = !r.installed ? EXIT_NOT_INSTALLED : r.running && r.answering ? 0 : EXIT_NOT_RUNNING;
  if (json) {
    ctx.out(JSON.stringify(r, null, 2) + '\n');
    return code;
  }
  sayUpdate(ctx, r);
  if (!r.installed) {
    ctx.out(
      `BragDoc isn't installed as a service (there's no ${show(mgr.file, ctx.homedir)}).\n` +
        `\`bragdoc service install\` sets it up as a ${mgr.noun}. ${AT_LOGIN}\n`,
    );
    return code;
  }
  const state = r.running
    ? `running${r.pid ? `, pid ${r.pid}` : ''}`
    : r.stopped
      ? 'stopped (`bragdoc service start` starts it)'
      : `not running${r.state ? ` (${r.state})` : ''}${r.lastExitCode !== null ? `, last exit status ${r.lastExitCode}` : ''}`;
  const other = otherAnswering(r.port!);
  const answer = r.answering ? `BragDoc ${r.runningVersion} is answering` : r.warnings.includes(other) ? "something that isn't BragDoc is answering" : 'nothing is answering';
  // an upgrade the service hasn't been restarted for
  const behind = r.answering && r.installedVersion && r.installedVersion !== r.runningVersion ? ` (${r.installedVersion} is installed: \`bragdoc service restart\`)` : '';
  ctx.out(
    [
      `Service:   ${show(mgr.file, ctx.homedir)} (a ${mgr.noun})`,
      `State:     ${state}`,
      `URL:       ${r.url}: ${answer}${behind}`,
      `Version:   ${r.installedVersion ?? 'unknown (its package.json is missing)'}`,
      `Data home: ${show(r.dataDir!, ctx.homedir)}`,
      `Logs:      ${logsHint(ctx, mgr, r.dataDir!)}`,
      ...r.warnings.filter((w) => w !== other).map((w) => `Warning:   ${w}`),
      '',
      mgr.lifetime,
      '',
    ].join('\n'),
  );
  return code;
}

/** start and restart: both WAIT for /api/health before saying "running", since neither manager's "started" means that. */
async function startOrRestart(ctx: Ctx, mgr: ServiceManager, action: string, force = false): Promise<number> {
  const before = await mgr.status();
  if (!before.installed) throw notInstalled(ctx, mgr);
  const { port } = readArgv(before.argv);
  const url = urlOf(port);
  if (action === 'start' && before.running) {
    ctx.out(`BragDoc is already running${before.pid ? ` (pid ${before.pid})` : ''} at ${url}\n`);
    return 0;
  }
  if (action === 'restart') {
    const refused = await busyGuard(ctx, before, force);
    if (refused !== null) return refused;
  }
  const stale = action === 'restart' ? staleUnit(mgr, before) : null;
  if (action === 'start') await mgr.start();
  else if (stale && installable(ctx)) {
    // restart re-renders a stale unit first (cli-contract SPEC §1): one whose Node or CLI has gone, or an older format.
    // From the settings it records, by this CLI; install() restarts what's running
    ctx.err(`bragdoc: ${stale} Re-writing it for this BragDoc (${VERSION}) first.\n`);
    const r = recorded(ctx, before);
    await mgr.install(specFor(ctx, r.port, r.dataDir, r.chosen));
  } else await mgr.restart();
  const w = await waitForReady(port, { probe: ctx.probe, sleep: ctx.sleep, now: ctx.now });
  const verb = action === 'start' ? 'started' : 'restarted';
  if (w.ready) ctx.out(`BragDoc ${w.version} is running at ${url}\n`);
  else ctx.out(`BragDoc was ${verb}, but ${url} didn't answer within ${READY_TIMEOUT_LABEL}. It may still be starting: \`bragdoc service status\`, and ${logsHint(ctx, mgr, installedDataDir(ctx, before))}.\n`);
  return 0;
}

async function stop(ctx: Ctx, mgr: ServiceManager, _action: string, force = false): Promise<number> {
  const st = await mgr.status();
  if (!st.installed) throw notInstalled(ctx, mgr);
  if (isStopped(mgr, st)) {
    ctx.out('BragDoc is already stopped.\n');
    return 0;
  }
  const refused = await busyGuard(ctx, st, force);
  if (refused !== null) return refused;
  await mgr.stop();
  ctx.out(
    `Stopped BragDoc. The service is still installed, so it starts again at your next login${mgr.kind === 'systemd' ? ' (or the next boot, with lingering on)' : ''}, or now with \`bragdoc service start\`.\n`,
  );
  return 0;
}

/** The last `lines` of the log file and, with -f, what's appended after (cli-contract SPEC §1). */
async function logs(ctx: Ctx, mgr: ServiceManager, o: { follow: boolean; lines: number }): Promise<number | undefined> {
  const st = await mgr.status();
  if (!st.installed) throw notInstalled(ctx, mgr);
  const src = mgr.logs({ log: buildLog(installedDataDir(ctx, st)) });
  if ('command' in src) {
    // a systemd unit from before D85 logs to the journal until it's reinstalled
    ctx.err(`bragdoc: ${mgr.stale()}\n`);
    const [bin, args] = src.command;
    const code = await ctx.stream(bin, [...args.filter((a) => a !== '-f'), '-n', String(o.lines), ...(o.follow ? ['-f'] : [])]);
    if (code === 127) throw new Error(`${bin} isn't installed; the service's output is in the systemd journal`);
    return code;
  }
  const tail = o.lines > 0 ? lastLines(src.file, o.lines) : '';
  if (tail) ctx.out(tail);
  else if (!fs.existsSync(src.file)) ctx.err(`bragdoc: nothing in ${show(src.file, ctx.homedir)} yet${o.follow ? '; waiting for more' : ''}\n`);
  if (!o.follow) return 0;
  ctx.follow(src.file, (s) => ctx.out(s));
  return undefined; // runs until interrupted, like tail -f
}
