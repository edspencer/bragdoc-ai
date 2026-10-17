// The only places BragDoc writes, renames or removes files in the data home (D5; adapted from Hallway's and Local
// Review's safefs.ts). test/guard-fs.test.ts enforces that no other server file calls a deleting or overwriting fs
// function, with exact counts per file. The rules:
//  - every write is atomic: a fresh temp file in the same directory, renamed over the target. Temp names contain
//    `.tmp`, which the watcher and backups ignore, so a half-written file is never read;
//  - nothing is deleted: "remove" moves a file into backups/removed/ (moveToRemoved), and a rename never replaces an
//    existing file (renameNoClobber), except atomicWrite replacing the file it updates;
//  - the only unlinks are our own temp file after a failed write, and the old name of a file that has just been
//    hard-linked to its new name (so the data is still there, under the new name).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/** Our temp files: `.<name>.tmp-<pid>-<random>`. */
const TEMP_NAME = /^\..+\.tmp-\d+-[0-9a-f]{8}$/;
/** Anything the watcher and backups should skip: our temp files, and other tools' (`*.tmp`, `foo.yaml.tmp.123`). */
export const isTempName = (name: string) => name.includes('.tmp') || name.endsWith('~') || name.startsWith('.#');

export class ExistsError extends Error {
  code = 'EEXIST';
}

export interface WriteOptions {
  /** Never replace an existing file (throws ExistsError), even one that appears while writing. */
  createOnly?: boolean;
  /** File mode for a new file, e.g. 0o600 for secrets. */
  mode?: number;
}

/** Write `data` to `file` atomically: a temp file in the same directory, then rename. */
export function atomicWrite(file: string, data: string | Uint8Array, { createOnly = false, mode }: WriteOptions = {}): void {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(file)}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`);
  try {
    // 'wx': never over an existing file (a string is written as UTF-8; bytes ignore the encoding)
    fs.writeFileSync(tmp, data, { encoding: 'utf8', flag: 'wx', ...(mode === undefined ? {} : { mode }) });
    if (!createOnly && fs.existsSync(file)) fs.renameSync(tmp, file); // the update itself: replaces the previous version
    else renameNoClobber(tmp, file); // creating: fails rather than replace a file that appeared meanwhile
  } catch (e) {
    removeOwnTemp(tmp);
    throw e;
  }
}

/** Clean up a temp file written by atomicWrite whose rename failed. Refuses anything that isn't one. */
function removeOwnTemp(tmp: string) {
  if (!TEMP_NAME.test(path.basename(tmp))) return;
  try {
    fs.unlinkSync(tmp);
  } catch {
    /* already gone */
  }
}

/**
 * Rename `from` to `to`, failing with ExistsError if `to` exists (fs.rename would silently replace it). Done as a hard
 * link (atomic, and fails if `to` exists), then dropping the old name once both names are the same file.
 */
export function renameNoClobber(from: string, to: string): void {
  try {
    fs.linkSync(from, to);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === 'EEXIST') throw new ExistsError(`${to} already exists; not replacing it`);
    if (code !== 'EPERM' && code !== 'ENOTSUP' && code !== 'EOPNOTSUPP' && code !== 'ENOSYS' && code !== 'EXDEV') throw e;
    // a file system without hard links (or a directory): check, then rename. Only racy against something creating
    // exactly this name in the same instant
    if (fs.existsSync(to)) throw new ExistsError(`${to} already exists; not replacing it`);
    fs.renameSync(from, to);
    return;
  }
  const a = fs.statSync(from);
  const b = fs.statSync(to);
  if (a.ino !== b.ino || a.dev !== b.dev) return; // should not happen; keep both names rather than risk anything
  fs.unlinkSync(from); // drop the old name of a file that is now also linked at `to`
}

/**
 * Move `file` (somewhere under `home`) into `backups/removed/<stamp>/<the same relative path>`, never replacing
 * anything. Returns the new path. This is what "delete" means for every file in the data home.
 */
export function moveToRemoved(home: string, file: string, stamp: string): string {
  const rel = path.relative(home, file);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error(`${file} is not in the data home`);
  for (let n = 1; n < 1000; n++) {
    const dest = path.join(home, 'backups', 'removed', n === 1 ? stamp : `${stamp}-${n}`, rel);
    if (fs.existsSync(dest)) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    try {
      renameNoClobber(file, dest);
      return dest;
    } catch (e) {
      if (!(e instanceof ExistsError)) throw e;
    }
  }
  throw new Error(`no free name in backups/removed for ${rel}`);
}

/**
 * The newest removed copy of an entity in backups/removed/, or null: `rel` is its path relative to the data home, or a
 * function that finds it inside one removal's directory (an achievement may have lived in any month's folder).
 * Restoring is `renameNoClobber(from, original)`, which refuses if something has taken the original name since.
 */
export function findRemoved(home: string, rel: string | ((removalDir: string) => string | null)): { from: string; rel: string } | null {
  const dir = path.join(home, 'backups', 'removed');
  let stamps: string[];
  try {
    stamps = fs.readdirSync(dir);
  } catch {
    return null;
  }
  // newest first; `<stamp>-10` is newer than `<stamp>-9`
  stamps.sort((a, b) => b.localeCompare(a, 'en', { numeric: true }));
  for (const s of stamps) {
    const r = typeof rel === 'string' ? rel : rel(path.join(dir, s));
    if (r && fs.existsSync(path.join(dir, s, r))) return { from: path.join(dir, s, r), rel: r };
  }
  return null;
}
