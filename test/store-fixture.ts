// Store helpers for tests: a throwaway data home with a store and services on it, a fake clock, and a way to write a
// file the way a person (or another tool) would, behind the store's back.
import fs from 'node:fs';
import path from 'node:path';
import { createServices, type Services } from '../server/services/index.ts';
import { Store } from '../server/store/index.ts';
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
