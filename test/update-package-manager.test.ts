// From edspencer/cli-contract test/package-manager.test.ts @ 1.0; local changes: imports from server/update/ and the published runner's
// schema validator. The tests of the reference code BragDoc copied (D88).
//
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  cacheAdd,
  cliVersion,
  installArgs,
  installPackage,
  isWritable,
  npmCommand,
  npmConfigGet,
  npmGlobalRoot,
  type Spawn,
} from '../server/update/package-manager.ts';
import { tempDir } from './update-helpers.ts';

/** Records each call as one line, and answers from `answers` by the command's first argument. */
function recorder(answers: Record<string, { status: number; stdout: string }> = {}) {
  const calls: { cmd: string; args: string[]; shell: boolean }[] = [];
  const spawn: Spawn = (cmd, args, opts) => {
    calls.push({ cmd, args, shell: opts?.shell === true });
    const a = answers[args.find((x) => !x.endsWith('.js')) ?? ''];
    return { status: a?.status ?? 0, stdout: a?.stdout ?? '', stderr: '' };
  };
  return { calls, spawn };
}

test("finds the npm beside this Node and runs it with this Node, without a shell", () => {
  const posix = npmCommand({
    execPath: '/opt/node/bin/node',
    platform: 'linux',
    exists: (p) => p === path.join('/opt/node/bin', 'npm'),
    realpath: () => '/opt/node/lib/node_modules/npm/bin/npm-cli.js',
  });
  assert.deepEqual(posix, { cmd: '/opt/node/bin/node', pre: ['/opt/node/lib/node_modules/npm/bin/npm-cli.js'], shell: false });

  const win = npmCommand({ execPath: 'C:\\Program Files\\nodejs\\node.exe', platform: 'win32', exists: () => true, realpath: (p) => p });
  assert.equal(win.cmd, 'C:\\Program Files\\nodejs\\node.exe');
  assert.equal(win.shell, false, 'no shell, even on Windows, and so no quoting of "Program Files"');
  assert.match(win.pre[0], /node_modules[\\/]npm[\\/]bin[\\/]npm-cli\.js$/);

  // A distribution that packages npm separately: whatever `npm` the PATH has.
  assert.deepEqual(npmCommand({ execPath: '/usr/bin/node', platform: 'linux', exists: () => false }), { cmd: 'npm', pre: [], shell: false });
  assert.deepEqual(npmCommand({ execPath: 'C:\\n\\node.exe', platform: 'win32', exists: () => false }), { cmd: 'npm.cmd', pre: [], shell: true });
});

test('the real npm beside this Node answers `root -g`', () => {
  const root = npmGlobalRoot();
  assert.ok(root !== undefined && path.isAbsolute(root), String(root));
});

test('reads `npm root -g` and `npm config get` from the last line, and nothing from a failure', () => {
  const ctx = { execPath: '/n/bin/node', platform: 'linux' as const, exists: () => false };
  const r = recorder({ root: { status: 0, stdout: 'npm warn something\n/p/lib/node_modules\n' }, config: { status: 0, stdout: 'undefined\n' } });
  assert.equal(npmGlobalRoot({ ...ctx, spawn: r.spawn }), '/p/lib/node_modules');
  assert.equal(npmConfigGet('registry', { ...ctx, spawn: r.spawn }), undefined);
  assert.equal(npmGlobalRoot({ ...ctx, spawn: recorder({ root: { status: 1, stdout: '/x' } }).spawn }), undefined);
});

test('installs with the manager this install came from (SPEC §6)', () => {
  assert.deepEqual(installArgs('npm', 'a@1'), { cmd: 'npm', args: ['install', '--global', '--no-audit', '--no-fund', 'a@1'] });
  assert.deepEqual(installArgs('pnpm', 'a@1'), { cmd: 'pnpm', args: ['add', '-g', 'a@1'] });
  assert.deepEqual(installArgs('bun', 'a@1'), { cmd: 'bun', args: ['add', '-g', 'a@1'] });
  assert.deepEqual(installArgs('volta', 'a@1'), { cmd: 'volta', args: ['install', 'a@1'] });

  const npm = recorder();
  installPackage({ manager: 'npm', packageName: '@s/a', version: '1.0.0', spawn: npm.spawn, execPath: '/n/bin/node', platform: 'linux', exists: () => false });
  assert.deepEqual(npm.calls, [{ cmd: 'npm', args: ['install', '--global', '--no-audit', '--no-fund', '@s/a@1.0.0'], shell: false }]);

  const pnpmWin = recorder();
  installPackage({ manager: 'pnpm', packageName: '@s/a', version: '1.0.0', spawn: pnpmWin.spawn, platform: 'win32' });
  assert.deepEqual(pnpmWin.calls, [{ cmd: 'pnpm add -g @s/a@1.0.0', args: [], shell: true }], 'one quoted line for cmd.exe');

  const cache = recorder();
  cacheAdd('@s/a', '1.0.0', { spawn: cache.spawn, execPath: '/n/bin/node', platform: 'linux', exists: () => false });
  assert.deepEqual(cache.calls[0].args, ['cache', 'add', '@s/a@1.0.0']);
});

test("asks a CLI its version by running it, and doesn't believe anything that isn't one", () => {
  const answer = (stdout: string, status = 0): Spawn => () => ({ status, stdout, stderr: '' });
  assert.equal(cliVersion('/x/cli.js', { spawn: answer('1.2.3\n') }), '1.2.3');
  assert.equal(cliVersion('/x/cli.js', { spawn: answer('tool v1.2.3\n') }), undefined);
  assert.equal(cliVersion('/x/cli.js', { spawn: answer('1.2.3\n', 1) }), undefined);
});

test('writable means a folder can be made in it; a missing folder asks its parent', () => {
  const dir = tempDir();
  assert.equal(isWritable(dir), true);
  assert.equal(isWritable(path.join(dir, 'not', 'yet')), true);
  assert.deepEqual(fs.readdirSync(dir), [], 'the probe is removed');
  // Root ignores mode bits, and Windows has none to set.
  if (process.platform !== 'win32' && process.getuid?.() !== 0) {
    fs.chmodSync(dir, 0o500);
    try {
      assert.equal(isWritable(dir), false);
    } finally {
      fs.chmodSync(dir, 0o700);
    }
  }
});
