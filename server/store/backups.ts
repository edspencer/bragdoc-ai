// Automatic snapshots of everything you'd miss (SPEC R2; adapted from Local Review's backups.ts, via Hallway's): a
// plain copy into backups/<timestamp>/ with the same layout, so restoring is copying files back. Taken when the server
// starts and hourly while it runs, each only if something changed since the newest snapshot. Pruning keeps the newest
// KEEP_RECENT snapshots plus the first of each UTC day for KEEP_DAYS days, and can only ever remove directories
// directly inside backups/ whose names are snapshot timestamps (assertPrunable). Files the app removes go to
// backups/removed/ (safefs.ts), which isn't a snapshot name, so it's never pruned.
//
// Evidence files (evidence/<aa>/<sha256>.<ext>) are hard-linked into a snapshot rather than copied: they're named by
// their content and never rewritten, so every snapshot shares the one copy on disk. Where linking fails (another file
// system), they're copied.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { isTempName } from './safefs.js';

export const KEEP_RECENT = 50;
export const KEEP_DAYS = 30;
export const INTERVAL_MS = 60 * 60 * 1000;

/** What a snapshot holds, relative to the data home. Not secrets.yaml (a token), runtime.json, logs/ or cache/. */
export const EDITABLE = ['config.yaml', 'profile.yaml', 'companies', 'projects', 'repos', 'achievements', 'found', 'evidence', 'imports', 'ai'];

/** `2026-10-09T08-45-12Z` (ISO 8601 UTC, ':' → '-' so it's a valid file name everywhere), maybe `-2`, `-3`… */
export const SNAPSHOT_NAME = /^(\d{4}-\d{2}-\d{2})T\d{2}-\d{2}-\d{2}Z(?:-\d{1,3})?$/;

export function snapshotName(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/:/g, '-');
}

/** A stored evidence file (not its .yaml sidecar): `evidence/<aa>/<sha256>.<ext>`. */
const isBlob = (rel: string) => /^evidence\/[0-9a-f]{2}\/[0-9a-f]{64}\.(?!yaml$)[a-z0-9]+$/.test(rel);

/** Every editable file under `root` (a data home or a snapshot), as sorted `/` paths. Symlinks are skipped. */
function editableFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (rel: string) => {
    let st: fs.Stats;
    try {
      st = fs.lstatSync(path.join(root, rel));
    } catch {
      return;
    }
    if (st.isFile()) out.push(rel);
    else if (st.isDirectory())
      for (const name of fs.readdirSync(path.join(root, rel)).sort()) if (!isTempName(name) && !name.startsWith('.')) walk(`${rel}/${name}`);
  };
  for (const e of EDITABLE) walk(e);
  return out;
}

/** A hash of every editable file's path and contents (a blob's name and size stand for its bytes); null when none. */
export function fingerprint(root: string): string | null {
  const files = editableFiles(root);
  if (!files.length) return null;
  const h = crypto.createHash('sha256');
  for (const rel of files) {
    const p = path.join(root, rel);
    if (isBlob(rel)) h.update(`${rel}\0${fs.statSync(p).size}\0`);
    else h.update(`${rel}\0`).update(fs.readFileSync(p)).update('\0');
  }
  return h.digest('hex');
}

/** Snapshot directory names, oldest first. */
export function listSnapshots(backupsDir: string): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(backupsDir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isDirectory() && SNAPSHOT_NAME.test(e.name))
    .map((e) => e.name)
    .sort(compareNames);
}

const splitName = (n: string): [string, number] => {
  const m = /^(.*Z)(?:-(\d+))?$/.exec(n)!;
  return [m[1], m[2] ? Number(m[2]) : 1];
};
function compareNames(a: string, b: string) {
  const [ta, na] = splitName(a);
  const [tb, nb] = splitName(b);
  return ta < tb ? -1 : ta > tb ? 1 : na - nb;
}

/**
 * Copy the editable files to `backups/<timestamp>/` unless there are none or they match the newest snapshot. Built
 * under a dot-name and renamed into place, so a snapshot directory is always complete. Returns its name, or null.
 */
export function takeSnapshot(home: string, now = new Date()): string | null {
  const backupsDir = path.join(home, 'backups');
  const fp = fingerprint(home);
  if (!fp) return null;
  const existing = listSnapshots(backupsDir);
  const newest = existing[existing.length - 1];
  if (newest && fingerprint(path.join(backupsDir, newest)) === fp) return null;
  fs.mkdirSync(backupsDir, { recursive: true });
  const base = snapshotName(now);
  let name = base;
  for (let n = 2; fs.existsSync(path.join(backupsDir, name)); n++) name = `${base}-${n}`;
  const partial = path.join(backupsDir, `.partial-${name}-${process.pid}`);
  for (const rel of editableFiles(home)) {
    const src = path.join(home, rel);
    const dst = path.join(partial, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    if (isBlob(rel) && linked(src, dst)) continue;
    fs.copyFileSync(src, dst, fs.constants.COPYFILE_EXCL); // EXCL: never over anything (the dir is brand new anyway)
  }
  const dest = path.join(backupsDir, name);
  if (fs.existsSync(dest)) throw new Error(`${dest} appeared while snapshotting; leaving the copy at ${partial}`);
  fs.renameSync(partial, dest); // a fresh dot-dir onto a name we just checked is free
  return name;
}

/** Hard-link a blob into the snapshot being made; false (so it's copied instead) if that isn't possible. */
function linked(src: string, dst: string): boolean {
  try {
    fs.linkSync(src, dst); // fails rather than replace anything
    return true;
  } catch {
    return false;
  }
}

/** Which snapshots to keep: the newest KEEP_RECENT, plus the first of each UTC day in the last KEEP_DAYS days. */
export function snapshotsToKeep(names: string[], now = new Date()): Set<string> {
  const sorted = [...names].sort(compareNames);
  const keep = new Set(sorted.slice(-KEEP_RECENT));
  const cutoff = new Date(now.getTime() - KEEP_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const seenDays = new Set<string>();
  for (const n of sorted) {
    const day = SNAPSHOT_NAME.exec(n)![1];
    if (seenDays.has(day)) continue;
    seenDays.add(day);
    if (day >= cutoff) keep.add(n);
  }
  return keep;
}

/**
 * Throws unless `backupsDir/name` is something pruning may remove: `name` is a bare snapshot timestamp, and the target
 * is a real directory (not a symlink) directly inside `backupsDir`, which is the data home's `backups/` directory.
 */
export function assertPrunable(home: string, backupsDir: string, name: string): string {
  if (typeof name !== 'string' || !SNAPSHOT_NAME.test(name) || name !== path.basename(name) || name.includes('/') || name.includes('\\'))
    throw new Error(`refusing to prune ${JSON.stringify(name)}: not a snapshot name`);
  const root = path.resolve(backupsDir);
  if (root !== path.join(path.resolve(home), 'backups')) throw new Error(`refusing to prune in ${root}: not the data home's backups/`);
  const target = path.join(root, name);
  if (path.dirname(target) !== root) throw new Error(`refusing to prune ${target}: not directly inside ${root}`);
  const st = fs.lstatSync(target);
  if (!st.isDirectory() || st.isSymbolicLink()) throw new Error(`refusing to prune ${target}: not a directory`);
  // the real path too, in case backups/ itself is a symlink somewhere else
  const realRoot = fs.realpathSync(root);
  if (realRoot !== path.join(fs.realpathSync(home), 'backups')) throw new Error(`refusing to prune in ${realRoot}: backups/ points outside the data home`);
  if (path.dirname(fs.realpathSync(target)) !== realRoot) throw new Error(`refusing to prune ${target}: resolves outside ${realRoot}`);
  return target;
}

/** Remove the snapshots `snapshotsToKeep` doesn't keep. Never the newest. Returns the removed names. */
export function pruneSnapshots(home: string, now = new Date()): string[] {
  const backupsDir = path.join(home, 'backups');
  const names = listSnapshots(backupsDir);
  const keep = snapshotsToKeep(names, now);
  const newest = names[names.length - 1];
  const removed: string[] = [];
  for (const n of names) {
    if (keep.has(n) || n === newest) continue;
    const target = assertPrunable(home, backupsDir, n);
    fs.rmSync(target, { recursive: true });
    removed.push(n);
  }
  return removed;
}

/** Snapshot (if changed) and prune. Never throws: a failed snapshot must not take the server down. */
export function snapshotNow(home: string, now = new Date(), log: (s: string) => void = () => {}): string | null {
  try {
    const name = takeSnapshot(home, now);
    if (name) log(`[backups] snapshot backups/${name}`);
    const removed = pruneSnapshots(home, now);
    if (removed.length) log(`[backups] pruned ${removed.length} old snapshot(s)`);
    return name;
  } catch (e) {
    process.stderr.write(`bragdoc: [backups] snapshot failed: ${(e as Error).message}\n`);
    return null;
  }
}

/** On start, then hourly. Returns a function that stops the timer. */
export function startSnapshots(home: string, { now = () => new Date(), log }: { now?: () => Date; log?: (s: string) => void } = {}): () => void {
  snapshotNow(home, now(), log);
  const t = setInterval(() => snapshotNow(home, now(), log), INTERVAL_MS);
  t.unref();
  return () => clearInterval(t);
}
