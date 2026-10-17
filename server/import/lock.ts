// One import at a time per data home (SPEC R12): `cache/import.lock` holds the pid of whoever is importing. The CLI
// takes it when it writes to the store itself (no server running), and the server takes it for POST /api/import/apply,
// so a second import, from either, waits its turn instead of racing the first one's duplicate checks. A lock left by a
// process that has died, or older than an hour, is taken over.
import fs from 'node:fs';
import path from 'node:path';
import { ExistsError, atomicWrite } from '../atomic.js';

/** Someone else is importing into this data home right now. */
export class ImportRunning extends Error {}

const lockFile = (dataDir: string) => path.join(dataDir, 'cache', 'import.lock');

function holder(file: string): { pid: number; startedAt: number } | null {
  try {
    const o = JSON.parse(fs.readFileSync(file, 'utf8')) as { pid?: unknown; startedAt?: unknown };
    const startedAt = typeof o.startedAt === 'string' ? Date.parse(o.startedAt) : NaN;
    return Number.isInteger(o.pid) ? { pid: o.pid as number, startedAt: Number.isNaN(startedAt) ? 0 : startedAt } : null;
  } catch {
    return null;
  }
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/** A lock older than this is left over from a crash, whoever's pid it names (pids are reused, by Docker every start). */
const STALE_MS = 60 * 60 * 1000;
/** Whether this process is importing right now (its own lock file can't say: a restarted container reuses the pid). */
let ours = false;

/** Take the lock, or throw ImportRunning. Returns the function that releases it. */
export function takeImportLock(dataDir: string, now = new Date()): () => void {
  const file = lockFile(dataDir);
  if (ours) throw new ImportRunning('another import is still running here; try again when it has finished');
  const text = JSON.stringify({ pid: process.pid, startedAt: now.toISOString() }) + '\n';
  try {
    atomicWrite(file, text, { createOnly: true });
  } catch (e) {
    if (!(e instanceof ExistsError)) throw e;
    const h = holder(file);
    const fresh = h !== null && now.getTime() - h.startedAt < STALE_MS;
    // our own pid without our flag is a previous life of this pid (a crash, then a restart): stale
    if (h && fresh && h.pid !== process.pid && alive(h.pid))
      throw new ImportRunning(`another import into this data home is still running (process ${h.pid}); try again when it has finished. If nothing is importing, remove ${file}`);
    atomicWrite(file, text); // left behind by a process that has gone: take it over
  }
  ours = true;
  return () => {
    ours = false;
    // only ever our own lock: one taken over from us (we'd have to have been stuck an hour) isn't ours to remove
    if (holder(file)?.pid === process.pid) fs.unlinkSync(file);
  };
}
