// From edspencer/cli-contract test/update-check.test.ts @ 0.2; local changes: imports from server/update/ and the published runner's
// schema validator. The tests of the reference code BragDoc copied (D88).
//
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadSchema, validate } from '@edspencer/cli-conformance/dist/src/schema.js';
import { readUpdateCheck, updateCheckPath, updateNotice, updateSummary, writeUpdateCheck, type UpdateCheck } from '../server/update/update-check.ts';
import { tempDir } from './update-helpers.ts';

const check = (over: Partial<UpdateCheck> = {}): UpdateCheck => ({
  name: '@s/tool',
  current: '1.0.0',
  target: '1.1.0',
  tag: 'latest',
  updateAvailable: true,
  installMethod: 'npm-global',
  canUpdate: true,
  command: 'tool update',
  engines: '>=22',
  nodeOk: true,
  changelog: 'https://example.test/releases/tag/v1.1.0',
  checkedAt: new Date().toISOString(),
  ...over,
});

test('round-trips, 0600, and is valid against the update-check schema', () => {
  const home = tempDir();
  writeUpdateCheck(home, check());
  assert.deepEqual(readUpdateCheck(home), check({ checkedAt: readUpdateCheck(home)!.checkedAt }));
  if (process.platform !== 'win32') assert.equal(fs.statSync(updateCheckPath(home)).mode & 0o777, 0o600);
  assert.deepEqual(validate(loadSchema('update-check'), readUpdateCheck(home)), []);
});

const notInstalled = { installed: false, running: false, answering: false, installedVersion: null, runningVersion: null, port: null, url: null, pid: null, unit: null, log: null, warnings: [] };

test("the summary `status` repeats: none when there's no cache, it's too old, or it's another version's", () => {
  const home = tempDir();
  assert.equal(updateSummary(home), undefined);
  const at = '2026-11-01T00:00:00.000Z';
  writeUpdateCheck(home, check({ checkedAt: at }));
  const now = Date.parse(at) + 60_000;
  assert.deepEqual(updateSummary(home, { now }), { latest: '1.1.0', updateAvailable: true, checkedAt: at });
  assert.deepEqual(validate(loadSchema('service-status'), { ...notInstalled, update: updateSummary(home, { now }) }), []);
  assert.equal(updateSummary(home, { now: Date.parse(at) + 8 * 86_400_000 }), undefined);
  assert.equal(updateSummary(home, { now, currentVersion: '1.1.0' }), undefined, 'checked from 1.0.0, now running 1.1.0');
  assert.ok(updateSummary(home, { now, currentVersion: '1.0.0' }));
});

test("ignores a cache that isn't one, and never throws writing one", () => {
  const home = tempDir();
  fs.writeFileSync(updateCheckPath(home), '{"name":1}');
  assert.equal(readUpdateCheck(home), null);
  fs.writeFileSync(updateCheckPath(home), 'nope');
  assert.equal(readUpdateCheck(home), null);
  // A home that's a file can't hold a cache.
  const file = updateCheckPath(home);
  assert.doesNotThrow(() => writeUpdateCheck(file, check()));
});

test("writes SPEC §3's notice", () => {
  assert.equal(
    updateNotice({ name: 'Paddock', current: '0.79.1', target: '0.80.0', command: 'paddock update', changelog: 'https://github.com/edspencer/paddock/releases/tag/v0.80.0' }),
    'Paddock 0.80.0 is available (you have 0.79.1).\n  Run: paddock update\n  Changes: https://github.com/edspencer/paddock/releases/tag/v0.80.0',
  );
  assert.equal(
    updateNotice({ name: 'Paddock', current: '1', target: '2', command: 'sudo npm install -g x@2', note: "the global folder isn't writable", changelog: null }),
    "Paddock 2 is available (you have 1).\n  Run: sudo npm install -g x@2    (the global folder isn't writable)",
  );
});
