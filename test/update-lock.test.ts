// From edspencer/cli-contract test/lock.test.ts @ 0.2; local changes: imports from server/update/ and the published runner's
// schema validator. The tests of the reference code BragDoc copied (D88).
//
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { acquireLock, lockPath, LockHeldError, readLock, releaseLock } from '../server/update/lock.ts';
import { tempDir } from './update-helpers.ts';

test('creates the lock holding the pid, 0600, and releases it', () => {
  const home = tempDir();
  const lock = acquireLock({ home, command: 'tool update', now: () => new Date('2026-11-05T00:00:00Z') });
  assert.deepEqual(readLock(lockPath(home)), { pid: process.pid, startedAt: '2026-11-05T00:00:00.000Z', command: 'tool update' });
  if (process.platform !== 'win32') assert.equal(fs.statSync(lock.path).mode & 0o777, 0o600);
  lock.release();
  lock.release();
  assert.equal(fs.existsSync(lockPath(home)), false);
});

test('refuses while a live process holds it, and says who', () => {
  const home = tempDir();
  acquireLock({ home, pid: 4242 });
  assert.throws(
    () => acquireLock({ home, isAlive: (pid) => pid === 4242 }),
    (err: LockHeldError) => err instanceof LockHeldError && err.holder.pid === 4242 && /another update is already running \(pid 4242/.test(err.message),
  );
});

test('removes a stale lock and takes it', () => {
  const home = tempDir();
  acquireLock({ home, pid: 4242 });
  const lock = acquireLock({ home, isAlive: () => false });
  assert.equal(readLock(lock.path)?.pid, process.pid);
});

test('a lock that is not a lock counts as stale', () => {
  const home = tempDir();
  fs.writeFileSync(lockPath(home), 'half-written');
  assert.equal(readLock(lockPath(home)), null);
  assert.equal(readLock(acquireLock({ home }).path)?.pid, process.pid);
});

test('refuses when another process recreates it in the same moment', () => {
  const home = tempDir();
  const file = lockPath(home);
  fs.writeFileSync(file, JSON.stringify({ pid: 1, startedAt: 'then' }));
  // The holder is dead, so the lock is stale; but as it's removed, someone else takes it before our second create.
  const isAlive = () => false;
  const origRm = fs.rmSync;
  fs.rmSync = ((p: fs.PathLike, o?: fs.RmOptions) => {
    origRm(p, o);
    fs.writeFileSync(file, JSON.stringify({ pid: 2, startedAt: 'now' }));
  }) as typeof fs.rmSync;
  try {
    assert.throws(() => acquireLock({ home, isAlive }), LockHeldError);
  } finally {
    fs.rmSync = origRm;
  }
});

test("release never removes somebody else's lock", () => {
  const home = tempDir();
  fs.writeFileSync(lockPath(home), JSON.stringify({ pid: 99999, startedAt: 'x' }));
  releaseLock(lockPath(home), process.pid);
  assert.equal(fs.existsSync(lockPath(home)), true);
});
