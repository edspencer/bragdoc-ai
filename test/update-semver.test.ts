// From edspencer/cli-contract test/semver.test.ts @ 1.0; local changes: imports from server/update/ and the published runner's
// schema validator. The tests of the reference code BragDoc copied (D88).
//
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bumpVersion, compareVersions, isNewer, isPrerelease, maxVersion, parseVersion, satisfies, satisfiesEngines } from '../server/update/semver.ts';

test('parses and compares releases', () => {
  assert.deepEqual(parseVersion('v1.2.3'), { major: 1, minor: 2, patch: 3, prerelease: [] });
  assert.equal(parseVersion('1.2'), undefined);
  assert.equal(compareVersions('0.81.0', '0.80.0'), 1);
  assert.equal(compareVersions('0.80.0', '0.81.0'), -1);
  assert.equal(compareVersions('1.0.0', '1.0.0+build.5'), 0);
  assert.equal(compareVersions('0.9.0', '0.10.0'), -1);
  assert.equal(compareVersions('nonsense', '1.0.0'), 0);
  assert.equal(isNewer('1.0.0', '0.99.99'), true);
  assert.equal(maxVersion(['0.1.0', 'nonsense', '0.2.0']), '0.2.0');
  assert.equal(maxVersion([]), undefined);
});

test('orders prereleases below their release, and numerically within', () => {
  assert.equal(compareVersions('1.0.0-rc.1', '1.0.0'), -1);
  assert.equal(compareVersions('1.0.0-rc.2', '1.0.0-rc.10'), -1);
  assert.equal(compareVersions('1.0.0-alpha', '1.0.0-beta'), -1);
  assert.equal(compareVersions('1.0.0-rc.1', '1.0.0-rc.1.1'), -1);
  assert.equal(compareVersions('1.0.0-1', '1.0.0-alpha'), -1, 'a numeric identifier sorts below an alphanumeric one');
  assert.equal(isPrerelease('0.82.0-rc.1'), true);
  assert.equal(isPrerelease('0.82.0'), false);
});

test('bumps a version', () => {
  assert.equal(bumpVersion('0.82.3', 'minor'), '0.83.0');
  assert.equal(bumpVersion('0.82.3', 'patch'), '0.82.4');
  assert.equal(bumpVersion('1.2.3-rc.1', 'major'), '2.0.0');
  assert.throws(() => bumpVersion('x', 'patch'), /not a version/);
});

test('reads the engines ranges that appear in practice', () => {
  const yes: [string, string][] = [
    ['22.11.0', '>=22'],
    ['22.11.0', '>=22.0.0'],
    ['24.0.0', '>=22'],
    ['22.1.0', '^22.1.0'],
    ['22.1.9', '~22.1'],
    ['22.0.0', '22'],
    ['22.5.1', '22.x'],
    ['22.0.0', '>=20 <23'],
    ['20.1.0', '20 || 22'],
    ['22.0.0', '*'],
    ['22.0.0', ''],
    ['0.2.9', '^0.2.3'],
    ['0.0.3', '^0.0.3'],
    ['0.0.9', '^0.0'],
  ];
  for (const [v, r] of yes) assert.equal(satisfies(v, r), true, `${v} in ${r}`);
  const no: [string, string][] = [
    ['20.11.0', '>=22'],
    ['23.0.0', '>=20 <23'],
    ['22.2.0', '~22.1'],
    ['21.0.0', '20 || 22'],
    ['23.0.0', '^22.1.0'],
    ['0.3.0', '^0.2.3'],
    ['0.0.4', '^0.0.3'],
    ['0.1.0', '^0.0'],
  ];
  for (const [v, r] of no) assert.equal(satisfies(v, r), false, `${v} in ${r}`);
});

test("a range it can't read is `undefined`, which `satisfiesEngines` passes on as ok: undefined", () => {
  assert.equal(satisfies('22.0.0', '1.2 - 2.3'), undefined);
  assert.equal(satisfies('not a version', '>=22'), undefined);
  assert.equal(satisfies('22.0.0', '1.2 - 2.3 || >=22'), true, 'the alternatives it can read still count');
  assert.deepEqual(satisfiesEngines('22.0.0', { node: '1.2 - 2.3' }), { ok: undefined, range: '1.2 - 2.3' });
  assert.deepEqual(satisfiesEngines('22.0.0', undefined), { ok: true, range: undefined });
  assert.deepEqual(satisfiesEngines('20.0.0', { node: '>=22' }), { ok: false, range: '>=22' });
});
