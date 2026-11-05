// `bragdoc doctor [--json] [--offline]` (cli-contract SPEC 0.2 §1; D88): checks, with a fix for each failure. The
// contract's own (Node, how it was installed, the unit, the running version, the port, linger, the data home, and a
// newer version) and BragDoc's (config.yaml, git, gh when GitHub goes through it). Each line starts ✓, ! or ✗, and
// a failure has a `fix:` line under it; it exits 1 if anything failed, and warnings don't change that.
//
// The newer-version check is the one that leaves the machine: the npm registry, through egress.ts's registry() (D87),
// skipped with --offline. Its answer is written to update-check.json, which `service status` repeats.
import fs from 'node:fs';
import { posix as path } from 'node:path';
import { check } from '../args.js';
import { DEFAULT_CONFIG, parseConfig } from '../config.js';
import { Egress } from '../egress.js';
import { homePaths } from '../home.js';
import { PACKAGE_ROOT, VERSION, resolveDataDir, tildify } from '../paths.js';
import { DEFAULT_PORT } from '../port.js';
import { onPath } from '../proc.js';
import { readRuntimeAddress } from '../runtime.js';
import { UnsupportedPlatformError, type ServiceManager, type ServiceStatus } from '../platform/index.js';
import { readArgv } from '../platform/spec.js';
import { describeInstall, detectInstall, updateCommand } from '../update/install-method.js';
import { isWritable, npmConfigGet, npmGlobalRoot, spawnSyncRunner, type NpmContext } from '../update/package-manager.js';
import { RegistryError, resolveRegistry, resolveTarget } from '../update/registry.js';
import { compareVersions, isPrerelease, satisfies, satisfiesEngines } from '../update/semver.js';
import { updateNotice, writeUpdateCheck, type UpdateCheck } from '../update/update-check.js';
import type { Ctx } from './context.js';
import { askLinger } from './linger.js';
import { installedVersion, manager } from './service.js';
import { IMAGE, PACKAGE_NAME, changelogUrl, serviceOf, viaEgress } from './update.js';

/** One check: `doctor --json`'s entry (the contract's `schemas/doctor.schema.json`). */
export interface DoctorCheck {
  id: string;
  status: 'pass' | 'warn' | 'fail' | 'skip';
  message: string;
  /** What to do about it. Every fail has one. */
  fix?: string;
}

const pass = (id: string, message: string): DoctorCheck => ({ id, status: 'pass', message });
const warn = (id: string, message: string, fix?: string): DoctorCheck => ({ id, status: 'warn', message, ...(fix ? { fix } : {}) });
const fail = (id: string, message: string, fix: string): DoctorCheck => ({ id, status: 'fail', message, fix });
const skip = (id: string, message: string): DoctorCheck => ({ id, status: 'skip', message });

const SYMBOL = { pass: '✓', warn: '!', fail: '✗' } as const;

export async function doctor(ctx: Ctx, args: string[], flags: Record<string, string>, rest: string[] | undefined): Promise<number> {
  check('doctor', flags, ['json', 'offline'], args, 0, rest);
  const json = !!flags.json;
  const notices: string[] = [];
  const checks = await runChecks(ctx, { offline: !!flags.offline, notice: (s) => notices.push(s) });
  const ok = !checks.some((c) => c.status === 'fail');
  if (json) ctx.out(JSON.stringify({ ok, version: VERSION, checks }, null, 2) + '\n');
  // with --json, the prose goes to stderr (cli-contract SPEC §1)
  const say = json ? ctx.err : ctx.out;
  for (const c of checks) {
    if (c.status === 'skip') continue;
    say(`${SYMBOL[c.status]} ${c.message}\n${c.fix ? `    fix: ${c.fix.split('\n').join('\n         ')}\n` : ''}`);
  }
  const counts = (s: DoctorCheck['status']) => checks.filter((c) => c.status === s).length;
  say(`\n${ok ? 'No problems found' : `${counts('fail')} problem${counts('fail') === 1 ? '' : 's'}`}${counts('warn') ? `, ${counts('warn')} warning${counts('warn') === 1 ? '' : 's'}` : ''}.\n`);
  // SPEC §3's update notice: stderr, always, after the list it belongs to
  for (const n of notices) ctx.err(`\n${n}\n`);
  return ok ? 0 : 1;
}

export interface CheckOptions {
  offline: boolean;
  /** Where SPEC §3's update notice goes: stderr. */
  notice(s: string): void;
}

export async function runChecks(ctx: Ctx, o: CheckOptions): Promise<DoctorCheck[]> {
  const show = (p: string) => tildify(p, ctx.homedir);
  const npm: NpmContext = { env: ctx.env, spawn: spawnSyncRunner };
  const checks: DoctorCheck[] = [];

  // ---- node-engines
  const pkg = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8')) as { engines?: { node?: string } };
  const range = pkg.engines?.node;
  const nodeOk = range ? satisfies(process.versions.node, range) : true;
  checks.push(
    nodeOk === false
      ? fail('node-engines', `Node ${process.versions.node} is older than BragDoc needs (${range}).`, `install Node ${range} (https://nodejs.org), then run BragDoc with it.`)
      : pass('node-engines', `Node ${process.versions.node}${range ? ` (BragDoc needs ${range})` : ''}.`),
  );

  // ---- install-method
  const info = detectInstall({ packageName: PACKAGE_NAME, envPrefix: 'BRAGDOC', entry: process.argv[1] ?? ctx.cliScript, env: ctx.env, npmGlobalRoot: () => npmGlobalRoot(npm) });
  // describeInstall says "installed globally with npm", "running from a checkout at …": it reads after "BragDoc is"
  const where = info.packageRoot && info.method !== 'checkout' ? ` (${show(info.packageRoot)})` : '';
  const how = `BragDoc is ${describeInstall(info, PACKAGE_NAME)}${where}.`;
  checks.push(info.canUpdate ? pass('install-method', `${how} \`bragdoc update\` can update it.`) : warn('install-method', `${how} \`bragdoc update\` can't update it itself; it says what to run instead.`));

  // ---- unit, running-version, port, linger: the service
  let mgr: ServiceManager | null = null;
  let st: ServiceStatus | null = null;
  try {
    mgr = manager(ctx);
    st = await mgr.status();
  } catch (e) {
    checks.push(e instanceof UnsupportedPlatformError ? skip('unit', e.message) : warn('unit', `couldn't ask the service manager: ${(e as Error).message}`));
  }
  const svc = await serviceOf(ctx).catch(() => null);
  const port = svc?.port ?? DEFAULT_PORT;
  if (mgr && st) {
    if (!st.installed) checks.push(pass('unit', `No service is installed (${show(mgr.file)}). \`bragdoc service install\` sets one up.`));
    else {
      const gone = st.argv.slice(0, 2).filter((f) => !fs.existsSync(f));
      const same = st.argv[1] !== undefined && realpath(st.argv[1]) === realpath(ctx.cliScript);
      const stale = mgr.stale();
      if (gone.length) checks.push(fail('unit', `The service (${show(mgr.file)}) runs ${gone.map(show).join(' and ')}, which no longer exist${gone.length === 1 ? 's' : ''}.`, 'bragdoc service install'));
      else if (stale) checks.push(warn('unit', `The service (${show(mgr.file)}): ${stale}`, 'bragdoc service install'));
      else if (!same) checks.push(warn('unit', `The service (${show(mgr.file)}) runs another BragDoc (${show(st.argv[1] ?? '?')}), not this one (${show(ctx.cliScript)}).`, 'bragdoc service install, from the BragDoc you mean to run'));
      else checks.push(pass('unit', `The service (${show(mgr.file)}) runs this BragDoc, with Node ${show(st.argv[0]!)}.`));
    }
  }

  const answer = await ctx.probe(port);
  if (st?.installed) {
    const installed = installedVersion(st.argv[1]);
    if (answer.kind !== 'bragdoc') checks.push(warn('running-version', `The service isn't answering on port ${port}${st.running ? ' (it may still be starting)' : ''}.`, 'bragdoc service start, and bragdoc service logs if it still won\'t'));
    else if (installed && answer.version !== installed) checks.push(warn('running-version', `The service is running ${answer.version}, and ${installed} is installed.`, 'bragdoc service restart'));
    else checks.push(pass('running-version', `The service is running ${answer.version}, the installed version.`));
  } else {
    const live = svc ? readRuntimeAddress(svc.dataDir) : null;
    if (live?.running && live.version && live.version !== VERSION) checks.push(warn('running-version', `A BragDoc ${live.version} is running (pid ${live.pid}), and this is ${VERSION}.`, 'restart it to use this version'));
    else checks.push(skip('running-version', 'No service is installed.'));
  }

  checks.push(
    answer.kind === 'none'
      ? pass('port', `Port ${port} is free.`)
      : answer.kind === 'bragdoc'
        ? pass('port', `Port ${port} is BragDoc's (${answer.version}).`)
        : fail('port', `Something that isn't BragDoc is answering on port ${port}.`, `stop it, or use another port: bragdoc service install --port <n> (or bragdoc --port <n>)`),
  );

  if (ctx.platform !== 'linux') checks.push(skip('linger', 'Linger is a Linux setting.'));
  else checks.push(await linger(ctx));

  // ---- data-home
  const dataDir = svc?.dataDir ?? resolveDataDir(undefined, ctx.env, ctx.homedir);
  const exists = fs.existsSync(dataDir);
  checks.push(
    isWritable(dataDir)
      ? pass('data-home', exists ? `The data home (${show(dataDir)}) is writable.` : `The data home (${show(dataDir)}) doesn't exist yet; BragDoc creates it on its first start.`)
      : fail('data-home', `The data home (${show(dataDir)}) isn't writable by this user.`, `make it yours: sudo chown -R "$(id -un)" ${dataDir}`),
  );

  // ---- BragDoc's own: config.yaml, git, gh
  checks.push(configCheck(dataDir, show));
  checks.push(onPath('git', ctx.env) ? pass('git', 'git is installed.') : warn('git', "git isn't on PATH: adding repos, and Found's git source, need it.", 'install git'));
  const cfg = readConfig(dataDir);
  if (cfg?.sources.github.enabled && cfg.sources.github.auth === 'gh')
    checks.push(onPath('gh', ctx.env) ? pass('gh', 'gh is installed (the GitHub source uses it).') : fail('gh', "The GitHub source uses the gh CLI, and it isn't on PATH.", 'install gh (https://cli.github.com), then gh auth login'));

  // ---- update: the registry, unless --offline (D87)
  if (o.offline) checks.push(skip('update', 'Not checked for a newer version (--offline).'));
  else checks.push(await updateCheck(ctx, { dataDir, npm, info, notice: o.notice }));
  return checks;
}

const realpath = (p: string) => {
  try {
    return fs.realpathSync(p);
  } catch {
    return p;
  }
};

function readConfig(dataDir: string) {
  try {
    const r = parseConfig(fs.readFileSync(homePaths(dataDir).config, 'utf8'));
    return r.ok ? r.config : null;
  } catch {
    return null;
  }
}

function configCheck(dataDir: string, show: (p: string) => string): DoctorCheck {
  const file = homePaths(dataDir).config;
  let text: string;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return pass('config', `There's no ${show(file)} yet; BragDoc writes one on its first start.`);
  }
  const r = parseConfig(text, show(file));
  if (r.ok) return pass('config', `${show(file)} is valid.`);
  return r.future
    ? fail('config', r.message, 'bragdoc update: a newer BragDoc wrote it')
    : fail('config', r.message, `fix ${show(file)} by hand (Settings shows what's wrong), or move it aside and BragDoc writes the defaults`);
}

/** `loginctl show-user <user> -p Linger` (cli-contract SPEC §7, linger.ts): without it, a user service stops at logout. */
async function linger(ctx: Ctx): Promise<DoctorCheck> {
  const { user, enabled } = await askLinger(ctx);
  if (!user) return skip('linger', "Couldn't tell who you are ($USER isn't set).");
  if (enabled === null) return skip('linger', "Couldn't ask loginctl about lingering.");
  return enabled
    ? pass('linger', `Lingering is on for ${user}: the service keeps running after you log out.`)
    : warn('linger', `Lingering is off for ${user}: the service stops when you log out, and starts at your next login.`, `sudo loginctl enable-linger ${user}`);
}

async function updateCheck(ctx: Ctx, o: { dataDir: string; npm: NpmContext; info: ReturnType<typeof detectInstall>; notice: (s: string) => void }): Promise<DoctorCheck> {
  const registryUrl = resolveRegistry(ctx.env, (key) => npmConfigGet(key, o.npm));
  const egress = new Egress({ dataDir: o.dataDir, config: () => DEFAULT_CONFIG });
  let target;
  try {
    target = await resolveTarget({ packageName: PACKAGE_NAME, registry: registryUrl, fetch: viaEgress(ctx, egress.registry({ registryUrl, packageName: PACKAGE_NAME })) });
  } catch (e) {
    return warn('update', `Couldn't check for a newer version: ${e instanceof RegistryError ? `${e.message} (${e.url})` : (e as Error).message}`, 'check the network, or run doctor --offline');
  }
  const cmp = compareVersions(target.version, VERSION);
  const available = cmp > 0 && !isPrerelease(target.version);
  const command = updateCommand(o.info, { packageName: PACKAGE_NAME, target: target.version, image: IMAGE });
  const engines = satisfiesEngines(process.versions.node, target.engines !== null ? { node: target.engines } : undefined);
  const doc: UpdateCheck = {
    name: PACKAGE_NAME,
    current: VERSION,
    target: target.version,
    tag: target.tag,
    updateAvailable: available,
    installMethod: o.info.method,
    canUpdate: o.info.canUpdate,
    command: available ? (o.info.canUpdate ? 'bragdoc update' : command.command) : null,
    engines: target.engines,
    nodeOk: engines.ok !== false,
    changelog: changelogUrl(target.version),
    checkedAt: new Date().toISOString(),
  };
  if (fs.existsSync(o.dataDir)) writeUpdateCheck(o.dataDir, doc);
  if (!available) return pass('update', cmp < 0 ? `BragDoc ${VERSION} is newer than the registry's latest (${target.version}).` : `BragDoc ${VERSION} is the latest.`);
  o.notice(updateNotice({ name: 'BragDoc', current: VERSION, target: target.version, command: doc.command!, ...(o.info.canUpdate || !command.note ? {} : { note: command.note }), changelog: doc.changelog }));
  return warn('update', `BragDoc ${target.version} is available (this is ${VERSION}).`, doc.command!);
}
