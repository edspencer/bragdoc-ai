import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { bannerLines, startupMessage } from '../server/banner.ts';
import { MIN_NODE, nodeTooOld } from '../server/node-version.ts';
import { ROOT } from './fixture.ts';

const o = { version: '1.2.3', url: 'http://localhost:2724', home: '~/.bragdoc' };

test('"BragDoc on <url>" is the FIRST line, banner or not, with "Data home:" right after it', () => {
  for (const t of [{ env: {} }, { isTTY: true, env: {}, depth: 24 }, { isTTY: true, columns: 20, env: {}, depth: 1 }, { env: { FORCE_COLOR: '1' }, depth: 8 }]) {
    const lines = startupMessage(o, t).split('\n');
    assert.equal(lines[0], 'BragDoc on http://localhost:2724', JSON.stringify(t));
    assert.equal(lines[1], 'Data home: ~/.bragdoc');
  }
});

test('not a terminal: three plain lines, no art, no colour, no hints', () => {
  assert.equal(startupMessage(o, { env: {} }), 'BragDoc on http://localhost:2724\nData home: ~/.bragdoc\nVersion: 1.2.3\n');
});

test('--quiet: the first line alone, even on a terminal', () => {
  assert.equal(startupMessage({ ...o, quiet: true }, { isTTY: true, env: {} }), 'BragDoc on http://localhost:2724\n');
});

test('a terminal: the BRAGDOC art (fits 80 columns), the version, the agent hint, and the npx hint when transient', () => {
  const s = startupMessage({ ...o, transient: "npx's cache" }, { isTTY: true, columns: 80, env: {}, depth: 1 });
  assert.ok(bannerLines().every((l) => s.includes(l)));
  assert.ok(Math.max(...bannerLines().map((l) => l.length)) + 2 <= 80);
  assert.match(s, / v1\.2\.3\n/);
  assert.match(s, /bragdoc guide/);
  assert.match(s, /Running from npx's cache, so it stops with this terminal[\s\S]*npm i -g @bragdoc\/local && bragdoc service install/);
  // too narrow for the art: a one-line title
  const narrow = startupMessage(o, { isTTY: true, columns: 40, env: {}, depth: 1 });
  assert.match(narrow, /▌ BRAGDOC v1\.2\.3/);
  assert.ok(!narrow.includes(bannerLines()[0]!));
});

test('colour only when the terminal has it', () => {
  assert.doesNotMatch(startupMessage(o, { isTTY: true, env: {}, depth: 1 }), /\x1b\[/);
  assert.match(startupMessage(o, { isTTY: true, env: {}, depth: 24 }), /\x1b\[38;2;/);
});

test('the Node version check, and MIN_NODE matches engines.node', () => {
  assert.equal(nodeTooOld('20.18.0'), true);
  assert.equal(nodeTooOld('v22.11.9'), true);
  assert.equal(nodeTooOld('22.12.0'), false);
  assert.equal(nodeTooOld('22.13.1'), false);
  assert.equal(nodeTooOld('24.0.0'), false);
  assert.equal(nodeTooOld(process.versions.node), false);
  const engines = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).engines.node;
  assert.equal(engines, `>=${MIN_NODE}`);
});
