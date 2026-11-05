// From edspencer/cli-contract reference/package-manager.ts @ 1.0; local changes: commands run through server/proc.ts's
// `runSync` (D9: no other file may start a process), not `spawnSync` here; no `shell: true` (Windows isn't supported
// yet, D14).
//
// Running the package manager (SPEC §5 steps 5, 8 and 10, §6, §7). Node built-ins only.
//
// - **npm is the one beside `process.execPath`**, run as `node <npm-cli.js>`, never whichever `npm` is first on PATH.
//   Under nvm, fnm or volta those are different npms for different Nodes, and the wrong one's `npm root -g` is a
//   global folder this install isn't in: an ordinary global install would read as a dependency and refuse to update.
//   Running `npm-cli.js` with this Node also needs no shell on Windows, where `npm.cmd` would (CVE-2024-27980).
// - **No shell otherwise**, so a path or a name with a space in it can't become two arguments. pnpm, bun and volta on
//   Windows are `.cmd` files and do need one; their arguments are quoted for `cmd.exe` here.
// - **Writable means a file can be created**, not just that `access()` says yes (`isWritable`).

import fs from 'node:fs';
import path from 'node:path';
import { runSync } from '../proc.js';
import type { PackageManager } from './install-method.js';

export interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

/** Runs a command to completion; never throws for a non-zero exit. Injected everywhere, for tests. */
export type Spawn = (cmd: string, args: string[], opts?: { env?: NodeJS.ProcessEnv; shell?: boolean; timeoutMs?: number }) => RunResult;

/** proc.ts's `runSync`: this Node, or an allow-listed package manager, with no shell (D9, D14). */
export const spawnSyncRunner: Spawn = (cmd, args, opts = {}) => {
  if (opts.shell === true) return { status: null, stdout: '', stderr: "BragDoc doesn't run commands through a shell" };
  return runSync(cmd, args, {
    ...(opts.env !== undefined ? { env: opts.env } : {}),
    ...(opts.timeoutMs !== undefined ? { timeoutMs: opts.timeoutMs } : {}),
  });
};

/** How long an install may take. */
export const INSTALL_TIMEOUT_MS = 15 * 60 * 1000;

export interface NpmContext {
  spawn?: Spawn;
  env?: NodeJS.ProcessEnv;
  execPath?: string;
  platform?: NodeJS.Platform;
  /** Injected for tests: does this file exist? */
  exists?: (p: string) => boolean;
  realpath?: (p: string) => string;
}

/**
 * How to run the npm that belongs to this Node: `[execPath, npm-cli.js]`, found beside it (`<dir>/npm` is a symlink
 * to it on POSIX; on Windows it's `<dir>/node_modules/npm/bin/npm-cli.js`). Falls back to `npm` on the PATH, for a
 * distribution that packages npm separately.
 */
export function npmCommand(ctx: NpmContext = {}): { cmd: string; pre: string[]; shell: boolean } {
  const execPath = ctx.execPath ?? process.execPath;
  const platform = ctx.platform ?? process.platform;
  const exists = ctx.exists ?? ((p: string) => fs.existsSync(p));
  const realpath = ctx.realpath ?? ((p: string) => fs.realpathSync(p));
  const dir = path.dirname(execPath);
  const candidates =
    platform === 'win32'
      ? [path.join(dir, 'node_modules', 'npm', 'bin', 'npm-cli.js')]
      : [path.join(dir, 'npm'), path.join(dir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js')];
  for (const c of candidates) {
    if (!exists(c)) continue;
    let real = c;
    try {
      real = realpath(c);
    } catch {
      // keep the candidate
    }
    if (real.endsWith('.js')) return { cmd: execPath, pre: [real], shell: false };
  }
  return platform === 'win32' ? { cmd: 'npm.cmd', pre: [], shell: true } : { cmd: 'npm', pre: [], shell: false };
}

/** Quotes each word for `cmd.exe`, for the one case that needs a shell. */
function cmdLine(cmd: string, args: string[]): { cmd: string; args: string[] } {
  const q = (a: string) => (/^[\w@./:=+-]+$/.test(a) ? a : `"${a.replace(/"/g, '""')}"`);
  return { cmd: [cmd, ...args].map(q).join(' '), args: [] };
}

function runWith(cmd: string, args: string[], shell: boolean, ctx: NpmContext, timeoutMs: number): RunResult {
  const run = ctx.spawn ?? spawnSyncRunner;
  const line = shell ? cmdLine(cmd, args) : { cmd, args };
  return run(line.cmd, line.args, { ...(ctx.env !== undefined ? { env: ctx.env } : {}), ...(shell ? { shell: true } : {}), timeoutMs });
}

/** Runs this Node's npm. */
export function runNpm(args: string[], ctx: NpmContext = {}, timeoutMs = INSTALL_TIMEOUT_MS): RunResult {
  const { cmd, pre, shell } = npmCommand(ctx);
  return runWith(cmd, [...pre, ...args], shell, ctx, timeoutMs);
}

const lastLine = (r: RunResult): string | undefined => {
  if (r.status !== 0) return undefined;
  const out = r.stdout.trim().split(/\r?\n/).at(-1)?.trim();
  return out !== undefined && out !== '' && out !== 'undefined' && out !== 'null' ? out : undefined;
};

/** `npm root -g`, or undefined when npm can't answer. */
export function npmGlobalRoot(ctx: NpmContext = {}): string | undefined {
  return lastLine(runNpm(['root', '-g'], ctx, 60_000));
}

/** `npm config get <key>`, or undefined. */
export function npmConfigGet(key: string, ctx: NpmContext = {}): string | undefined {
  return lastLine(runNpm(['config', 'get', key], ctx, 60_000));
}

/**
 * Whether `dir` is really writable (SPEC §5 step 5): a folder is created in it and removed again, the same call npm
 * is about to make. `access(W_OK)` alone says yes to root on a read-only mount, and nothing about ACLs or immutable
 * flags. A folder that doesn't exist yet asks its nearest existing parent, since npm would create it.
 */
export function isWritable(dir: string): boolean {
  let probe = dir;
  while (!fs.existsSync(probe)) {
    const parent = path.dirname(probe);
    if (parent === probe) return false;
    probe = parent;
  }
  try {
    fs.accessSync(probe, fs.constants.W_OK);
    fs.rmSync(fs.mkdtempSync(path.join(probe, '.update-probe-')), { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Where a manager would install, for `isWritable` to ask about. Only npm can be asked (`npm root -g`). For the others
 * there's no answer, and an install that can't write fails with that manager's own message, and rolls back.
 */
export function globalRootFor(manager: PackageManager, ctx: NpmContext = {}): string | undefined {
  return manager === 'npm' ? npmGlobalRoot(ctx) : undefined;
}

/** The global install command, per SPEC §6's last column. */
export function installArgs(manager: PackageManager, spec: string): { cmd: string; args: string[] } {
  switch (manager) {
    case 'npm':
      return { cmd: 'npm', args: ['install', '--global', '--no-audit', '--no-fund', spec] };
    case 'pnpm':
      return { cmd: 'pnpm', args: ['add', '-g', spec] };
    case 'bun':
      return { cmd: 'bun', args: ['add', '-g', spec] };
    case 'volta':
      return { cmd: 'volta', args: ['install', spec] };
  }
}

/** Installs `<name>@<version>` with the manager this install came from. pnpm, bun and volta come from the PATH. */
export function installPackage(o: NpmContext & { manager: PackageManager; packageName: string; version: string }): RunResult {
  const { cmd, args } = installArgs(o.manager, `${o.packageName}@${o.version}`);
  if (o.manager === 'npm') return runNpm(args, o);
  return runWith(cmd, args, (o.platform ?? process.platform) === 'win32', o, INSTALL_TIMEOUT_MS);
}

/**
 * `npm cache add <name>@<version>` (SPEC §5 step 8), for the target and for the current version, while the old one
 * still serves. Caching the current one is what lets a rollback reinstall it when the network is what failed. npm
 * is used whatever the manager: it ships with Node, and the point is only to have the tarball on the machine.
 */
export function cacheAdd(packageName: string, version: string, ctx: NpmContext = {}): RunResult {
  return runNpm(['cache', 'add', `${packageName}@${version}`], ctx);
}

/**
 * A CLI's version, by running it: `node <cli> --version`. This is how `update` shows the install replaced the files
 * before it hands over. A `package.json` beside it answers a different question: a stale symlink, or a pnpm layout
 * whose versioned path moved, shows up here and not there.
 */
export function cliVersion(cliPath: string, ctx: NpmContext = {}): string | undefined {
  const r = (ctx.spawn ?? spawnSyncRunner)(ctx.execPath ?? process.execPath, [cliPath, '--version'], {
    ...(ctx.env !== undefined ? { env: ctx.env } : {}),
    timeoutMs: 60_000,
  });
  if (r.status !== 0) return undefined;
  const line = r.stdout.trim().split(/\r?\n/)[0]?.trim();
  return line !== undefined && /^\d+\.\d+\.\d+/.test(line) ? line : undefined;
}
