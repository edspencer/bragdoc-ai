// The one place the CLI starts other programs: launchctl / systemctl for `bragdoc service`, journalctl for `service
// logs` on Linux, and open / xdg-open for `--open`. Everything else takes a Runner (or a Streamer) as a parameter, so
// the service lifecycle is tested with both mocked, on every OS, and nothing in a test can reach the real service
// manager.
//
// D9: subprocesses go through server/proc.ts (PR2: execFile, no shell, an allow-listed binary, timeouts, output caps).
// Until it lands this file is the stand-in, with the same shape; on rebase `defaultRunner` becomes a call to proc.ts's
// run(), and `defaultStreamer` its streaming counterpart. Nothing outside this file imports node:child_process.
import { execFile, spawn } from 'node:child_process';

export interface RunResult {
  /** The exit status; 127 when the program isn't installed. */
  code: number;
  stdout: string;
  stderr: string;
}

/** Runs a command and resolves with its exit code and output (never rejects for a non-zero exit). */
export type Runner = (cmd: string, args: string[]) => Promise<RunResult>;

/** Runs a command with this terminal as its stdin/stdout/stderr, until it exits (`journalctl -f`); resolves with its
 * exit code, or 127 when the program isn't installed. */
export type Streamer = (cmd: string, args: string[]) => Promise<number>;

export const defaultRunner: Runner = (cmd, args) =>
  new Promise((resolve) => {
    execFile(cmd, args, { timeout: 30_000, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      const e = err as (NodeJS.ErrnoException & { code?: number | string }) | null;
      if (e && e.code === 'ENOENT') resolve({ code: 127, stdout: '', stderr: `${cmd}: command not found` });
      else resolve({ code: e ? (typeof e.code === 'number' ? e.code : 1) : 0, stdout: String(stdout), stderr: String(stderr) });
    });
  });

export const defaultStreamer: Streamer = (cmd, args) =>
  new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: 'inherit' });
    // a terminal's Ctrl-C reaches the whole process group, but a SIGTERM or SIGHUP sent to `bragdoc` alone (an agent's
    // timeout, a closed ssh session) would otherwise leave `journalctl -f` running on its own, holding our stdout open
    const forward = (sig: NodeJS.Signals) => child.kill(sig);
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];
    for (const s of signals) process.on(s, forward);
    const done = (code: number) => {
      for (const s of signals) process.off(s, forward);
      resolve(code);
    };
    child.once('error', (e: NodeJS.ErrnoException) => done(e.code === 'ENOENT' ? 127 : 1));
    child.once('exit', (code, signal) => done(code ?? (signal ? 0 : 1)));
  });

/** Start a program and don't wait for it (the browser for `--open`). Resolves false if it couldn't be started. */
export function launch(cmd: string, args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.once('error', () => resolve(false));
    child.once('spawn', () => {
      child.unref();
      resolve(true);
    });
  });
}
