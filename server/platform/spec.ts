// What BragDoc's login service IS, independent of how launchd or systemd spells it. Everything here is pure: the two
// writers (launchd.ts, systemd.ts) take a ServiceSpec and render a plist or a unit, so both are tested on any OS
// against the golden files in test/fixtures/services/. The decisions, and where they were learned:
//
//   - **Node and the CLI by absolute, real path** (Paddock): `process.execPath` and the realpath of dist/server/cli.js,
//     never the `bragdoc` bin shim. The shim's `#!/usr/bin/env node` has to find `node` on PATH, and a service's PATH
//     is a stub; under a version manager there's no `node` on it at all.
//   - **PATH captured at install** (Paddock, with Hallway's filtering: platform/path.ts), so `gh` and `git` resolve.
//   - **Always restarted, never conditionally** (Paddock #872): KeepAlive `<true/>` / `Restart=always`. A clean exit
//     on SIGTERM (sleep, logout, a stray kill) would otherwise read as "meant to stop" and leave BragDoc down until
//     the next login. Stopping on purpose is a command (`bragdoc service stop`), not an exit code.
//   - **The port is always written into the unit**, so `status` reads it back from the unit (Paddock): the URL it
//     prints is the one the service actually serves, whatever today's flags or defaults are.
//   - **The data home is written only when it was chosen** (`--data-dir` or $BRAGDOC_HOME), Paddock's rule: with
//     nothing named, the service and a `bragdoc` typed into a terminal both use ~/.bragdoc, one instance.
//   - **Never from npx's cache** (Paddock's isNpxPath, Hallway's transient.ts): a unit pointing there works until npm
//     prunes the cache, and then fails silently at some later login.
//   - **A LaunchAgent, not a LaunchDaemon; a user unit, not a system one**: it runs as you, from login. It starts
//     at login, not at boot (Paddock); every message about the service says so.
import { posix as path } from 'node:path';
import { DEFAULT_PORT } from '../port.js';

/** The launchd label: reverse-DNS, stable, what someone types into `launchctl print gui/<uid>/…`. */
export const LAUNCHD_LABEL = 'ai.bragdoc.local';
/** The systemd user unit: what someone types into `systemctl --user status …` or `journalctl --user -u …`. */
export const SYSTEMD_UNIT = 'bragdoc.service';

/** The service, everything in it already absolute and resolved. */
export interface ServiceSpec {
  /** For people: the unit's Description. */
  description: string;
  /** The argv: `[node, cli.js, 'serve', '--port', '<n>', …]`, the first two absolute real paths. */
  program: string[];
  /** `<data home>/service`: a directory the service certainly owns (Paddock's serviceDir). */
  cwd: string;
  /** The whole environment the job gets: PATH. Nothing secret: a plist and a unit are readable files. */
  env: Record<string, string>;
  /** launchd only: where stdout and stderr go. systemd sends both to the journal. */
  log: string;
  /** The Node that runs it, recorded in a comment so a reader can tell when it has been uninstalled. */
  node: { path: string; version: string };
}

export interface SpecInput {
  /** The real path of the Node that will run the service (`process.execPath`, realpath'd). */
  nodePath: string;
  nodeVersion: string;
  /** The real path of the built CLI, dist/server/cli.js. */
  cliScript: string;
  /** The data home, absolute. */
  dataDir: string;
  /** True when the data home was chosen (`--data-dir`, $BRAGDOC_HOME) rather than defaulted: then it's written in. */
  dataDirChosen: boolean;
  port: number;
  /** The PATH to give the job (platform/path.ts servicePath). */
  pathEnv: string;
}

/** The service's own directory in the data home: its working directory, and its log on macOS. */
export const serviceDir = (dataDir: string) => path.join(dataDir, 'service');

/**
 * Assemble the spec. `serve` is spelled out although it's the default, so the argv `launchctl print` shows reads as
 * what it does. `--open` is never passed on (a browser tab at every login isn't a feature), nor `--quiet` (the log is
 * where the version and data home are useful).
 */
export function buildSpec(i: SpecInput): ServiceSpec {
  const dir = serviceDir(i.dataDir);
  return {
    description: 'BragDoc: your achievements, on localhost',
    program: [i.nodePath, i.cliScript, 'serve', '--port', String(i.port), ...(i.dataDirChosen ? ['--data-dir', i.dataDir] : [])],
    cwd: dir,
    env: { PATH: i.pathEnv },
    log: path.join(dir, 'bragdoc.log'),
    node: { path: i.nodePath, version: i.nodeVersion },
  };
}

/** What an installed unit's argv says: the port and data home it serves (null: not named, so the default). */
export function readArgv(argv: string[]): { port: number; dataDir: string | null } {
  const value = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1]! : null;
  };
  const p = Number(value('--port'));
  return { port: Number.isInteger(p) && p > 0 && p <= 65535 ? p : DEFAULT_PORT, dataDir: value('--data-dir') };
}

// ---------------------------------------------------------------------------------------------------------------
// Transient installs (adapted from Hallway's server/services/transient.ts; Paddock's isNpxPath)
// ---------------------------------------------------------------------------------------------------------------

export interface Transient {
  /** What it is, for messages: "npx's cache". */
  where: string;
  /** Who can delete it: "npm". */
  owner: string;
}

const TRANSIENT: readonly { re: RegExp; where: string; owner: string }[] = [
  // matched on a separator both sides, so a project that happens to be called `_npx` isn't caught
  { re: /[/\\]_npx[/\\]/i, where: "npx's cache", owner: 'npm' },
  // pnpm 9+: <cache dir>/dlx/<hash>/… (~/.cache/pnpm, ~/Library/Caches/pnpm)
  { re: /[/\\]pnpm[^/\\]*[/\\]dlx[/\\]/i, where: "pnpm dlx's cache", owner: 'pnpm' },
  { re: /[/\\]bunx-[^/\\]+[/\\]/i, where: "bunx's cache", owner: 'bun' },
  // older pnpm dlx and yarn dlx: a temporary dlx-<pid> directory
  { re: /[/\\]dlx-\d+[/\\]/i, where: 'a temporary dlx directory', owner: 'the package manager' },
];

/**
 * Is BragDoc running from somewhere that won't last? `npx @bragdoc/local` runs it out of npx's per-invocation cache
 * (~/.npm/_npx/<hash>/node_modules/@bragdoc/local), which npm prunes when it likes; pnpm dlx, bunx and yarn dlx do the
 * same. Fine for a foreground `bragdoc`; fatal, later and silently, for a service. Pure: it looks only at the string.
 */
export function transientInstall(p: string): Transient | null {
  const hit = TRANSIENT.find((t) => t.re.test(p));
  return hit ? { where: hit.where, owner: hit.owner } : null;
}

/** Why `service install` refuses to run from a transient install. */
export function transientRefusal(t: Transient): string {
  return (
    `BragDoc is running from ${t.where}, which ${t.owner} can delete at any time, so a service pointing there would ` +
    `stop working at some later login. Install it first, then run the installed one:\n\n` +
    `  npm i -g @bragdoc/local && bragdoc service install`
  );
}
