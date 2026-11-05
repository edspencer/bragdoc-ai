// From edspencer/cli-contract reference/install-method.ts @ 0.2; local changes: none.
//
// How was this copy installed? (SPEC §6.) `update` can't run `npm install -g` on a checkout, in a container or out of
// npx's cache, so before it touches anything it works out which of the table's ten rows it's in, and either picks the
// package manager or prints the command that would work and exits 5.
//
// Nothing here knows about a particular tool: the package name, the environment prefix and the entry script come in
// as data, and everything that touches the world (`npm root -g`, reading a manifest, resolving a symlink) is injected,
// so all ten rows can be tested against made-up layouts on one machine. Node built-ins only.

import fsDefault from 'node:fs';
import path from 'node:path';

/** SPEC §6's rows, in its order. Matches `schemas/update-check.schema.json`. */
export type InstallMethod =
  | 'docker'
  | 'managed'
  | 'npx'
  | 'checkout'
  | 'npm-global'
  | 'pnpm-global'
  | 'bun-global'
  | 'volta'
  | 'yarn-global'
  | 'dependency';

/** The package managers that can replace an install in place. */
export type PackageManager = 'npm' | 'pnpm' | 'bun' | 'volta';

export interface FsLike {
  existsSync(p: string): boolean;
  readFileSync(p: string, encoding: 'utf8'): string;
  realpathSync(p: string): string;
}

export interface DetectInput {
  /** The published package's name: `@edspencer/paddock`. */
  packageName: string;
  /** The environment prefix: `PADDOCK` gives `PADDOCK_IN_DOCKER` and `PADDOCK_UPDATE_HINT`. */
  envPrefix: string;
  /** The script to walk up from: `process.argv[1]`. It's realpath'd here, because npm installs a bin as a symlink. */
  entry: string;
  env: NodeJS.ProcessEnv;
  /** `npm root -g`, asked of the npm beside `process.execPath` (`package-manager.ts`). Undefined if npm can't say. */
  npmGlobalRoot?: () => string | undefined;
  fs?: FsLike;
}

export interface InstallInfo {
  method: InstallMethod;
  /**
   * The folder whose `package.json` has our name or, when none does, the nearest folder with a `package.json` at all.
   * The fallback is what makes a checkout of a tool whose published package is put together at build time (Paddock's)
   * come out as a checkout rather than as nothing.
   */
  packageRoot: string | undefined;
  /** Whether the name was found, rather than fallen back from. */
  named: boolean;
  /** Whether `update` can install a new version itself, or must print a command and exit 5. */
  canUpdate: boolean;
  /** The package manager to install with, when it can. */
  manager?: PackageManager;
  /** `<TOOL>_UPDATE_HINT`, when it's set. */
  hint?: string;
}

/** `PADDOCK` → `PADDOCK_IN_DOCKER`. */
export const inDockerVar = (prefix: string): string => `${prefix}_IN_DOCKER`;
/** `PADDOCK` → `PADDOCK_UPDATE_HINT`. */
export const updateHintVar = (prefix: string): string => `${prefix}_UPDATE_HINT`;

/** Walks up from `entry` to the folder whose `package.json` has our name (see `InstallInfo.packageRoot`). */
export function findPackageRoot(entry: string, packageName: string, fs: FsLike): { root: string | undefined; named: boolean } {
  let dir = path.dirname(realpathOr(entry, fs));
  let nearest: string | undefined;
  for (;;) {
    const manifest = path.join(dir, 'package.json');
    if (fs.existsSync(manifest)) {
      nearest ??= dir;
      try {
        if ((JSON.parse(fs.readFileSync(manifest, 'utf8')) as { name?: unknown }).name === packageName) return { root: dir, named: true };
      } catch {
        // A broken package.json on the way up isn't ours; keep walking.
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) return { root: nearest, named: false };
    dir = parent;
  }
}

function realpathOr(p: string, fs: FsLike): string {
  try {
    return fs.realpathSync(p);
  } catch {
    return p;
  }
}

const segments = (p: string) => p.split(/[/\\]/);

/** Whether a path is inside a `node_modules` folder: by segment, so `my-node_modules` isn't one. */
export function underNodeModules(p: string): boolean {
  return segments(p).includes('node_modules');
}

/**
 * The npx, pnpm dlx, bunx and yarn dlx caches (SPEC §6). `_npx` and `bunx-…` are matched as whole segments; pnpm's
 * `…/dlx/<hash>` and yarn's `xfs-<hash>/dlx-<n>` need a segment that is `dlx` or starts `dlx-`.
 */
export function isEphemeralCachePath(p: string): boolean {
  return segments(p).some((seg) => seg === '_npx' || seg === 'dlx' || seg.startsWith('dlx-') || seg.startsWith('bunx-'));
}

function hasSegments(p: string, run: readonly string[]): boolean {
  const parts = segments(p);
  for (let i = 0; i + run.length <= parts.length; i++) {
    if (run.every((s, j) => parts[i + j] === s)) return true;
  }
  return false;
}

/**
 * Which of SPEC §6's rows this install is, checked in the table's order.
 *
 * - **Docker beats managed.** A container an Ansible role also labelled is an image, but `hint` still carries the
 *   operator's sentence, and `updateCommand` prints it rather than guessing a `docker compose` line.
 * - **No package root at all** reads as a checkout: it refuses to install, and "you're running from source" is the
 *   least wrong thing to say.
 */
export function detectInstall(input: DetectInput): InstallInfo {
  const fs = input.fs ?? fsDefault;
  const env = input.env;
  const { root, named } = findPackageRoot(input.entry, input.packageName, fs);
  const hint = env[updateHintVar(input.envPrefix)];
  const base = { packageRoot: root, named, ...(hint !== undefined && hint !== '' ? { hint } : {}) };

  // 1. The tool's own Dockerfile sets this. Never `/.dockerenv`: dev containers have it, and a global install in one
  //    is a legitimate thing to update.
  if (env[inDockerVar(input.envPrefix)] === '1') return { ...base, method: 'docker', canUpdate: false };
  // 2. Something outside owns this install, and said so.
  if (base.hint !== undefined) return { ...base, method: 'managed', canUpdate: false };
  if (root === undefined) return { ...base, method: 'checkout', canUpdate: false };
  // 3. A hash-keyed cache that gets pruned.
  if (isEphemeralCachePath(root)) return { ...base, method: 'npx', canUpdate: false };
  // 4. A checkout or an `npm link`: not under a node_modules at all.
  if (!underNodeModules(root)) return { ...base, method: 'checkout', canUpdate: false };
  // 5. The package root is `<npm root -g>/<name>`.
  const globalRoot = input.npmGlobalRoot?.();
  if (globalRoot !== undefined && samePath(root, path.join(globalRoot, input.packageName), fs)) {
    return { ...base, method: 'npm-global', canUpdate: true, manager: 'npm' };
  }
  // 6–9. The other global layouts, each known by a run of segments in its path.
  if (hasSegments(root, ['pnpm', 'global'])) return { ...base, method: 'pnpm-global', canUpdate: true, manager: 'pnpm' };
  if (hasSegments(root, ['.bun', 'install', 'global'])) return { ...base, method: 'bun-global', canUpdate: true, manager: 'bun' };
  if (hasSegments(root, ['.volta', 'tools', 'image', 'packages'])) return { ...base, method: 'volta', canUpdate: true, manager: 'volta' };
  // Yarn classic is unmaintained and berry has no global add, so SPEC §6 prints the command rather than running it.
  if (hasSegments(root, ['yarn', 'global', 'node_modules'])) return { ...base, method: 'yarn-global', canUpdate: false };
  // 10. Under some other node_modules: a dependency of a project.
  return { ...base, method: 'dependency', canUpdate: false };
}

/** A global root is often reached through a symlink (Homebrew's, nvm's), so realpaths count too. */
function samePath(a: string, b: string, fs: FsLike): boolean {
  return path.resolve(a) === path.resolve(b) || realpathOr(a, fs) === realpathOr(b, fs);
}

export interface CommandInput {
  packageName: string;
  /** The version to install, once it's known. */
  target?: string;
  /** The image, for the Docker row: `ghcr.io/edspencer/paddock`. */
  image?: string;
  /** `sudo` in front: SPEC §5 step 5's not-writable case. */
  sudo?: boolean;
  /** What brings a checkout up to date, if not `git pull && npm install && npm run build`. */
  checkoutCommand?: string;
}

/**
 * The command SPEC §3's notice prints for this install, and the note in brackets after it. The rows that can update
 * themselves get the package manager's own command here; the notice prints `<tool> update` for those instead.
 */
export function updateCommand(info: InstallInfo, input: CommandInput): { command: string; note?: string } {
  const spec = input.target !== undefined ? `${input.packageName}@${input.target}` : input.packageName;
  switch (info.method) {
    case 'docker': {
      if (info.hint !== undefined) return { command: info.hint };
      const tag = input.target !== undefined ? `:${input.target}` : '';
      return { command: 'docker compose pull && docker compose up -d', ...(input.image !== undefined ? { note: `image ${input.image}${tag}` } : {}) };
    }
    case 'managed':
      return { command: info.hint ?? 'ask whoever manages this install' };
    case 'npx':
      return { command: `npx ${input.packageName}@latest`, note: 'npx already runs the latest version each time' };
    case 'checkout':
      return { command: input.checkoutCommand ?? 'git pull && npm install && npm run build', note: 'this is a checkout' };
    case 'npm-global':
      return input.sudo === true
        ? { command: `sudo npm install -g ${spec}`, note: "the global folder isn't writable" }
        : { command: `npm install -g ${spec}` };
    case 'pnpm-global':
      return { command: `pnpm add -g ${spec}` };
    case 'bun-global':
      return { command: `bun add -g ${spec}` };
    case 'volta':
      return { command: `volta install ${spec}` };
    case 'yarn-global':
      return { command: `yarn global add ${spec}` };
    case 'dependency': {
      const project = info.packageRoot !== undefined ? ` (${projectOf(info.packageRoot)})` : '';
      return { command: `npm install ${spec}`, note: `run it in the project that depends on ${input.packageName}${project}` };
    }
  }
}

/** The folder above a dependency's `node_modules`. */
function projectOf(packageRoot: string): string {
  const parts = segments(packageRoot);
  const i = parts.lastIndexOf('node_modules');
  return i <= 0 ? packageRoot : packageRoot.slice(0, parts.slice(0, i).join('/').length);
}

/** A line a person can read, for each row. */
export function describeInstall(info: InstallInfo, packageName: string): string {
  switch (info.method) {
    case 'docker':
      return 'running from a container image';
    case 'managed':
      return "managed by something outside this machine's package manager";
    case 'npx':
      return 'running from an npx or dlx cache';
    case 'checkout':
      return info.packageRoot !== undefined ? `running from a checkout at ${info.packageRoot}` : 'running from a checkout';
    case 'npm-global':
      return 'installed globally with npm';
    case 'pnpm-global':
      return 'installed globally with pnpm';
    case 'bun-global':
      return 'installed globally with bun';
    case 'volta':
      return 'installed with volta';
    case 'yarn-global':
      return 'installed globally with yarn (classic)';
    case 'dependency':
      return `installed as a dependency of another project (${packageName})`;
  }
}
