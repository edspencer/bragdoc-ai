// `bragdoc service install | uninstall | status | start | stop | restart | logs`: BragDoc as a per-user login service,
// a LaunchAgent on macOS and a systemd user unit on Linux (SPEC R1). The writers are server/platform/; this file is
// the dispatch and what people read. Adapted from Hallway's server/commands/services.ts (the daemon half) and Paddock's
// packages/server/src/cli/service/index.ts (its lessons: the npx refusal, waiting for /api/health before saying
// "running", reading the port back from the installed unit, "starts at login, not boot").
import fs from 'node:fs';
import { posix as path } from 'node:path';
import { UsageError, check } from '../args.js';
import { DEFAULT_PORT, parsePort } from '../port.js';
import { resolveDataDir } from '../paths.js';
import { type ServiceManager, type ServiceStatus, managerFor } from '../platform/index.js';
import { servicePath } from '../platform/path.js';
import { buildSpec, readArgv, serviceDir, transientInstall, transientRefusal } from '../platform/spec.js';
import { type Ctx, lastLines, show } from './context.js';
import { waitForReady } from './ready.js';

const SERVICE_USAGE = 'service needs one of: install, uninstall, status, start, stop, restart, logs';

export async function service(ctx: Ctx, pos: string[], flags: Record<string, string>, rest: string[] | undefined): Promise<number | undefined> {
  const [sub, ...args] = pos;
  // usage first (exit 2 on any OS), then the platform (Windows: exit 1, "not supported yet")
  switch (sub) {
    case 'install':
      check('service install', flags, ['port', 'data-dir', 'dry-run'], args, 0, rest);
      return install(ctx, flags);
    case 'uninstall':
    case 'status':
    case 'start':
    case 'stop':
    case 'restart':
    case 'logs': {
      check(`service ${sub}`, flags, [], args, 0, rest);
      const mgr = manager(ctx);
      return { uninstall, status, start: startOrRestart, restart: startOrRestart, stop, logs }[sub](ctx, mgr, sub);
    }
    default:
      throw new UsageError(sub ? `unknown service command '${sub}'; ${SERVICE_USAGE}` : SERVICE_USAGE);
  }
}

const manager = (ctx: Ctx) => managerFor({ platform: ctx.platform, homedir: ctx.homedir, env: ctx.env, uid: ctx.uid, run: ctx.run, sleep: ctx.sleep });
const urlOf = (port: number) => `http://localhost:${port}`;
const AT_LOGIN = 'BragDoc starts when you log in, not when the computer boots.';

/** How to read the logs, for people. */
function logsHint(ctx: Ctx, mgr: ServiceManager, dataDir: string): string {
  const src = mgr.logs({ log: buildLog(dataDir) });
  return 'file' in src ? `bragdoc service logs (${show(src.file, ctx.homedir)})` : `bragdoc service logs (${[src.command[0], ...src.command[1]].join(' ')})`;
}
const buildLog = (dataDir: string) => `${serviceDir(dataDir)}/bragdoc.log`;

/** The data home an installed unit serves: the one it names, else the default (the service's env names none). */
const installedDataDir = (ctx: Ctx, st: ServiceStatus) => readArgv(st.argv).dataDir ?? resolveDataDir(undefined, {}, ctx.homedir);

/**
 * Stopped on purpose (or never started), as opposed to between restarts: launchd's booted-out job isn't loaded at all;
 * systemd's stays loaded, `inactive` or `failed`. A job that's loaded but waiting to be restarted isn't stopped.
 */
function isStopped(mgr: ServiceManager, st: ServiceStatus): boolean {
  if (st.running) return false;
  return mgr.kind === 'launchd' ? !st.loaded : !st.loaded || /^(inactive|failed)\b/.test(st.state ?? 'inactive');
}

function notInstalled(ctx: Ctx, mgr: ServiceManager): Error {
  return new Error(`BragDoc isn't installed as a service (there's no ${show(mgr.file, ctx.homedir)}). \`bragdoc service install\` sets it up.`);
}

// ---------------------------------------------------------------------------------------------------------------
// install
// ---------------------------------------------------------------------------------------------------------------

async function install(ctx: Ctx, flags: Record<string, string>): Promise<number> {
  let port = DEFAULT_PORT;
  if (flags.port !== undefined) {
    const p = parsePort(flags.port);
    if (p === null || p === 0) throw new UsageError(`--port must be a port number (1-65535), not '${flags.port}'`);
    port = p;
  }
  if (flags['data-dir'] === '') throw new UsageError('--data-dir needs a directory');
  const mgr = manager(ctx);
  // from a checkout, the CLI is server/cli.ts, which only runs under tsx: a unit can't run it
  if (!ctx.cliScript.endsWith('.js'))
    throw new Error(`a service runs the built CLI, and this is ${show(ctx.cliScript, ctx.homedir)}. Run \`npm run build\`, then \`node dist/server/cli.js service install\`.`);
  const transient = transientInstall(ctx.packageRoot) ?? transientInstall(ctx.cliScript);
  if (transient) throw new Error(transientRefusal(transient));

  // a data home named on the command line or in $BRAGDOC_HOME is written into the unit, since the service won't
  // inherit this shell's environment; with neither, the unit names none, so it and a terminal `bragdoc` share ~/.bragdoc
  const chosen = flags['data-dir'] || ctx.env.BRAGDOC_HOME || undefined;
  const dataDir = resolveDataDir(chosen, {}, ctx.homedir);
  const spec = buildSpec({
    nodePath: ctx.node.path,
    nodeVersion: ctx.node.version,
    cliScript: ctx.cliScript,
    dataDir,
    dataDirChosen: chosen !== undefined,
    port,
    pathEnv: servicePath(path.dirname(ctx.node.path), ctx.env.PATH),
  });
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

  ctx.out(`Installing BragDoc as a ${mgr.noun} (${show(mgr.file, ctx.homedir)})…\n`);
  // bootstrap is followed by macOS registering the background item, a few silent seconds (Paddock #861)
  if (mgr.kind === 'launchd') ctx.out('macOS may take a few seconds to approve the background item.\n');
  await mgr.install(spec);
  ctx.out(`Waiting for ${url} to answer…\n`);
  const w = await waitForReady(port, { probe: ctx.probe, sleep: ctx.sleep, now: ctx.now });
  ctx.out(
    [
      '',
      w.ready
        ? `BragDoc ${w.version} is running at ${url}`
        : `BragDoc is installed, but ${url} didn't answer within 20 seconds. It may still be starting, or failing to start: the logs say which.`,
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

async function status(ctx: Ctx, mgr: ServiceManager): Promise<number> {
  const st = await mgr.status();
  if (!st.installed) {
    ctx.out(
      `BragDoc isn't installed as a service (there's no ${show(mgr.file, ctx.homedir)}).\n` +
        `\`bragdoc service install\` sets it up as a ${mgr.noun}. ${AT_LOGIN}\n`,
    );
    return 0;
  }
  // everything here is read back out of the INSTALLED unit, not recomputed from today's flags (Paddock): the port in
  // the file is the port the service is on
  const { port } = readArgv(st.argv);
  const dataDir = installedDataDir(ctx, st);
  const p = await ctx.probe(port);
  const state = st.running
    ? `running${st.pid ? `, pid ${st.pid}` : ''}`
    : isStopped(mgr, st)
      ? 'stopped (`bragdoc service start` starts it)'
      : `not running${st.state ? ` (${st.state})` : ''}${st.lastExitCode !== null ? `, last exit status ${st.lastExitCode}` : ''}`;
  const answer = p.kind === 'bragdoc' ? `BragDoc ${p.version} is answering` : p.kind === 'other' ? "something that isn't BragDoc is answering" : 'nothing is answering';
  // the Node or the CLI the unit runs has gone (a Node upgrade, an uninstalled package): it can't start any more
  const gone = st.argv.slice(0, 2).filter((f) => !fs.existsSync(f));
  ctx.out(
    [
      `Service:   ${show(mgr.file, ctx.homedir)} (a ${mgr.noun})`,
      `State:     ${state}`,
      `URL:       ${urlOf(port)}: ${answer}`,
      `Data home: ${show(dataDir, ctx.homedir)}`,
      `Logs:      ${logsHint(ctx, mgr, dataDir)}`,
      ...gone.map((f) => `Warning:   the service runs ${f}, which no longer exists. Run \`bragdoc service install\` again.`),
      '',
      mgr.lifetime,
      '',
    ].join('\n'),
  );
  return 0;
}

/** start and restart: both WAIT for /api/health before saying "running", since neither manager's "started" means that. */
async function startOrRestart(ctx: Ctx, mgr: ServiceManager, action: string): Promise<number> {
  const before = await mgr.status();
  if (!before.installed) throw notInstalled(ctx, mgr);
  const { port } = readArgv(before.argv);
  const url = urlOf(port);
  if (action === 'start' && before.running) {
    ctx.out(`BragDoc is already running${before.pid ? ` (pid ${before.pid})` : ''} at ${url}\n`);
    return 0;
  }
  if (action === 'start') await mgr.start();
  else await mgr.restart();
  const w = await waitForReady(port, { probe: ctx.probe, sleep: ctx.sleep, now: ctx.now });
  const verb = action === 'start' ? 'started' : 'restarted';
  if (w.ready) ctx.out(`BragDoc ${w.version} is running at ${url}\n`);
  else ctx.out(`BragDoc was ${verb}, but ${url} didn't answer within 20 seconds. It may still be starting: \`bragdoc service status\`, and ${logsHint(ctx, mgr, installedDataDir(ctx, before))}.\n`);
  return 0;
}

async function stop(ctx: Ctx, mgr: ServiceManager): Promise<number> {
  const st = await mgr.status();
  if (!st.installed) throw notInstalled(ctx, mgr);
  if (isStopped(mgr, st)) {
    ctx.out('BragDoc is already stopped.\n');
    return 0;
  }
  await mgr.stop();
  ctx.out('Stopped BragDoc. The service is still installed: it starts again when you next log in, or now with `bragdoc service start`.\n');
  return 0;
}

async function logs(ctx: Ctx, mgr: ServiceManager): Promise<number | undefined> {
  const st = await mgr.status();
  if (!st.installed) throw notInstalled(ctx, mgr);
  const src = mgr.logs({ log: buildLog(installedDataDir(ctx, st)) });
  if ('command' in src) {
    const code = await ctx.stream(...src.command);
    if (code === 127) throw new Error(`${src.command[0]} isn't installed; the service's output is in the systemd journal`);
    return code;
  }
  const tail = lastLines(src.file, 50);
  ctx.out(tail || `(nothing in ${show(src.file, ctx.homedir)} yet; waiting for more)\n`);
  ctx.follow(src.file, (s) => ctx.out(s));
  return undefined; // runs until interrupted, like tail -f
}
