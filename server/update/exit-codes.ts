// From edspencer/cli-contract reference/exit-codes.ts @ 0.2; local changes: none.
//
// The exit codes every tool shares (SPEC §2). Copy this file; don't renumber it.
//
// Set `process.exitCode`, never call `process.exit()`, so piped output isn't cut short.

export const EXIT = {
  /** Done; running and answering; up to date; not busy. */
  OK: 0,
  /** Failed. */
  FAILED: 1,
  /** Usage: an unknown command or flag, a bad value. The usage is printed after the message. */
  USAGE: 2,
  /** Not running: installed but not running or not answering, or no instance answers. */
  NOT_RUNNING: 3,
  /** Not installed: there's no service unit. */
  NOT_INSTALLED: 4,
  /** This install can't update itself; the right command was printed. */
  CANNOT_UPDATE: 5,
  /** The update failed and was rolled back; the old version is running again. */
  ROLLED_BACK: 6,
  /** The update failed and couldn't be rolled back; a person is needed. */
  ROLLBACK_FAILED: 7,
  /** Busy: refused, and why was printed. Try later, or use `--force`. `EX_TEMPFAIL` from sysexits.h. */
  BUSY: 75,
} as const;

export type ExitCode = (typeof EXIT)[keyof typeof EXIT];

/** A tool may use 8 to 63 for its own commands (SPEC §2). */
export function isToolOwnCode(code: number): boolean {
  return Number.isInteger(code) && code >= 8 && code <= 63;
}

/** The SPEC's name for a shared code, for messages ("expected 4 (not installed), got 0 (ok)"). */
export function describeExitCode(code: number | null): string {
  if (code === null) return 'no exit code (killed by a signal)';
  const names: Record<number, string> = {
    0: 'ok',
    1: 'failed',
    2: 'usage',
    3: 'not running',
    4: 'not installed',
    5: "can't update itself",
    6: 'rolled back',
    7: "couldn't roll back",
    75: 'busy',
  };
  return names[code] ? `${code} (${names[code]})` : String(code);
}
