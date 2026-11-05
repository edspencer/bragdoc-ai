// From edspencer/cli-contract reference/lock.ts @ 1.0; local changes: `isPidAlive` comes from BragDoc's
// server/runtime.ts (its runtime.json isn't the reference's).
//
// `<home>/update.lock`: one update at a time (SPEC §5 step 1). Two at once is easy to cause (an Ansible run and a
// person at a terminal) and bad: the second stops the service the first just started, or installs an older target
// over a newer one, and the loser's rollback "restores" a version nobody asked for.
//
// So the lock is an `O_EXCL` create holding the pid. A live holder refuses with exit 1; a dead one (a crashed or
// killed update) is stale and is removed, or the install could never update itself again. Node built-ins only.

import fs from 'node:fs';
import path from 'node:path';
import { isPidAlive } from '../runtime.js';

export const LOCK_FILE = 'update.lock';

export function lockPath(home: string): string {
  return path.join(home, LOCK_FILE);
}

export interface LockBody {
  pid: number;
  startedAt: string;
  /** What holds it, for the message: `paddock update --to 0.81.0`. */
  command?: string;
}

export interface Lock {
  path: string;
  /** Removes the file if it's still ours. Safe to call twice. */
  release(): void;
}

/** Another live process holds the lock. */
export class LockHeldError extends Error {
  override name = 'LockHeldError';
  readonly holder: LockBody;
  readonly path: string;
  constructor(file: string, holder: LockBody) {
    super(`another update is already running (pid ${holder.pid}, started ${holder.startedAt}). If that's wrong, remove ${file} and try again.`);
    this.holder = holder;
    this.path = file;
  }
}

export interface AcquireOptions {
  home: string;
  pid?: number;
  command?: string;
  isAlive?: (pid: number) => boolean;
  now?: () => Date;
}

/**
 * Takes the lock, or throws `LockHeldError`. After removing a stale lock it tries once more, and only once: a second
 * `EEXIST` means another process won the same race just now, which is a real holder.
 */
export function acquireLock(o: AcquireOptions): Lock {
  const file = lockPath(o.home);
  const pid = o.pid ?? process.pid;
  const isAlive = o.isAlive ?? isPidAlive;
  const body: LockBody = {
    pid,
    startedAt: (o.now ?? (() => new Date()))().toISOString(),
    ...(o.command !== undefined ? { command: o.command } : {}),
  };
  fs.mkdirSync(o.home, { recursive: true });
  for (let attempt = 0; ; attempt++) {
    try {
      // 'wx' is O_CREAT | O_EXCL: the create is the lock, in one call.
      fs.writeFileSync(file, `${JSON.stringify(body, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
      return { path: file, release: () => releaseLock(file, pid) };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
      const holder = readLock(file);
      // A lock with no readable pid counts as stale: nobody can show a process holds it.
      if ((holder !== null && holder.pid !== pid && isAlive(holder.pid)) || attempt > 0) {
        throw new LockHeldError(file, holder ?? { pid: 0, startedAt: 'unknown' });
      }
      fs.rmSync(file, { force: true });
    }
  }
}

export function readLock(file: string): LockBody | null {
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<LockBody>;
    if (Number.isInteger(raw.pid) && typeof raw.startedAt === 'string') return raw as LockBody;
  } catch {
    // missing, half-written, or not a lock
  }
  return null;
}

/** Removes the lock only if it names `pid`, or names nothing: never somebody else's. */
export function releaseLock(file: string, pid: number): void {
  const holder = readLock(file);
  if (holder === null || holder.pid === pid) fs.rmSync(file, { force: true });
}
