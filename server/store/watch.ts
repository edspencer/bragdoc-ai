// The watcher (SPEC R2): hand edits, `git pull` and agents editing files show up live. chokidar on the data home
// (adapted from Local Review's events.ts), skipping what isn't ours to index: cache/, backups/, logs/, imports/,
// service/, legacy-cli/, dot-directories and temp files. Each path's events are debounced, then the store re-reads it;
// the store announces real changes to its subscribers (Store.subscribe), and our own writes find nothing new, so they
// don't echo.
// This module knows nothing about SSE: PR7 forwards the store's changes to the event stream.
import fs from 'node:fs';
import path from 'node:path';
import { watch, type FSWatcher } from 'chokidar';
import type { Store } from './index.js';
import { isTempName } from './safefs.js';

/** Top-level directories the watcher never looks in. */
const IGNORED_TOP = new Set(['cache', 'backups', 'logs', 'imports', 'legacy-cli', 'service', 'node_modules']);

export interface StoreWatcher {
  /** Resolves once the initial scan is done and changes are being picked up. */
  ready: Promise<void>;
  close(): Promise<void>;
}

export interface WatchOptions {
  /** Quiet time per path before re-reading it (default 50 ms: an editor's save is often several events). */
  debounceMs?: number;
  /** Where errors go (default stderr). */
  onError?: (err: unknown) => void;
}

export function watchStore(store: Store, { debounceMs = 50, onError = (e) => process.stderr.write(`bragdoc: [watch] ${(e as Error).message ?? e}\n`) }: WatchOptions = {}): StoreWatcher {
  const home = path.resolve(store.home);
  try {
    fs.mkdirSync(home, { recursive: true }); // chokidar can't watch a directory that isn't there yet
  } catch (e) {
    // a data home we can't create (a read-only location): serve what loaded, without live updates, rather than fail
    onError(new Error(`not watching ${home} for changes: ${(e as Error).message}`));
    return { ready: Promise.resolve(), close: async () => {} };
  }
  const ignored = (p: string) => {
    const rel = path.relative(home, p);
    if (!rel || rel.startsWith('..')) return false;
    const parts = rel.split(path.sep);
    if (IGNORED_TOP.has(parts[0])) return true;
    return parts.some((s) => s.startsWith('.') || isTempName(s));
  };
  const timers = new Map<string, NodeJS.Timeout>();
  const soon = (p: string, dir: boolean) => {
    clearTimeout(timers.get(p));
    timers.set(
      p,
      setTimeout(() => {
        timers.delete(p);
        try {
          store.reloadPath(p, { dir });
        } catch (e) {
          onError(e);
        }
      }, debounceMs),
    );
  };
  // depth 4 reaches achievements/YYYY/MM/<id>.md; awaitWriteFinish isn't needed because our writes (and most
  // editors') are atomic renames, and a half-written hand save just re-reads a moment later
  const w: FSWatcher = watch(home, { ignoreInitial: true, depth: 4, ignored, awaitWriteFinish: false })
    .on('add', (p) => soon(p, false))
    .on('change', (p) => soon(p, false))
    .on('unlink', (p) => soon(p, false))
    .on('addDir', (p) => soon(p, true))
    .on('unlinkDir', (p) => soon(p, true))
    .on('error', onError);
  const ready = new Promise<void>((resolve) => w.once('ready', () => resolve()));
  return {
    ready,
    async close() {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
      await w.close();
    },
  };
}
