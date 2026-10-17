// How the service commands start other programs: launchctl / systemctl for `bragdoc service`, and journalctl for
// `service logs` on Linux. Everything takes a Runner (or a Streamer) as a parameter, so the service lifecycle is tested
// with both mocked, on every OS, and nothing in a test can reach the real service manager.
//
// The defaults are server/proc.ts (D9, D32): an allow-listed binary, execFile with no shell, a timeout and an output
// cap. These adapters only turn proc's ProcError into the exit-code shape the service code reads: 127 for a program
// that isn't installed.
import { type AllowedBin, ProcError, run, runAttached } from '../proc.js';

export interface RunResult {
  /** The exit status; 127 when the program isn't installed. */
  code: number;
  stdout: string;
  stderr: string;
}

/** Runs a command and resolves with its exit code and output (never rejects for a non-zero exit). */
export type Runner = (cmd: AllowedBin, args: string[]) => Promise<RunResult>;

/** Runs a command with this terminal as its stdin/stdout/stderr, until it exits (`journalctl -f`); resolves with its
 * exit code, or 127 when the program isn't installed. */
export type Streamer = (cmd: AllowedBin, args: string[]) => Promise<number>;

export const defaultRunner: Runner = async (cmd, args) => {
  try {
    return await run(cmd, args);
  } catch (e) {
    if (e instanceof ProcError && e.code === 'not_found') return { code: 127, stdout: '', stderr: `${cmd}: command not found` };
    return { code: 1, stdout: '', stderr: (e as Error).message };
  }
};

/** proc.runAttached forwards SIGINT/SIGTERM/SIGHUP to the child, so stopping `bragdoc service logs` stops journalctl. */
export const defaultStreamer: Streamer = async (cmd, args) => {
  try {
    return await runAttached(cmd, args);
  } catch (e) {
    if (e instanceof ProcError && e.code === 'not_found') return 127;
    throw e;
  }
};
