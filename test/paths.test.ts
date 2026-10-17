import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PACKAGE_ROOT, VERSION, resolveDataDir, tildify } from '../server/paths.ts';
import { ROOT } from './fixture.ts';

const HOME = path.resolve('/home/alex');

test('the data home: --data-dir, then $BRAGDOC_HOME, then ~/.bragdoc', () => {
  assert.equal(resolveDataDir(undefined, {}, HOME), path.join(HOME, '.bragdoc'));
  assert.equal(resolveDataDir(undefined, { BRAGDOC_HOME: '' }, HOME), path.join(HOME, '.bragdoc'));
  assert.equal(resolveDataDir(undefined, { BRAGDOC_HOME: '/srv/brag' }, HOME), path.resolve('/srv/brag'));
  assert.equal(resolveDataDir('/flag/wins', { BRAGDOC_HOME: '/srv/brag' }, HOME), path.resolve('/flag/wins'));
});

test('the data home expands ~ and is always absolute', () => {
  assert.equal(resolveDataDir('~/notes/brag', {}, HOME), path.join(HOME, 'notes', 'brag'));
  assert.equal(resolveDataDir('~', {}, HOME), HOME);
  assert.ok(path.isAbsolute(resolveDataDir('relative/dir', {}, HOME)));
});

test('tildify shortens paths under the home only', () => {
  assert.equal(tildify(path.join(HOME, '.bragdoc'), HOME), `~${path.sep}.bragdoc`);
  assert.equal(tildify(HOME, HOME), '~');
  assert.equal(tildify(path.resolve('/home/alexandra/x'), HOME), path.resolve('/home/alexandra/x'));
});

test('the package root and version come from package.json', () => {
  assert.equal(PACKAGE_ROOT, ROOT);
  assert.equal(VERSION, JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version);
});
