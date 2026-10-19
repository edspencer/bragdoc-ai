// The one way to run another program (SPEC R3, D9): run() collects output, runAttached() hands it this terminal,
// launch() starts one and lets it go. execFile with an argument array, never a shell, so nothing in an
// argument (a repo path, a branch name) can be read as shell syntax; and only the allow-listed binaries below.
// test/guard-egress.test.ts fails CI if any other file in server/ or shared/ imports node:child_process.
//
// The gh CLI makes network requests outside BragDoc's egress module, so whoever runs it also logs it through
// Egress.logProcess() (honestly marked "via gh CLI" in Settings → Network activity).
import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** The binaries BragDoc may run, by name (found on PATH). Anything else is refused before it's started. */
export const ALLOWED_BINS = ['gh', 'git', 'osascript', 'defaults', 'launchctl', 'systemctl', 'journalctl', 'claude', 'open', 'xdg-open', 'pmset'] as const;
export type AllowedBin = (typeof ALLOWED_BINS)[number];

export const DEFAULT_TIMEOUT_MS = 30_000;
/** Per stream: a runaway command can't fill memory. */
export const DEFAULT_MAX_OUTPUT = 10 * 1024 * 1024;

export interface RunOptions {
  cwd?: string;
  /** The child's whole environment (default: this process's). */
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  maxOutput?: number;
  /** Written to the child's stdin, which is then closed. */
  input?: string;
}

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** The command couldn't run: not allowed, not installed, timed out, or too much output. A non-zero exit isn't this. */
export class ProcError extends Error {
  constructor(
    message: string,
    readonly code: 'not_allowed' | 'not_found' | 'timeout' | 'too_much_output' | 'failed',
  ) {
    super(message);
    this.name = 'ProcError';
  }
}

function assertAllowed(bin: string, args: readonly string[]): asserts bin is AllowedBin {
  if (!(ALLOWED_BINS as readonly string[]).includes(bin)) throw new ProcError(`BragDoc doesn't run ${JSON.stringify(bin)} (allowed: ${ALLOWED_BINS.join(', ')})`, 'not_allowed');
  for (const a of args) if (typeof a !== 'string' || a.includes('\0')) throw new ProcError(`a bad argument for ${bin}`, 'not_allowed');
}

/**
 * The absolute path `bin` would run as, from the absolute entries of PATH only. An empty or relative entry (`::` or `.`
 * in someone's PATH) would make `git`, run with a repo as its cwd, run that repo's own ./git. Null if it isn't found.
 * Windows (unsupported in v0.1, D14) keeps the plain name, for its PATHEXT lookup.
 */
export function resolveBin(bin: AllowedBin, env: NodeJS.ProcessEnv = process.env): string | null {
  if (process.platform === 'win32') return bin;
  return onPath(bin, env);
}

/**
 * Is there an executable called `name` on PATH (absolute entries only)? A look at the file system and nothing more:
 * Settings → AI uses it to say "Ollama is installed" for a program BragDoc is never allowed to run (it isn't in
 * ALLOWED_BINS). Returns its path, or null.
 */
export function onPath(name: string, env: NodeJS.ProcessEnv = process.env): string | null {
  if (!/^[\w.-]+$/.test(name)) return null;
  for (const dir of (env.PATH ?? '').split(path.delimiter)) {
    if (!path.isAbsolute(dir)) continue;
    const p = path.join(dir, name);
    try {
      if (fs.statSync(p).isFile()) {
        fs.accessSync(p, fs.constants.X_OK);
        return p;
      }
    } catch {
      /* not here */
    }
  }
  return null;
}

const notFound = (bin: string) => new ProcError(`${bin} isn't installed (or isn't on PATH)`, 'not_found');

/** Run `bin` with `args` and collect its output. Resolves with the exit code, whatever it is; rejects with ProcError. */
export function run(bin: AllowedBin, args: readonly string[], { cwd, env = process.env, timeoutMs = DEFAULT_TIMEOUT_MS, maxOutput = DEFAULT_MAX_OUTPUT, input }: RunOptions = {}): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    assertAllowed(bin, args); // inside the executor: a refusal is a rejection, like every other failure
    const file = resolveBin(bin, env);
    if (!file) return reject(notFound(bin));
    const child = execFile(
      file,
      [...args],
      { cwd, env, timeout: timeoutMs, maxBuffer: maxOutput, encoding: 'utf8', shell: false, windowsHide: true, killSignal: 'SIGKILL' },
      (err, stdout, stderr) => {
        if (!err) return resolve({ code: 0, stdout, stderr });
        const e = err as NodeJS.ErrnoException & { killed?: boolean; code?: string | number; signal?: string };
        if (e.code === 'ENOENT') return reject(notFound(bin));
        if (e.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') return reject(new ProcError(`${bin} wrote more than ${maxOutput} bytes`, 'too_much_output'));
        if (e.killed && e.signal) return reject(new ProcError(`${bin} took longer than ${timeoutMs} ms`, 'timeout'));
        if (typeof e.code === 'number') return resolve({ code: e.code, stdout, stderr });
        reject(new ProcError(`${bin}: ${e.message}`, 'failed'));
      },
    );
    if (input !== undefined) child.stdin?.end(input);
    else child.stdin?.end();
  });
}

/** Signals that stop `bragdoc` while a child runs attached: each is passed on to the child, which ends the run. */
const FORWARDED: readonly NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];

/**
 * Run `bin` attached to this terminal (stdio inherited): for `bragdoc service logs`, which follows journalctl. Resolves
 * with the exit code (128 + signal number if it was killed).
 *
 * While it runs, SIGINT, SIGTERM and SIGHUP sent to this process are forwarded to the child. A terminal's Ctrl-C
 * reaches the whole process group anyway, but a SIGTERM or SIGHUP sent to `bragdoc` alone (an agent's timeout, a
 * closed ssh session) would otherwise leave `journalctl -f` running on its own, holding our stdout open. Our own
 * listeners also keep Node from dying before the child has: the run ends when the child exits, and the listeners go.
 */
export function runAttached(bin: AllowedBin, args: readonly string[], { cwd, env = process.env }: Pick<RunOptions, 'cwd' | 'env'> = {}): Promise<number> {
  return new Promise((resolve, reject) => {
    assertAllowed(bin, args);
    const file = resolveBin(bin, env);
    if (!file) return reject(notFound(bin));
    const child = spawn(file, [...args], { cwd, env, stdio: 'inherit', shell: false, windowsHide: true });
    const forward = (sig: NodeJS.Signals) => child.kill(sig);
    for (const s of FORWARDED) process.on(s, forward);
    const settle = () => {
      for (const s of FORWARDED) process.off(s, forward);
    };
    // after a successful spawn, an 'error' is a signal that couldn't be delivered: the child still runs, and its exit
    // settles the run
    let spawned = false;
    child.once('spawn', () => (spawned = true));
    child.on('error', (e: NodeJS.ErrnoException) => {
      if (spawned) return;
      settle();
      reject(e.code === 'ENOENT' ? notFound(bin) : e);
    });
    child.once('exit', (code, signal) => {
      settle();
      resolve(code ?? 128 + (signal ? (os.constants.signals[signal] ?? 0) : 0));
    });
  });
}

/**
 * Start `bin` and don't wait for it: the browser for `bragdoc --open`. Detached, with no stdio and unref'd, so it
 * neither holds this terminal nor keeps BragDoc alive, and outlives it. Resolves once the program has started; rejects
 * with ProcError if it isn't allowed, isn't installed or couldn't start.
 */
export function launch(bin: AllowedBin, args: readonly string[], { cwd, env = process.env }: Pick<RunOptions, 'cwd' | 'env'> = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    assertAllowed(bin, args);
    const file = resolveBin(bin, env);
    if (!file) return reject(notFound(bin));
    const child = spawn(file, [...args], { cwd, env, stdio: 'ignore', detached: true, shell: false, windowsHide: true });
    child.once('error', (e: NodeJS.ErrnoException) => reject(e.code === 'ENOENT' ? notFound(bin) : new ProcError(`${bin}: ${e.message}`, 'failed')));
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });
}
