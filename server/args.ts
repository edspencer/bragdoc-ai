// Command-line parsing for `bragdoc`, kept apart from cli.ts (which runs on import) so it can be unit-tested.
// Exit codes (SPEC R1): 0 success, 1 error, 2 usage error (with the usage printed): a UsageError is the 2.
// PR5 grows this into the full command set; add a flag to VALUE_FLAGS or BOOLEAN_FLAGS and to the command's `check`.

/** Bad usage: exit 2, with the usage. Anything else thrown exits 1. */
export class UsageError extends Error {}

/** Options that take a value (`--port 5050` or `--port=5050`). */
const VALUE_FLAGS = ['port', 'host', 'data-dir'];
/** Options that don't. */
const BOOLEAN_FLAGS: string[] = [];

export interface ParsedArgs {
  pos: string[];
  flags: Record<string, string>;
  /** Everything after a bare `--`, untouched; absent without `--`. */
  rest?: string[];
}

export function parseArgs(argv: string[]): ParsedArgs {
  const pos: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--') return { pos, flags, rest: argv.slice(i + 1) };
    if (a === '-h' || a === '--help') flags.help = '1';
    else if (a === '-v' || a === '--version') flags.version = '1';
    else if (a === '-q' || a === '--quiet') flags.quiet = '1';
    else if (a.startsWith('--')) {
      if (BOOLEAN_FLAGS.includes(a.slice(2))) {
        flags[a.slice(2)] = '1';
        continue;
      }
      const eq = a.indexOf('=');
      const [k, v] = eq > 0 ? [a.slice(2, eq), a.slice(eq + 1)] : [a.slice(2), argv[++i]];
      if (!VALUE_FLAGS.includes(k)) throw new UsageError(`unknown option --${k}`);
      if (v === undefined) throw new UsageError(`--${k} needs a value`);
      flags[k] = v;
    } else if (a.startsWith('-') && a.length > 1) throw new UsageError(`unknown option ${a}`);
    else pos.push(a);
  }
  return { pos, flags };
}

/** Addresses that only this computer can reach. `--host` takes a bare address: `::1`, not the URL form `[::1]`. */
export const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1']);

/** `--host`'s value as listen() wants it: `[::1]` (an address as it appears in a URL) becomes `::1`. */
export function parseHost(flag: string | undefined): string {
  const host = (flag ?? '127.0.0.1').replace(/^\[(.*)\]$/, '$1');
  if (!host) throw new UsageError('--host needs an address');
  return host;
}

/** Each command takes its own options and at most `max` arguments, and a `-- <command>` only if `takesRest`. */
export function check(cmd: string, flags: Record<string, string>, allowed: string[], args: string[], max: number, rest?: string[], takesRest = false) {
  const bad = Object.keys(flags).find((k) => !allowed.includes(k));
  if (bad) throw new UsageError(`${cmd} doesn't take --${bad}`);
  if (args.length > max) throw new UsageError(`unexpected argument '${args[max]}'`);
  if (rest !== undefined && !takesRest) throw new UsageError(`${cmd} doesn't take a command after --`);
}
