// One import at a time per data home (SPEC R12): `cache/import.lock` holds the pid of whoever is importing. The CLI
// takes it when it writes to the store itself (no server running), and the server takes it for POST /api/import/apply,
// so a second import, from either, waits its turn instead of racing the first one's duplicate checks. A lock left by a
// process that has died is taken over.
import fs from 'node:fs';
import path from 'node:path';
import { ExistsError, atomicWrite } from '../atomic.js';

/** Someone else is importing into this data home right now. */
export class ImportRunning extends Error {}

const lockFile = (dataDir: string) => path.join(dataDir, 'cache', 'import.lock');

function holder(file: string): number | null {
  try {
    const pid = (JSON.parse(fs.readFileSync(file, 'utf8')) as { pid?: unknown }).pid;
    return Number.isInteger(pid) ? (pid as number) : null;
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

/** Take the lock, or throw ImportRunning. Returns the function that releases it. */
export function takeImportLock(dataDir: string, now = new Date()): () => void {
  const file = lockFile(dataDir);
  const text = JSON.stringify({ pid: process.pid, startedAt: now.toISOString() }) + '\n';
  try {
    atomicWrite(file, text, { createOnly: true });
  } catch (e) {
    if (!(e instanceof ExistsError)) throw e;
    const pid = holder(file);
    // our own pid is another import in this same server, still running
    if (pid !== null && (pid === process.pid || alive(pid))) throw new ImportRunning(`another import into this data home is still running (process ${pid}); try again when it has finished`);
    atomicWrite(file, text); // left by a process that has gone: take it over
  }
  return () => {
    // only ever our own lock: one taken over from us (we'd have to have died) isn't ours to remove
    if (holder(file) === process.pid) fs.unlinkSync(file);
  };
}
