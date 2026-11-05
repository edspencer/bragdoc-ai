// From edspencer/cli-contract reference/output.ts @ 1.0; local changes: none.
//
// A CLI's output, the way SPEC §2 and §3 say: errors as `<tool>: <message>` on stderr, colour only on a TTY (honouring
// NO_COLOR and FORCE_COLOR), and with `--json`, one JSON document on stdout and every word of prose on stderr.
// Node built-ins only.

import { EXIT } from './exit-codes.js';

export interface OutputStream {
  write(chunk: string): unknown;
  isTTY?: boolean;
}

export interface OutputOptions {
  /** The bin, for `<tool>: <message>`. */
  tool: string;
  /** `--json` was given: stdout carries exactly one JSON document, and prose goes to stderr. */
  json?: boolean;
  stdout?: OutputStream;
  stderr?: OutputStream;
  env?: NodeJS.ProcessEnv;
}

/**
 * Whether to colour what goes to this stream (SPEC §3).
 *
 * - `NO_COLOR` set to anything but the empty string: never (https://no-color.org).
 * - `FORCE_COLOR` set: `0` or `false` means never, anything else always.
 * - Otherwise only on a TTY, and not when `TERM=dumb`.
 */
export function useColor(stream: OutputStream, env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NO_COLOR !== undefined && env.NO_COLOR !== '') return false;
  if (env.FORCE_COLOR !== undefined) return env.FORCE_COLOR !== '0' && env.FORCE_COLOR !== 'false';
  if (env.TERM === 'dumb') return false;
  return stream.isTTY === true;
}

export interface Paint {
  bold(s: string): string;
  dim(s: string): string;
  red(s: string): string;
  green(s: string): string;
  yellow(s: string): string;
}

const sgr = (open: number, close: number) => (s: string) => `\u001b[${open}m${s}\u001b[${close}m`;
const plain = (s: string) => s;

/** Colour functions that do nothing when `on` is false. */
export function paint(on: boolean): Paint {
  return on
    ? { bold: sgr(1, 22), dim: sgr(2, 22), red: sgr(31, 39), green: sgr(32, 39), yellow: sgr(33, 39) }
    : { bold: plain, dim: plain, red: plain, green: plain, yellow: plain };
}

export interface Output {
  readonly json: boolean;
  /** Colour for prose on stdout (never with `--json`, which has no prose on stdout). */
  readonly color: Paint;
  /** Colour for stderr. */
  readonly errColor: Paint;
  /** Prose for a person: stdout, or stderr under `--json`. */
  say(line: string): void;
  /** A warning on stderr, always. */
  warn(line: string): void;
  /** `<tool>: <message>` on stderr. Returns `code` (default 1), for `return out.error(…)`. Sets nothing itself. */
  error(message: string, code?: number): number;
  /** The one JSON document `--json` promises. Prints nothing without `--json`. */
  result(doc: unknown): void;
}

/** One place for a command's output. Make it once per command, after the flags are parsed. */
export function createOutput(o: OutputOptions): Output {
  const stdout = o.stdout ?? process.stdout;
  const stderr = o.stderr ?? process.stderr;
  const env = o.env ?? process.env;
  const json = o.json === true;
  let printed = false;
  const line = (s: string) => (s.endsWith('\n') ? s : `${s}\n`);
  return {
    json,
    color: paint(!json && useColor(stdout, env)),
    errColor: paint(useColor(stderr, env)),
    say(s) {
      (json ? stderr : stdout).write(line(s));
    },
    warn(s) {
      stderr.write(line(s));
    },
    error(message, code = EXIT.FAILED) {
      stderr.write(line(`${o.tool}: ${message}`));
      return code;
    },
    result(doc) {
      if (!json) return;
      if (printed) throw new Error('--json prints one document; result() was called twice');
      printed = true;
      stdout.write(`${JSON.stringify(doc, null, 2)}\n`);
    },
  };
}

/**
 * A usage error (SPEC §2: exit 2, with the usage after the message). Throw it from argument parsing and let the
 * top level print it with `reportUsageError`.
 */
export class UsageError extends Error {
  override name = 'UsageError';
}

/** Prints `<tool>: <message>`, then the usage, on stderr, and returns 2. */
export function reportUsageError(out: Output, err: UsageError, usage: string): number {
  out.error(err.message);
  out.warn(`\n${usage.trimEnd()}`);
  return EXIT.USAGE;
}

/**
 * A closed pipe (`<tool> … | head -1`) exits quietly (SPEC §2): without this, Node throws EPIPE from a later write
 * and prints a stack trace. Call once, at startup.
 */
export function exitQuietlyOnEpipe(stream: NodeJS.WriteStream = process.stdout, exit: (code: number) => void = (c) => process.exit(c)): void {
  stream.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EPIPE') exit(typeof process.exitCode === 'number' ? process.exitCode : 0);
    else throw err;
  });
}
