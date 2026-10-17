// What every command gets (adapted from Hallway's server/commands/context.ts): where to write, the environment, and
// everything that touches the machine (the service manager's runner, the health probe, the clock), so a test can
// inject all of it and nothing in a test reaches the real service manager or a real home.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PACKAGE_ROOT, tildify } from '../paths.js';
import { type Runner, type Streamer, defaultRunner, defaultStreamer } from '../platform/runner.js';
import { type AllowedBin, type RunOptions, type RunResult, run as procRun } from '../proc.js';
import { type Probe, probeHealth } from './ready.js';

export interface Ctx {
  env: NodeJS.ProcessEnv;
  out(s: string): void;
  err(s: string): void;
  /** `process.platform`. */
  platform: NodeJS.Platform;
  /** The user's home directory (for ~ and the service directories). */
  homedir: string;
  /** The user's id (launchd's `gui/<uid>`). */
  uid: number;
  /** The real path of the Node running this, and its version: what a service will run. */
  node: { path: string; version: string };
  /** The real path of the CLI script running this: dist/server/cli.js once built, server/cli.ts from source. */
  cliScript: string;
  /** The package's root directory, tested for npx's cache. */
  packageRoot: string;
  run: Runner;
  stream: Streamer;
  /** Run an allow-listed program (proc.ts run()): `claude` for `mcp install`. */
  proc(bin: AllowedBin, args: readonly string[], opts?: RunOptions): Promise<RunResult>;
  probe(port: number): Promise<Probe>;
  sleep(ms: number): Promise<void>;
  now(): number;
  /** Follow a growing file, calling `write` with what's appended, until the process is interrupted. */
  follow(file: string, write: (s: string) => void): void;
}

export type CtxOptions = Partial<Ctx>;

const realpath = (p: string) => {
  try {
    return fs.realpathSync.native(p);
  } catch {
    return p;
  }
};

/** The home directory: `os.homedir()` throws on a machine with no passwd entry. */
function safeHomedir(): string {
  try {
    return os.homedir();
  } catch {
    return process.env.HOME ?? '/';
  }
}

export function makeCtx(o: CtxOptions = {}): Ctx {
  return {
    env: process.env,
    out: (s) => process.stdout.write(s),
    err: (s) => process.stderr.write(s),
    platform: process.platform,
    homedir: safeHomedir(),
    uid: process.getuid?.() ?? 0,
    node: { path: realpath(process.execPath), version: process.version },
    // this file is <root>/{dist/,}server/commands/context.{js,ts}; the CLI sits beside it, one level up
    cliScript: realpath(path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), path.extname(fileURLToPath(import.meta.url)) === '.ts' ? 'cli.ts' : 'cli.js')),
    packageRoot: realpath(PACKAGE_ROOT),
    run: defaultRunner,
    stream: defaultStreamer,
    proc: procRun,
    probe: (port) => probeHealth(port),
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    now: Date.now,
    follow: followFile,
    ...o,
  };
}

/** `tail -f` in Node (Hallway's followFiles): no subprocess, and a file that's truncated or replaced starts over. */
export function followFile(file: string, write: (s: string) => void, intervalMs = 250): void {
  const size = () => {
    try {
      return fs.statSync(file).size;
    } catch {
      return 0;
    }
  };
  let offset = size();
  setInterval(() => {
    const s = size();
    if (s < offset) offset = 0;
    if (s > offset) {
      const fd = fs.openSync(file, 'r');
      const buf = Buffer.alloc(s - offset);
      fs.readSync(fd, buf, 0, buf.length, offset);
      fs.closeSync(fd);
      write(buf.toString('utf8'));
    }
    offset = s;
  }, intervalMs);
}

/** The last `n` lines of a file ('' if it's missing), read from its end so a large log isn't read whole. */
export function lastLines(file: string, n: number, maxBytes = 256 * 1024): string {
  let fd: number;
  try {
    fd = fs.openSync(file, 'r');
  } catch {
    return '';
  }
  try {
    const size = fs.fstatSync(fd).size;
    const len = Math.min(size, maxBytes);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, size - len);
    const lines = buf.toString('utf8').split('\n');
    if (lines.at(-1) === '') lines.pop();
    return lines.slice(-n).join('\n') + (lines.length ? '\n' : '');
  } finally {
    fs.closeSync(fd);
  }
}

export const show = (p: string, homedir?: string) => tildify(p, homedir);
