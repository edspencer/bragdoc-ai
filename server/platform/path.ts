// The PATH trap (adapted from Hallway's server/services/resolve.ts). launchd and systemd jobs inherit no shell
// environment, so the service's PATH is captured when it's installed and written into its definition. Copying the
// current shell's PATH naïvely is a latent bug: version managers put per-shell directories on it (fnm's
// `fnm_multishells/<pid>_<ts>/bin`), which outlive nothing reliably. So the job's PATH is:
//   - the bin directory of the Node that runs it first, so `node` in the job is that Node;
//   - then the current PATH minus per-shell directories, relative entries and anything that doesn't exist;
//   - then the usual system directories (`gh` and `git` live there, and later sources need them).
import fs from 'node:fs';
import path from 'node:path';

/** PATH entries that belong to one shell session or one npm invocation, never to a long-lived job. */
export const PER_SHELL_PATTERNS: readonly RegExp[] = [
  /[/\\]fnm_multishells[/\\]/, // fnm: a symlink per terminal, never cleaned up
  /[/\\]_npx[/\\]/, // npx's per-invocation package cache
  /[/\\]node-gyp-bin$/, // added by `npm run` for the script it's running
];

/** Where the usual tools live, after the current PATH (only those that exist are kept). */
export const SYSTEM_DIRS = ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin'];

export const isPerShell = (dir: string) => PER_SHELL_PATTERNS.some((re) => re.test(dir) || re.test(`${dir}/`));

const isDir = (p: string) => {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
};

/** Why a PATH entry is dropped, or null if it's kept. `exists` is a parameter so tests needn't touch the disk. */
export function pathProblem(dir: string, exists: (p: string) => boolean = isDir): string | null {
  if (!dir || !path.posix.isAbsolute(dir)) return 'not an absolute path';
  if (isPerShell(dir)) return 'a per-shell directory (it belongs to one terminal session)';
  if (!exists(dir)) return "doesn't exist";
  return null;
}

/** The job's PATH: Node's bin first, then the usable part of `inherited`, then the system directories. */
export function servicePath(nodeBin: string | null, inherited: string | undefined, exists: (p: string) => boolean = isDir): string {
  const out: string[] = [];
  const add = (d: string) => {
    // trailing separators off, but never the root's own
    const clean = d === '/' ? d : d.replace(/\/+$/, '');
    if (!out.includes(clean) && pathProblem(clean, exists) === null) out.push(clean);
  };
  if (nodeBin) add(nodeBin);
  // ':' always: services are macOS and Linux only (Windows says "not supported yet" before getting here)
  for (const d of (inherited ?? '').split(':')) add(d);
  for (const d of SYSTEM_DIRS) add(d);
  return out.join(':');
}
