// The watcher: an edit on disk reaches the index (and subscribers) within 500 ms; one of our own writes is exactly one
// event (no echo); breaking a file is announced; ignored directories stay quiet.
import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { StoreChange } from '../shared/schema/index.ts';
import { ulid } from '../shared/ulid.ts';
import { relPathFor } from '../server/store/files.ts';
import { watchStore, type StoreWatcher } from '../server/store/watch.ts';
import { liveWatcher, storeHome, type StoreHome } from './store-fixture.ts';

let h: StoreHome;
let w: StoreWatcher | undefined;
afterEach(async () => {
  await w?.close();
  w = undefined;
  h?.cleanup();
});

// 10 s, not 2: it returns as soon as cond holds, and macOS's FSEvents on a busy CI runner was sometimes slower than 2 s
const until = async (cond: () => boolean, ms = 10_000) => {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > ms) throw new Error('timed out');
    await new Promise((r) => setTimeout(r, 10));
  }
  return Date.now() - start;
};

async function watching() {
  h = storeHome();
  const events: StoreChange[] = [];
  h.store.subscribe((c) => events.push(c));
  // a watcher that's provably live first (macOS FSEvents, D84); its primer's own events don't count
  w = await liveWatcher(h);
  events.length = 0;
  return events;
}

test('a hand edit shows up in the index within 500 ms', async () => {
  const events = await watching();
  const { achievement } = h.services.achievements.create({ title: 'Before' });
  const rel = relPathFor('achievement', achievement.id);
  await new Promise((r) => setTimeout(r, 150)); // let the watcher see (and ignore) our own write
  events.length = 0;
  const t0 = Date.now();
  fs.writeFileSync(path.join(h.home, rel), h.read(rel).replace('title: Before', 'title: Edited by hand'));
  await until(() => h.store.get('achievement', achievement.id)?.title === 'Edited by hand');
  assert.ok(Date.now() - t0 < 500, `took ${Date.now() - t0} ms`);
  assert.deepEqual(events, [{ entity: 'achievement', id: achievement.id, op: 'upsert' }]);
});

test('one self-write is exactly one event', async () => {
  const events = await watching();
  const p = h.services.projects.create({ name: 'Apollo' });
  h.services.projects.update(p.id, { name: 'Apollo 2' });
  await new Promise((r) => setTimeout(r, 400));
  assert.deepEqual(events, [
    { entity: 'project', id: p.id, op: 'upsert' },
    { entity: 'project', id: p.id, op: 'upsert' },
  ]);
});

test('new files, broken files and removed directories are picked up', async () => {
  const events = await watching();
  const id = ulid();
  const rel = relPathFor('achievement', id);
  const text = `---\nid: ${id}\ntitle: Agent wrote this\nhappenedAt: 2026-10-17\ncreatedAt: 2026-10-17T09:00:00Z\nupdatedAt: 2026-10-17T09:00:00Z\n---\n`;
  h.put(rel, text); // a brand-new month directory, as an agent would create it
  await until(() => !!h.store.get('achievement', id));
  fs.writeFileSync(path.join(h.home, rel), '---\ntitle: [broken\n---\n');
  await until(() => events.some((e) => e.problem));
  assert.equal(h.store.get('achievement', id)!.title, 'Agent wrote this', 'last good value kept');
  assert.equal(h.store.problems()[0].code, 'syntax');
  fs.rmSync(path.join(h.home, 'achievements'), { recursive: true });
  await until(() => !h.store.entry('achievement', id));
  assert.equal(events.at(-1)!.op, 'remove');
});

test('cache/, backups/, logs/ and temp files are ignored', async () => {
  const events = await watching();
  h.put('cache/x.yaml', 'a: 1');
  h.put('backups/2026-10-17T09-00-00Z/projects/x.yaml', 'a: 1');
  h.put('logs/network.jsonl', '{}\n');
  h.put(`projects/.${ulid()}.yaml.tmp-1-abcdef12`, 'name: x');
  await new Promise((r) => setTimeout(r, 300));
  assert.deepEqual(events, []);
  assert.deepEqual(h.store.problems(), []);
});

test('a data home that cannot be created means no watching, not a crash', async () => {
  h = storeHome();
  const blocker = h.put('file-not-dir', 'x');
  const errors: unknown[] = [];
  const { Store } = await import('../server/store/index.ts');
  w = watchStore(new Store(path.join(blocker, 'home')).load(), { onError: (e) => errors.push(e) });
  await w.ready;
  assert.match(String(errors[0]), /not watching/);
});
