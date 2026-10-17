import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOOPBACK, UsageError, check, parseArgs, parseHost } from '../server/args.ts';
import { DEFAULT_PORT, parsePort } from '../server/port.ts';

test('parses positionals, value flags in both forms, and the short flags', () => {
  assert.deepEqual(parseArgs(['serve', '--port', '5050', '--data-dir=/tmp/x', '-q']), {
    pos: ['serve'],
    flags: { port: '5050', 'data-dir': '/tmp/x', quiet: '1' },
  });
  assert.deepEqual(parseArgs(['-h']).flags, { help: '1' });
  assert.deepEqual(parseArgs(['-v']).flags, { version: '1' });
});

test('keeps everything after a bare -- untouched', () => {
  assert.deepEqual(parseArgs(['serve', '--', '--port', 'x']), { pos: ['serve'], flags: {}, rest: ['--port', 'x'] });
});

test('unknown options and missing values are usage errors', () => {
  assert.throws(() => parseArgs(['--nope']), UsageError);
  assert.throws(() => parseArgs(['-x']), UsageError);
  assert.throws(() => parseArgs(['--port']), /--port needs a value/);
});

test('check rejects flags a command does not take, and extra arguments', () => {
  assert.throws(() => check('serve', { port: '1', host: 'x' }, ['port'], [], 0), /serve doesn't take --host/);
  assert.throws(() => check('serve', {}, [], ['extra'], 0), /unexpected argument 'extra'/);
  assert.throws(() => check('serve', {}, [], [], 0, ['x']), /doesn't take a command after --/);
  check('serve', { port: '1' }, ['port'], [], 0);
});

test('--host: bare addresses, brackets stripped, loopback recognised', () => {
  assert.equal(parseHost(undefined), '127.0.0.1');
  assert.equal(parseHost('[::1]'), '::1');
  assert.equal(parseHost('::1'), '::1');
  assert.equal(parseHost('0.0.0.0'), '0.0.0.0');
  assert.throws(() => parseHost(''), UsageError);
  assert.throws(() => parseHost('[]'), UsageError);
  assert.ok(LOOPBACK.has(parseHost('[::1]')));
  assert.ok(!LOOPBACK.has(parseHost('0.0.0.0')));
});

test('ports: 2724 by default, integers 0-65535 only', () => {
  assert.equal(DEFAULT_PORT, 2724);
  assert.equal(parsePort('5050'), 5050);
  assert.equal(parsePort('0'), 0);
  assert.equal(parsePort('65536'), null);
  assert.equal(parsePort('-1'), null);
  assert.equal(parsePort('80a'), null);
  assert.equal(parsePort(''), null);
});
