// Store helpers for tests: a throwaway data home with a store and services on it, a fake clock, and a way to write a
// file the way a person (or another tool) would, behind the store's back.
import fs from 'node:fs';
import path from 'node:path';
import { createServices, type Services } from '../server/services/index.ts';
import { relPathFor } from '../server/store/files.ts';
import { Store } from '../server/store/index.ts';
import { watchStore, type StoreWatcher } from '../server/store/watch.ts';
import { rmTmp, tmpDir } from './fixture.ts';

export interface Clock {
  now: () => Date;
  /** Move the clock on (default one second). */
  tick: (ms?: number) => void;
  set: (iso: string) => void;
}

export function fakeClock(start = '2026-10-17T09:00:00Z'): Clock {
  let t = Date.parse(start);
  return { now: () => new Date(t), tick: (ms = 1000) => void (t += ms), set: (iso) => void (t = Date.parse(iso)) };
}

export interface StoreHome {
  home: string;
  store: Store;
  services: Services;
  clock: Clock;
  /** Write a file in the data home directly (a hand edit), creating directories. */
  put: (rel: string, text: string | Uint8Array) => string;
  read: (rel: string) => string;
  exists: (rel: string) => boolean;
  /** A fresh store on the same home (a restart). */
  reopen: () => Store;
  cleanup: () => void;
}

export function storeHome(): StoreHome {
  const home = path.join(tmpDir('bragdoc-store-'), '.bragdoc');
  fs.mkdirSync(home);
  const clock = fakeClock();
  const store = new Store(home, { now: clock.now }).load();
  return {
    home,
    store,
    services: createServices(store),
    clock,
    put: (rel, text) => {
      const p = path.join(home, rel);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, text);
      return p;
    },
    read: (rel) => fs.readFileSync(path.join(home, rel), 'utf8'),
    exists: (rel) => fs.existsSync(path.join(home, rel)),
    reopen: () => new Store(home, { now: clock.now }).load(),
    cleanup: () => rmTmp(path.dirname(home)),
  };
}

/** How a test proves a watcher is live: a hand edit (`write`, given the attempt number) and when the store has seen it. */
export interface Primer {
  write: (attempt: number) => void;
  seen: (attempt: number) => boolean;
}

/**
 * Start a watcher on `h` and prove it's live before a test asserts anything: write by hand (again each second) until
 * the store sees it. On macOS CI under the full suite's load, FSEvents could drop a new stream's first events, and now
 * and then a stream delivered nothing at all, even after chokidar's `ready` (PR30, D84: 4 of 12 full runs). So a
 * watcher that sees nothing for 5 s is closed and started again, at most 3 times. Only the start is retried: the edits
 * a test then asserts on get no retry. The default primer is an achievement of its own, edited by hand.
 */
export async function liveWatcher(h: StoreHome, primer?: Primer): Promise<StoreWatcher> {
  if (!primer) {
    const { achievement } = h.services.achievements.create({ title: 'Primer' });
    const rel = relPathFor('achievement', achievement.id);
    primer = {
      write: (i) => void h.put(rel, h.read(rel).replace(/^title: .*$/m, `title: Primer ${i}`)),
      seen: (i) => h.store.get('achievement', achievement.id)?.title === `Primer ${i}`,
    };
  }
  let attempt = 0;
  for (let start = 0; start < 3; start++) {
    const w = watchStore(h.store);
    await w.ready;
    for (let i = 0; i < 5; i++, attempt++) {
      primer.write(attempt);
      const until = Date.now() + 1000;
      while (Date.now() < until) {
        if (primer.seen(attempt)) return w;
        await new Promise((r) => setTimeout(r, 10));
      }
    }
    await w.close();
  }
  throw new Error('three watchers in a row never saw a hand edit');
}
