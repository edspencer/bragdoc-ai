// From edspencer/cli-contract reference/update.ts @ 1.0; local changes: the service hooks may return promises
// (BragDoc's service manager is async); a `beforeStart` hook for SPEC §5 step 14's backup, whose path a rollback that
// needs a person names; `fetch`'s type as in health.ts.
//
// `<tool> update`: SPEC §5, step by step, for every tool. Node built-ins only; nothing here imports a server.
//
// It's a sequence over injected hooks. A tool supplies what's its own (`UpdateProduct`): its names, its busy check,
// and its service (inspect, stop, refresh, tail). Everything that touches the machine comes in through
// `UpdateEnvironment`, so every branch, including the rollbacks to 6 and 7, can be tested without one.
//
//  1. the lock, so two updates can't interleave;
//  2. the install method (§6), so one that can't work says so first (but after step 4, since its notice names the
//     target);
//  3. the registry, for the target and its `engines`;
//  4. the comparison, and `--check` stops here;
//  5. the writability check, which turns "EACCES half-way through" into a `sudo` line while everything still runs;
//  6. the busy check, before anything stops;
//  7. the question, which `--yes` answers and no TTY forbids;
//  8. `npm cache add` for both versions, so a network failure happens while the old version still serves;
//  9. stop, before installing: npm moves the old package aside before unpacking, and a running server would then
//     load files that are gone;
// 10. install, with the manager this install came from;
// 11. hand over to the new CLI (`service install --refresh`), which writes the unit in its own format;
// 12. wait until the target version answers, not merely until something does;
// 13. and from step 10 on, roll back on any failure, and exit 6 or 7.

import fsDefault from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { EXIT } from './exit-codes.js';
import { fetchHealth, waitForVersion as pollVersion, type Fetch, type HealthVerdict } from './health.js';
import { describeInstall, detectInstall, updateCommand, type InstallInfo, type PackageManager } from './install-method.js';
import { acquireLock, LockHeldError, type Lock } from './lock.js';
import type { Output } from './output.js';
import {
  cacheAdd,
  cliVersion,
  globalRootFor,
  installArgs,
  installPackage,
  isWritable,
  npmConfigGet,
  npmGlobalRoot,
  type NpmContext,
  type RunResult,
  type Spawn,
} from './package-manager.js';
import { RegistryError, resolveRegistry, resolveTarget, type ResolvedTarget } from './registry.js';
import { compareVersions, isPrerelease, satisfiesEngines } from './semver.js';
import { updateNotice, writeUpdateCheck, type UpdateCheck } from './update-check.js';

export type { HealthVerdict } from './health.js';

/** SPEC §5 step 12: 30 seconds unless the tool sets its own. */
export const HEALTH_TIMEOUT_MS = 30_000;

/** How long to wait for the old version to stop answering after the stop (step 9). */
export const STOP_TIMEOUT_MS = 15_000;

/** How many log lines a failure prints (SPEC §5 step 13). */
export const LOG_LINES_ON_FAILURE = 20;

/** What `update` was asked (SPEC §1). */
export interface UpdateOptions {
  /** Report, and change nothing. */
  check?: boolean;
  /** A version or a dist-tag: the only way to move to a lower version. */
  to?: string;
  /** Skip the question. Needed without a TTY. */
  yes?: boolean;
  /** Skip the busy check, and nothing else. */
  force?: boolean;
  json?: boolean;
}

/** The service, as `update` sees it. */
export interface ServiceSnapshot {
  installed: boolean;
  running: boolean;
  /** The URL the installed unit serves, or a foreground `serve` found through `runtime.json`. */
  url?: string;
  /** The log the unit names, for the failure's tail. */
  log?: string;
}

export interface UpdateServiceHooks {
  /** Is a unit installed, is it running, and where. With no unit, report a foreground `serve` from `runtime.json`. */
  inspect(): ServiceSnapshot | Promise<ServiceSnapshot>;
  /** Stops the service. Throws, with the service manager's own words, if it can't. */
  stop(): void | Promise<void>;
  /** Runs `<node> <cliPath> service install --refresh`: the new CLI on the way up, the old one on a rollback. */
  refresh(cliPath: string): RunResult | Promise<RunResult>;
  /** The last `lines` lines of the service's log, or ''. */
  tail(lines: number): string;
}

export interface UpdateProduct {
  /** `Paddock`. */
  name: string;
  /** `paddock`: the bin, for `<tool>: <message>` and the printed commands. */
  tool: string;
  /** `@edspencer/paddock`. */
  packageName: string;
  /** `PADDOCK`: gives `PADDOCK_IN_DOCKER` and `PADDOCK_UPDATE_HINT`. */
  envPrefix: string;
  /** The data home, for `update.lock` and `update-check.json`: the one `service status` reads the cache from. */
  home: string;
  /** This CLI's version, from its `package.json`. */
  currentVersion: string;
  /**
   * `process.argv[1]`, not realpath'd. Re-resolving the bin's symlink after the install is what finds the new CLI
   * under a manager that puts the version in the real path (pnpm). §6's walk-up realpaths it itself.
   */
  entry: string;
  /** Where the CLI sits in the package: `dist/server/cli.js`. */
  binSubpath: string;
  /** The image, for the Docker notice: `ghcr.io/edspencer/paddock`. */
  image?: string;
  /** `update`'s own usage, printed after the exit-2 refusal (SPEC §2). */
  usage?: string;
  /** The release notes for a version: the notice's `Changes:` line. */
  changelogUrl(version: string): string;
  healthTimeoutMs?: number;
  /** The busy check (SPEC §5 step 6): null to go ahead, or 75 having printed why (`guardBusy` in busy-client.ts). */
  guardBusy(o: { force: boolean; home: string }): Promise<number | null>;
  service: UpdateServiceHooks;
  /**
   * SPEC §5 step 14, BragDoc's local addition: called once the target is installed and before it starts. Copy what it
   * will change, and return where (`<home>/backups/pre-<version>/`), or undefined when it changes nothing. Throwing
   * rolls back.
   */
  beforeStart?(o: { cli: string; version: string }): string | undefined | Promise<string | undefined>;
  /** Defaults to `waitForVersion` in health.ts. */
  waitForVersion?(o: { url: string; version: string; timeoutMs: number }): Promise<HealthVerdict>;
}

/** Everything that touches the machine. */
export interface UpdateEnvironment {
  out: Output;
  env?: NodeJS.ProcessEnv;
  spawn?: Spawn;
  execPath?: string;
  platform?: NodeJS.Platform;
  fetch?: Fetch;
  fs?: Pick<typeof fsDefault, 'existsSync' | 'readFileSync' | 'realpathSync'>;
  /** Is there a person at a keyboard? (SPEC §3.) Defaults to stdin and stderr both being TTYs. */
  isTTY?: boolean;
  /** The Node to check the target's `engines.node` against. */
  nodeVersion?: string;
  /** Asks the question; only called on a TTY without `--yes`. */
  confirm?: (question: string) => Promise<boolean>;
  writable?: (dir: string) => boolean;
  /** Injected for tests: waits between the stop's health polls. */
  sleep?: (ms: number) => Promise<void>;
}

export type UpdateOutcome =
  | 'up-to-date'
  | 'ahead'
  | 'available'
  | 'updated'
  | 'restart-required'
  | 'cannot-self-update'
  | 'not-writable'
  | 'node-too-old'
  | 'busy'
  | 'needs-yes'
  | 'declined'
  | 'rolled-back'
  | 'needs-human'
  | 'failed';

/** `update --json`'s document: the check, plus what happened. `--check --json` matches the update-check schema. */
export interface UpdateDoc extends Partial<UpdateCheck> {
  outcome: UpdateOutcome;
  message?: string;
  url?: string;
}

const indent = (text: string) =>
  text
    .split('\n')
    .map((l) => (l === '' ? l : `    ${l}`))
    .join('\n');

const said = (r: RunResult) => indent(r.stderr.trim() || r.stdout.trim());

/** Runs `update` and returns the exit code; the caller sets `process.exitCode`. */
export async function runUpdate(product: UpdateProduct, opts: UpdateOptions, envp: UpdateEnvironment): Promise<number> {
  const out = envp.out;
  const env = envp.env ?? process.env;
  const fs = envp.fs ?? fsDefault;
  const npm: NpmContext = {
    env,
    ...(envp.spawn !== undefined ? { spawn: envp.spawn } : {}),
    ...(envp.execPath !== undefined ? { execPath: envp.execPath } : {}),
    ...(envp.platform !== undefined ? { platform: envp.platform } : {}),
  };
  let emitted = false;
  const emit = (doc: UpdateDoc): void => {
    if (emitted) return;
    emitted = true;
    out.result(doc);
  };
  const healthTimeoutMs = product.healthTimeoutMs ?? HEALTH_TIMEOUT_MS;
  const waitFor = (url: string, version: string, timeoutMs = healthTimeoutMs): Promise<HealthVerdict> =>
    product.waitForVersion
      ? product.waitForVersion({ url, version, timeoutMs })
      : pollVersion({ url, version, timeoutMs, ...(envp.fetch !== undefined ? { fetch: envp.fetch } : {}) });

  // ---- 1. the lock
  let lock: Lock;
  try {
    lock = acquireLock({ home: product.home, command: `${product.tool} update${opts.to !== undefined ? ` --to ${opts.to}` : ''}` });
  } catch (err) {
    const message = err instanceof LockHeldError ? err.message : `couldn't take the update lock: ${(err as Error).message}`;
    emit({ outcome: 'failed', message });
    return out.error(message);
  }
  try {
    return await sequence();
  } finally {
    lock.release();
  }

  async function sequence(): Promise<number> {
    // ---- 2. how was it installed? Acted on after step 4, which has the target its notice names.
    const info = detectInstall({
      packageName: product.packageName,
      envPrefix: product.envPrefix,
      entry: product.entry,
      env,
      npmGlobalRoot: () => npmGlobalRoot(npm),
      fs,
    });

    // ---- 3. the registry
    let target: ResolvedTarget;
    try {
      target = await resolveTarget({
        packageName: product.packageName,
        registry: resolveRegistry(env, (key) => npmConfigGet(key, npm)),
        ...(opts.to !== undefined ? { to: opts.to } : {}),
        ...(envp.fetch !== undefined ? { fetch: envp.fetch } : {}),
      });
    } catch (err) {
      const message = err instanceof RegistryError ? `${err.message}\n    ${err.url}` : String(err);
      emit({ outcome: 'failed', message });
      return out.error(message);
    }

    // ---- 4. compare
    const cmp = compareVersions(target.version, product.currentVersion);
    // A prerelease counts only when `--to` names it. `latest` pointing at one is a mis-tagged release.
    const misTagged = opts.to === undefined && isPrerelease(target.version);
    const nodeVersion = envp.nodeVersion ?? process.versions.node;
    const engines = satisfiesEngines(nodeVersion, target.engines !== null ? { node: target.engines } : undefined);
    const command = updateCommand(info, {
      packageName: product.packageName,
      target: target.version,
      ...(product.image !== undefined ? { image: product.image } : {}),
    });
    const check: UpdateCheck = {
      name: product.packageName,
      current: product.currentVersion,
      target: target.version,
      tag: target.tag,
      updateAvailable: cmp > 0 && !misTagged,
      installMethod: info.method,
      canUpdate: info.canUpdate,
      command: info.canUpdate ? `${product.tool} update` : command.command,
      engines: target.engines,
      // A range that couldn't be read is a pass (semver.ts), and the field is a boolean.
      nodeOk: engines.ok !== false,
      changelog: product.changelogUrl(target.version),
      checkedAt: new Date().toISOString(),
    };
    // Written whatever happens next: "you're up to date" is the answer that stops `status` repeating an old notice.
    writeUpdateCheck(product.home, check);

    const notice = (cmd: string, note?: string) =>
      updateNotice({
        name: product.name,
        current: product.currentVersion,
        target: target.version,
        command: cmd,
        ...(note !== undefined ? { note } : {}),
        changelog: check.changelog,
      });

    if (misTagged) {
      const message = `The registry's latest is a prerelease (${target.version}), so it isn't installed.\n  To go there: ${product.tool} update --to ${target.version}`;
      emit({ ...check, outcome: 'ahead', message });
      out.say(message);
      return EXIT.OK;
    }
    if (cmp === 0) {
      const message = `${product.name} ${product.currentVersion} is up to date.`;
      emit({ ...check, outcome: 'up-to-date', message });
      out.say(message);
      return EXIT.OK;
    }
    if (cmp < 0 && opts.to === undefined) {
      const message =
        `${product.name} ${product.currentVersion} is newer than the registry's ${target.tag ?? 'latest'} (${target.version}). Nothing to do.\n` +
        `  To go back to it: ${product.tool} update --to ${target.version}`;
      emit({ ...check, outcome: 'ahead', message });
      out.say(message);
      return EXIT.OK;
    }

    if (opts.check === true) {
      // Exit 0 whether or not there's an update (SPEC §2); scripts read `updateAvailable`. The notice goes to stderr.
      emit({ ...check, outcome: 'available' });
      out.warn(notice(check.command ?? `${product.tool} update`, info.canUpdate ? undefined : command.note));
      if (engines.ok === false) out.warn(`  Note: ${target.version} needs Node ${target.engines}; this is Node ${nodeVersion}.`);
      return EXIT.OK;
    }

    if (!info.canUpdate) {
      out.warn(notice(command.command, command.note));
      const message = `this install can't update itself: it's ${describeInstall(info, product.packageName)}.`;
      emit({ ...check, outcome: 'cannot-self-update', message });
      return out.error(message, EXIT.CANNOT_UPDATE);
    }
    const manager: PackageManager = info.manager ?? 'npm';

    if (engines.ok === false) {
      const message = `${target.version} needs Node ${target.engines}, and this is Node ${nodeVersion}. Upgrade Node, then run \`${product.tool} update\` again.`;
      emit({ ...check, outcome: 'node-too-old', message });
      return out.error(message);
    }

    // ---- 5. can we write there? Never run sudo.
    const globalRoot = globalRootFor(manager, npm);
    if (globalRoot !== undefined && !(envp.writable ?? isWritable)(globalRoot)) {
      const sudo = updateCommand(info, { packageName: product.packageName, target: target.version, sudo: true });
      out.warn(notice(sudo.command, sudo.note));
      const message = `${globalRoot} isn't writable by this user, so the install would fail half-way.`;
      emit({ ...check, outcome: 'not-writable', message, command: sudo.command });
      return out.error(message, EXIT.CANNOT_UPDATE);
    }

    // ---- 6. busy? Before anything stops, and before the question.
    const refused = await product.guardBusy({ force: opts.force === true, home: product.home });
    if (refused !== null) {
      emit({ ...check, outcome: 'busy' });
      return refused;
    }

    const service = await product.service.inspect();
    const arrow = `${product.currentVersion} → ${target.version}`;

    // ---- 7. ask
    if (opts.yes !== true) {
      if (!(envp.isTTY ?? (process.stdin.isTTY === true && process.stderr.isTTY === true))) {
        const message = `there's no terminal to ask, so --yes is needed: ${product.tool} update --yes`;
        emit({ ...check, outcome: 'needs-yes', message });
        const code = out.error(message, EXIT.USAGE);
        if (product.usage !== undefined) out.warn(`\n${product.usage.trimEnd()}`);
        return code;
      }
      const question = `${cmp < 0 ? 'Downgrade' : 'Update'} ${product.name} ${arrow}?${service.installed ? ' The service will restart.' : ''}`;
      out.warn(`${question}\n  Changes: ${check.changelog ?? ''}`);
      if (!(await (envp.confirm ?? askOnTty)('  Continue? [y/N] '))) {
        emit({ ...check, outcome: 'declined', message: 'Nothing was changed.' });
        out.say('Nothing was changed.');
        return EXIT.OK;
      }
    }

    // ---- 8. fetch first, both versions: the current one is what a rollback reinstalls.
    out.warn(`  Fetching ${product.packageName}@${target.version}…`);
    const fetched = cacheAdd(product.packageName, target.version, npm);
    if (fetched.status !== 0) {
      const message = `couldn't fetch ${product.packageName}@${target.version}:\n${said(fetched)}`;
      emit({ ...check, outcome: 'failed', message });
      return out.error(message);
    }
    if (cacheAdd(product.packageName, product.currentVersion, npm).status !== 0) {
      out.warn(`  Note: ${product.packageName}@${product.currentVersion} isn't in npm's cache, so a rollback would need the network.`);
    }

    // ---- 9. stop
    if (service.installed) {
      out.warn(`  Stopping the ${product.name} service…`);
      try {
        await product.service.stop();
      } catch (err) {
        const message = `couldn't stop the service: ${(err as Error).message}`;
        emit({ ...check, outcome: 'failed', message });
        return out.error(message);
      }
      if (service.url !== undefined && !(await stopped(service.url))) {
        out.warn(`  Note: ${service.url} still answered ${STOP_TIMEOUT_MS / 1000} seconds after the stop.`);
      }
    } else if (service.running && service.url !== undefined) {
      // A foreground `serve`: we can't stop someone's terminal, and installing under it is what step 9 is for.
      if ((await fetchHealth({ url: service.url, ...(envp.fetch !== undefined ? { fetch: envp.fetch } : {}) })) !== undefined) {
        const message = `${product.name} is running at ${service.url}, and there's no service to stop. Stop it (Ctrl-C in its terminal), then run this again.`;
        emit({ ...check, outcome: 'failed', message });
        return out.error(message, EXIT.NOT_RUNNING);
      }
    }

    // ---- 10. install. If npm fails, it has already put the old package back.
    out.warn(`  Installing ${product.packageName}@${target.version} with ${manager}…`);
    const installed = installPackage({ ...npm, manager, packageName: product.packageName, version: target.version });
    const back: Omit<RollbackInput, 'why'> = { check, emit, product, envp, npm, manager, service, waitFor };
    if (installed.status !== 0) {
      out.warn(said(installed));
      return rollback({ ...back, why: `installing ${target.version} failed`, alreadyRestored: true });
    }
    const newCli = findCli(product, info, target.version, { ...npm, fs });
    if (newCli === undefined) return rollback({ ...back, why: `${target.version} was installed, but no CLI on disk reports that version` });

    // ---- 14. back up what the new version will change, before it starts (a local addition: `beforeStart`)
    if (product.beforeStart !== undefined) {
      try {
        back.backup = await product.beforeStart({ cli: newCli, version: target.version });
      } catch (err) {
        return rollback({ ...back, why: `couldn't back up your data before ${target.version} starts: ${(err as Error).message}` });
      }
      if (back.backup !== undefined) out.warn(`  Backed up your data to ${back.backup}, before ${target.version} starts.`);
    }

    // Without a service: steps 1 to 8 and 10 (SPEC §5).
    if (!service.installed) {
      noteInstalled(product.home, check);
      const restart = service.running ? `\n  Restart ${product.name} to use ${target.version}.` : '';
      emit({ ...check, outcome: service.running ? 'restart-required' : 'updated', message: `Updated ${product.name} ${arrow}.${restart}` });
      out.say(`Updated ${product.name} ${arrow}.${restart}`);
      return EXIT.OK;
    }

    // ---- 11. hand over to the new version
    out.warn('  Refreshing the service unit with the new version…');
    const refreshed = await product.service.refresh(newCli);
    if (refreshed.status !== 0) {
      out.warn(said(refreshed));
      return rollback({ ...back, why: `${target.version} couldn't refresh the service unit` });
    }

    // ---- 12. health
    const url = (await product.service.inspect()).url ?? service.url;
    if (url === undefined) {
      // Nothing to poll; the refresh waited for health itself.
      noteInstalled(product.home, check);
      emit({ ...check, outcome: 'updated', message: `Updated ${product.name} ${arrow}.` });
      out.say(`Updated ${product.name} ${arrow}.`);
      return EXIT.OK;
    }
    out.warn(`  Waiting for ${target.version} to answer at ${url}…`);
    const verdict = await waitFor(url, target.version);
    if (verdict.state !== 'ok') {
      const why =
        verdict.state === 'wrong-version'
          ? `${url} answers with ${verdict.version}, not ${target.version}`
          : `${url} didn't answer within ${healthTimeoutMs / 1000} seconds`;
      return rollback({ ...back, why, showLog: true });
    }

    // ---- 15. done
    noteInstalled(product.home, check);
    const message = `Updated ${product.name} ${arrow}. Running at ${url}`;
    emit({ ...check, outcome: 'updated', message, url });
    out.say(message);
    return EXIT.OK;
  }

  /** Polls until the stopped service's URL stops answering (step 9: wait until the port is free). */
  async function stopped(url: string): Promise<boolean> {
    const sleep = envp.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
    for (let i = 0; i < STOP_TIMEOUT_MS / 250; i++) {
      if ((await fetchHealth({ url, timeoutMs: 1000, ...(envp.fetch !== undefined ? { fetch: envp.fetch } : {}) })) === undefined) return true;
      await sleep(250);
    }
    return false;
  }
}

/**
 * After a successful update the target is the installed version, so the cache step 4 wrote ("an update is
 * available") is rewritten; otherwise `status` goes on advertising the version the machine is already running.
 */
function noteInstalled(home: string, check: UpdateCheck): void {
  writeUpdateCheck(home, { ...check, current: check.target, updateAvailable: false, command: null, checkedAt: new Date().toISOString() });
}

/** Asks on the terminal: the question on stderr (SPEC §3), the answer from stdin. */
async function askOnTty(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    return /^y(es)?$/i.test((await new Promise<string>((resolve) => rl.question(question, resolve))).trim());
  } finally {
    rl.close();
  }
}

interface RollbackInput {
  why: string;
  check: UpdateCheck;
  emit: (doc: UpdateDoc) => void;
  product: UpdateProduct;
  envp: UpdateEnvironment;
  npm: NpmContext;
  manager: PackageManager;
  service: ServiceSnapshot;
  waitFor: (url: string, version: string) => Promise<HealthVerdict>;
  /** npm already put the old package back (a failed install). */
  alreadyRestored?: boolean;
  /** Print the log's tail first. */
  showLog?: boolean;
  /** Where step 14 copied the data, for a rollback that needs a person. */
  backup?: string;
}

/**
 * SPEC §5 step 13: put the old version back, and say which of 6 or 7 happened. 6 means nobody has to do anything:
 * the old version is installed and answering. 7 means the machine isn't serving and nothing automatic will fix it, so
 * the output is the commands to run by hand.
 */
async function rollback(o: RollbackInput): Promise<number> {
  const { product, check } = o;
  const out = o.envp.out;
  const current = product.currentVersion;
  out.error(`${o.why}.`);
  if (o.showLog === true) {
    const tail = product.service.tail(LOG_LINES_ON_FAILURE);
    if (tail.trim() !== '') out.warn(`\n  The last ${LOG_LINES_ON_FAILURE} lines of ${(await product.service.inspect()).log ?? 'the log'}:\n${indent(tail)}`);
  }
  out.warn(`\n  Rolling back to ${current}…`);

  const reinstall = installArgs(o.manager, `${product.packageName}@${current}`);
  const byHand = [`    ${reinstall.cmd} ${reinstall.args.join(' ')}`, `    ${product.tool} service install --refresh`, `    ${product.tool} service status`].join('\n');
  const needsHuman = (what: string): number => {
    const saved = o.backup !== undefined ? `\n  Your data as it was before ${check.target}: ${o.backup}` : '';
    const message = `${check.target} didn't start, and ${what}. Run these by hand:\n${byHand}${saved}`;
    o.emit({ ...check, outcome: 'needs-human', message });
    return out.error(message, EXIT.ROLLBACK_FAILED);
  };

  if (o.alreadyRestored !== true) {
    const reinstalled = installPackage({ ...o.npm, manager: o.manager, packageName: product.packageName, version: current });
    if (reinstalled.status !== 0) {
      out.warn(said(reinstalled));
      return needsHuman(`${current} couldn't be reinstalled`);
    }
  }

  // The unit is refreshed by the old CLI: the new one may have written a format the old one doesn't read.
  if (o.service.installed) {
    const oldCli = findCli(product, undefined, current, { ...o.npm, ...(o.envp.fs !== undefined ? { fs: o.envp.fs } : {}) });
    if (oldCli === undefined) return needsHuman(`${current}'s CLI couldn't be found to restore the service unit`);
    const restored = await product.service.refresh(oldCli);
    if (restored.status !== 0) {
      out.warn(said(restored));
      return needsHuman(`the service couldn't be started again on ${current}`);
    }
    const url = (await product.service.inspect()).url ?? o.service.url;
    if (url !== undefined && (await o.waitFor(url, current)).state !== 'ok') return needsHuman(`${current} isn't answering at ${url} either`);
  }

  const message = `${check.target} didn't start; ${current} is running again.`;
  o.emit({ ...check, outcome: 'rolled-back', message });
  return out.error(message, EXIT.ROLLED_BACK);
}

/**
 * The CLI on disk that reports `wanted`, tried in this order (keep it):
 *
 * 1. `realpath(argv[1])`, resolved now: a manager whose real path carries the version (pnpm's store) repoints the
 *    bin's symlink on install, and only this candidate follows it;
 * 2. `<npm root -g>/<name>/<binSubpath>`;
 * 3. the package root §6 found, plus the same subpath.
 *
 * Each is run with `--version`, and the first that reports `wanted` wins. "The file exists" isn't enough: handing the
 * refresh to a CLI that's still the old version would make a green update that changed nothing.
 */
export function findCli(
  product: Pick<UpdateProduct, 'entry' | 'packageName' | 'binSubpath'>,
  info: InstallInfo | undefined,
  wanted: string,
  ctx: NpmContext & { fs?: Pick<typeof fsDefault, 'existsSync' | 'realpathSync'> },
): string | undefined {
  const fs = ctx.fs ?? fsDefault;
  const candidates: string[] = [];
  try {
    candidates.push(fs.realpathSync(product.entry));
  } catch {
    candidates.push(product.entry);
  }
  const globalRoot = npmGlobalRoot(ctx);
  if (globalRoot !== undefined) candidates.push(path.join(globalRoot, product.packageName, product.binSubpath));
  if (info?.packageRoot !== undefined) candidates.push(path.join(info.packageRoot, product.binSubpath));
  for (const candidate of new Set(candidates)) {
    if (fs.existsSync(candidate) && cliVersion(candidate, ctx) === wanted) return candidate;
  }
  return undefined;
}
