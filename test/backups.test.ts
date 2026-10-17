// Backups: snapshots only when something changed, blobs hard-linked, secrets left out, and pruning (with a fake
// clock) that keeps the newest 50 plus one a day for 30 days and can only remove snapshot directories.
import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { assertPrunable, KEEP_RECENT, listSnapshots, pruneSnapshots, snapshotName, snapshotNow, snapshotsToKeep, takeSnapshot } from '../server/store/backups.ts';
import { storeHome, type StoreHome } from './store-fixture.ts';

let h: StoreHome;
afterEach(() => h?.cleanup());

const PNG = Buffer.from('89504e470d0a1a0a0000000d494844520000000100000001080600000000000000', 'hex');

test('a snapshot copies the editable files, hard-links blobs, skips secrets, and only when something changed', async () => {
  h = storeHome();
  const t = new Date('2026-10-17T09:00:00Z');
  assert.equal(takeSnapshot(h.home, t), null, 'nothing to back up yet');
  h.services.projects.create({ name: 'Apollo' });
  const img = await h.services.evidence.ingestBytes(PNG);
  h.put('secrets.yaml', 'githubToken: shh\n');
  h.put('cache/thumb.png', 'x');
  const name = takeSnapshot(h.home, t)!;
  assert.equal(name, '2026-10-17T09-00-00Z');
  const snap = path.join(h.home, 'backups', name);
  const blob = `evidence/${img.sha256.slice(0, 2)}/${img.sha256}.png`;
  assert.equal(fs.statSync(path.join(snap, blob)).ino, fs.statSync(path.join(h.home, blob)).ino, 'hard-linked');
  assert.ok(fs.existsSync(path.join(snap, `evidence/${img.sha256.slice(0, 2)}/${img.sha256}.yaml`)));
  assert.ok(!fs.existsSync(path.join(snap, 'secrets.yaml')));
  assert.ok(!fs.existsSync(path.join(snap, 'cache')));
  assert.equal(takeSnapshot(h.home, new Date('2026-10-17T10:00:00Z')), null, 'unchanged');
  h.services.projects.create({ name: 'Gemini' });
  assert.equal(takeSnapshot(h.home, t), '2026-10-17T09-00-00Z-2', 'same second: a suffix');
});

test('pruning keeps the newest 50 plus the first of each day for 30 days (fake clock)', () => {
  h = storeHome();
  const backups = path.join(h.home, 'backups');
  const names: string[] = [];
  const start = Date.parse('2026-08-01T00:00:00Z');
  for (let i = 0; i < 24 * 60; i += 6) names.push(snapshotName(new Date(start + i * 3600_000))); // every 6 h for 60 days
  for (const n of names) fs.mkdirSync(path.join(backups, n), { recursive: true });
  fs.mkdirSync(path.join(backups, 'removed'), { recursive: true });
  const now = new Date(start + 60 * 24 * 3600_000);
  const keep = snapshotsToKeep(names, now);
  const removed = pruneSnapshots(h.home, now);
  const left = listSnapshots(backups);
  assert.equal(left.length, keep.size);
  assert.equal(left.length + removed.length, names.length);
  assert.deepEqual(left.slice(-KEEP_RECENT), names.slice(-KEEP_RECENT));
  const days = new Set(left.map((n) => n.slice(0, 10)));
  assert.ok(days.has('2026-09-01') && !days.has('2026-08-15'), 'daily ones within 30 days only');
  assert.ok(fs.existsSync(path.join(backups, 'removed')), 'removed/ is never pruned');
  assert.deepEqual(pruneSnapshots(h.home, now), [], 'idempotent');
});

test('assertPrunable refuses anything but a snapshot directory in the data home\'s backups/', () => {
  h = storeHome();
  const backups = path.join(h.home, 'backups');
  fs.mkdirSync(path.join(backups, '2026-10-17T09-00-00Z'), { recursive: true });
  fs.mkdirSync(path.join(backups, 'removed'));
  assert.ok(assertPrunable(h.home, backups, '2026-10-17T09-00-00Z'));
  assert.throws(() => assertPrunable(h.home, backups, 'removed'), /not a snapshot name/);
  assert.throws(() => assertPrunable(h.home, backups, '../2026-10-17T09-00-00Z'), /not a snapshot name/);
  assert.throws(() => assertPrunable(h.home, path.join(h.home, 'projects'), '2026-10-17T09-00-00Z'), /not the data home's backups/);
  const elsewhere = path.join(h.home, '..', 'elsewhere');
  fs.mkdirSync(path.join(elsewhere, '2026-10-16T09-00-00Z'), { recursive: true });
  fs.symlinkSync(path.join(elsewhere, '2026-10-16T09-00-00Z'), path.join(backups, '2026-10-16T09-00-00Z'));
  assert.throws(() => assertPrunable(h.home, backups, '2026-10-16T09-00-00Z'), /not a directory/);
});

test('snapshotNow never throws', () => {
  h = storeHome();
  h.put('profile.yaml', 'name: Alex\n');
  h.put('backups', 'a file where the directory should be');
  const err = process.stderr.write;
  process.stderr.write = () => true;
  try {
    assert.equal(snapshotNow(h.home), null);
  } finally {
    process.stderr.write = err;
  }
});
