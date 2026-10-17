// The service writers and parsers (server/platform/): golden plist and unit files, round trips, the manager's own
// output formats, PATH capture, transient installs. Pure, so every OS tests both platforms.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { openCommand } from '../server/platform/index.ts';
import { parseLaunchctlPrint, parsePlistArgv, renderPlist } from '../server/platform/launchd.ts';
import { pathProblem, servicePath } from '../server/platform/path.ts';
import { type ServiceSpec, buildSpec, readArgv, stableNodePath, transientInstall } from '../server/platform/spec.ts';
import { execWord, parseShow, parseUnitArgv, renderUnit } from '../server/platform/systemd.ts';
import { DEFAULT_PORT } from '../server/port.ts';
import { ROOT } from './fixture.ts';

const fixture = (name: string) => fs.readFileSync(path.join(ROOT, 'test', 'fixtures', 'services', name), 'utf8');

// placeholder paths (the repo is public), with a space in them: a quoting bug shows up here
const SPEC = buildSpec({
  nodePath: '/opt/node 22/bin/node',
  nodeVersion: 'v22.12.0',
  cliScript: '/home/someone/.npm-global/lib/node_modules/@bragdoc/local/dist/server/cli.js',
  dataDir: '/home/someone/My Data/bragdoc',
  dataDirChosen: true,
  port: 2724,
  pathEnv: '/opt/node 22/bin:/usr/local/bin:/usr/bin:/bin',
});

test('the plist matches the golden file: KeepAlive and RunAtLoad unconditional, one log, PATH only', () => {
  const text = renderPlist(SPEC);
  assert.equal(text, fixture('bragdoc.plist'));
  assert.match(text, /<key>KeepAlive<\/key>\s*<true\/>/);
  assert.doesNotMatch(text, /SuccessfulExit/);
  assert.match(text, /<string>ai\.bragdoc\.local<\/string>/);
});

test('the systemd unit matches the golden file: Restart=always, WantedBy=default.target, quoted ExecStart', () => {
  const text = renderUnit(SPEC);
  assert.equal(text, fixture('bragdoc.service'));
  assert.match(text, /^Restart=always$/m);
  assert.match(text, /^WantedBy=default\.target$/m);
  assert.match(text, /^ExecStart="\/opt\/node 22\/bin\/node" /m);
});

test('the argv round-trips through both formats, whatever is in it', () => {
  const tricky: ServiceSpec = { ...SPEC, program: ['/opt/node 22/bin/node', '/a b/cli.js', 'serve', '--port', '5151', '--data-dir', `/x/100% "$HOME" & <me>\\y`, ''] };
  assert.deepEqual(parsePlistArgv(renderPlist(tricky)), tricky.program);
  assert.deepEqual(parseUnitArgv(renderUnit(tricky)), tricky.program);
  assert.equal(execWord('plain'), 'plain');
  assert.equal(execWord('a b'), '"a b"');
  assert.equal(execWord('$HOME'), '$$HOME');
  assert.equal(execWord('100%'), '100%%');
});

test('the spec: the port is always written, the data home only when chosen, never --open or --quiet', () => {
  const base = { nodePath: '/n/node', nodeVersion: 'v24.0.0', cliScript: '/p/dist/server/cli.js', dataDir: '/h/.bragdoc', pathEnv: '/usr/bin' };
  const def = buildSpec({ ...base, dataDirChosen: false, port: DEFAULT_PORT });
  assert.deepEqual(def.program, ['/n/node', '/p/dist/server/cli.js', 'serve', '--port', '2724']);
  assert.equal(def.cwd, '/h/.bragdoc/service');
  assert.equal(def.log, '/h/.bragdoc/service/bragdoc.log');
  assert.deepEqual(def.env, { PATH: '/usr/bin' });
  const chosen = buildSpec({ ...base, dataDirChosen: true, port: 5151 });
  assert.deepEqual(chosen.program.slice(2), ['serve', '--port', '5151', '--data-dir', '/h/.bragdoc']);
  assert.deepEqual(readArgv(chosen.program), { port: 5151, dataDir: '/h/.bragdoc' });
  assert.deepEqual(readArgv(def.program), { port: 2724, dataDir: null });
  assert.deepEqual(readArgv(['serve', '--port', 'nonsense']), { port: DEFAULT_PORT, dataDir: null });
});

test('launchctl print and systemctl show are parsed', () => {
  const printed = 'gui/501/ai.bragdoc.local = {\n\tactive count = 1\n\tstate = running\n\tpid = 4242\n\tlast exit code = (never exited)\n\tendpoints = {\n\t\tstate = nested\n\t}\n}\n';
  assert.deepEqual(parseLaunchctlPrint(printed), { state: 'running', pid: 4242, lastExitCode: null });
  assert.deepEqual(parseLaunchctlPrint('\tstate = not running\n\tlast exit code = 1\n'), { state: 'not running', pid: null, lastExitCode: 1 });
  assert.deepEqual(parseShow('ActiveState=active\nMainPID=12\nWeird\n'), { ActiveState: 'active', MainPID: '12' });
});

test('the PATH captured at install: Node first, per-shell and missing directories dropped, system dirs after', () => {
  const exists = (p: string) => !p.includes('missing');
  const p = servicePath('/opt/node/bin', '/home/someone/.local/share/fnm_multishells/123_456/bin:relative/bin:/missing/bin:/usr/bin:/opt/node/bin/:/home/someone/.npm/_npx/abc/node_modules/.bin', exists);
  const dirs = p.split(':');
  assert.equal(dirs[0], '/opt/node/bin');
  assert.equal(dirs[1], '/usr/bin');
  assert.ok(!dirs.some((d) => d.includes('fnm_multishells') || d.includes('_npx') || d.includes('missing') || d.startsWith('relative')), p);
  assert.ok(dirs.includes('/usr/local/bin') && dirs.includes('/bin'));
  assert.equal(new Set(dirs).size, dirs.length, 'no duplicates');
  assert.equal(pathProblem('relative', exists), 'not an absolute path');
});

test('transient installs: npx, pnpm dlx, bunx, dlx-<pid>; a project merely called _npx-something is fine', () => {
  assert.equal(transientInstall('/Users/alex/.npm/_npx/1a2b3c/node_modules/@bragdoc/local')?.where, "npx's cache");
  assert.equal(transientInstall('/home/alex/.cache/pnpm/dlx/abc/node_modules/@bragdoc/local')?.owner, 'pnpm');
  assert.equal(transientInstall('/tmp/bunx-501-@bragdoc/local/node_modules')?.owner, 'bun');
  assert.equal(transientInstall('/tmp/dlx-12345/node_modules/@bragdoc/local')?.where, 'a temporary dlx directory');
  assert.equal(transientInstall('/usr/local/lib/node_modules/@bragdoc/local'), null);
  assert.equal(transientInstall('/home/alex/Code/_npx-tools/bragdoc'), null);
});

test('--open uses open on macOS, xdg-open on Linux, and nothing it would have to guess elsewhere', () => {
  assert.deepEqual(openCommand('darwin', 'http://localhost:2724'), ['open', ['http://localhost:2724']]);
  assert.deepEqual(openCommand('linux', 'http://localhost:2724'), ['xdg-open', ['http://localhost:2724']]);
  assert.equal(openCommand('win32', 'http://localhost:2724'), null);
});

test("Homebrew's versioned Cellar Node becomes its opt/ symlink, which survives brew upgrade; other paths are kept", () => {
  const yes = () => true;
  assert.equal(stableNodePath('/opt/homebrew/Cellar/node/24.1.0/bin/node', yes), '/opt/homebrew/opt/node/bin/node');
  assert.equal(stableNodePath('/usr/local/Cellar/node@22/22.12.0/bin/node', yes), '/usr/local/opt/node@22/bin/node');
  assert.equal(stableNodePath('/opt/homebrew/Cellar/node/24.1.0/bin/node', () => false), '/opt/homebrew/Cellar/node/24.1.0/bin/node');
  assert.equal(stableNodePath('/home/someone/.nvm/versions/node/v24.1.0/bin/node', yes), '/home/someone/.nvm/versions/node/v24.1.0/bin/node');
});
