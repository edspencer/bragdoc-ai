// From edspencer/cli-contract test/install-method.test.ts @ 0.2; local changes: imports from server/update/ and the published runner's
// schema validator. The tests of the reference code BragDoc copied (D88).
//
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { describeInstall, detectInstall, isEphemeralCachePath, underNodeModules, updateCommand, type InstallInfo } from '../server/update/install-method.ts';

// SPEC §6's table against made-up layouts: only the shape of the tree has to be real.
const NAME = '@edspencer/paddock';
const SUB = path.join('dist', 'cli.js');
const P = (...parts: string[]) => path.join(path.sep, ...parts);

function fakeFs(root: string, name = NAME) {
  const manifest = path.join(root, 'package.json');
  return { existsSync: (p: string) => p === manifest, readFileSync: () => JSON.stringify({ name }), realpathSync: (p: string) => p };
}

function detect(root: string, env: Record<string, string> = {}, globalRoot?: string): InstallInfo {
  return detectInstall({
    packageName: NAME,
    envPrefix: 'PADDOCK',
    entry: path.join(root, SUB),
    env,
    ...(globalRoot !== undefined ? { npmGlobalRoot: () => globalRoot } : {}),
    fs: fakeFs(root),
  });
}

const npmRoot = P('usr', 'local', 'lib', 'node_modules');
const globalPkg = path.join(npmRoot, '@edspencer', 'paddock');

test('row 1: Docker, from the tool\'s own variable', () => {
  const info = detect(globalPkg, { PADDOCK_IN_DOCKER: '1' }, npmRoot);
  assert.equal(info.method, 'docker');
  assert.equal(info.canUpdate, false);
  assert.deepEqual(updateCommand(info, { packageName: NAME, target: '0.82.0', image: 'ghcr.io/edspencer/paddock' }), {
    command: 'docker compose pull && docker compose up -d',
    note: 'image ghcr.io/edspencer/paddock:0.82.0',
  });
  assert.equal(detect(globalPkg, { PADDOCK_IN_DOCKER: '0' }, npmRoot).method, 'npm-global', 'only 1 counts');
});

test('row 2: managed, printing the hint; Docker beats it, but the hint is still the command', () => {
  const managed = detect(globalPkg, { PADDOCK_UPDATE_HINT: 'ansible-playbook paddock.yml' }, npmRoot);
  assert.equal(managed.method, 'managed');
  assert.equal(updateCommand(managed, { packageName: NAME }).command, 'ansible-playbook paddock.yml');
  const both = detect(globalPkg, { PADDOCK_IN_DOCKER: '1', PADDOCK_UPDATE_HINT: 'run the playbook' }, npmRoot);
  assert.equal(both.method, 'docker');
  assert.equal(updateCommand(both, { packageName: NAME }).command, 'run the playbook');
  assert.equal(detect(globalPkg, { PADDOCK_UPDATE_HINT: '' }, npmRoot).method, 'npm-global', 'an empty hint is no hint');
});

test('row 3: the npx, pnpm dlx, bunx and yarn dlx caches, matched as whole segments', () => {
  for (const root of [
    P('home', 'u', '.npm', '_npx', 'a1b2', 'node_modules', '@edspencer', 'paddock'),
    P('home', 'u', '.local', 'share', 'pnpm', 'store', 'v3', 'dlx', 'x1', 'node_modules', '@edspencer', 'paddock'),
    P('tmp', 'bunx-501-paddock', 'node_modules', '@edspencer', 'paddock'),
    P('tmp', 'xfs-1234', 'dlx-99', 'node_modules', '@edspencer', 'paddock'),
  ]) {
    assert.equal(detect(root).method, 'npx', root);
  }
  assert.equal(isEphemeralCachePath(P('srv', 'my_npx_tools', 'x')), false);
  assert.equal(isEphemeralCachePath(P('srv', 'dlxtools', 'x')), false);
  assert.deepEqual(updateCommand(detect(P('a', '_npx', 'b', 'node_modules', '@edspencer', 'paddock')), { packageName: NAME }), {
    command: 'npx @edspencer/paddock@latest',
    note: 'npx already runs the latest version each time',
  });
});

test('row 4: a checkout or an npm link is not under a node_modules', () => {
  const info = detect(P('home', 'u', 'src', 'paddock'));
  assert.equal(info.method, 'checkout');
  assert.equal(updateCommand(info, { packageName: NAME }).command, 'git pull && npm install && npm run build');
  assert.match(describeInstall(info, NAME), /running from a checkout at /);
  assert.equal(underNodeModules(P('srv', 'my-node_modules', 'x')), false);
});

test("a checkout whose manifests don't have the published name still reads as a checkout", () => {
  const repo = P('home', 'u', 'src', 'paddock');
  const info = detectInstall({
    packageName: NAME,
    envPrefix: 'PADDOCK',
    entry: path.join(repo, 'packages', 'server', 'dist', 'cli.js'),
    env: {},
    fs: fakeFs(path.join(repo, 'packages', 'server'), '@paddock/server'),
  });
  assert.deepEqual([info.method, info.named, info.packageRoot], ['checkout', false, path.join(repo, 'packages', 'server')]);
});

test('row 5: global npm, asked of npm, through a symlinked root too', () => {
  const info = detect(globalPkg, {}, npmRoot);
  assert.deepEqual([info.method, info.canUpdate, info.manager], ['npm-global', true, 'npm']);
  assert.deepEqual(updateCommand(info, { packageName: NAME, target: '0.82.0', sudo: true }), {
    command: 'sudo npm install -g @edspencer/paddock@0.82.0',
    note: "the global folder isn't writable",
  });
  // npm says /opt/homebrew/lib/node_modules; the package's real path is the same folder through a symlink.
  const viaLink = detectInstall({
    packageName: NAME,
    envPrefix: 'PADDOCK',
    entry: path.join(globalPkg, SUB),
    env: {},
    npmGlobalRoot: () => P('opt', 'homebrew', 'lib', 'node_modules'),
    fs: { ...fakeFs(globalPkg), realpathSync: (p: string) => p.replace(P('opt', 'homebrew'), P('usr', 'local')) },
  });
  assert.equal(viaLink.method, 'npm-global');
  // With no answer from npm, the same folder is just some node_modules.
  assert.equal(detect(globalPkg).method, 'dependency');
});

test('rows 6 to 9: pnpm, bun, volta and yarn classic', () => {
  const rows: [string, string, boolean, string][] = [
    [P('home', 'u', '.local', 'share', 'pnpm', 'global', '5', 'node_modules', '@edspencer', 'paddock'), 'pnpm-global', true, 'pnpm add -g @edspencer/paddock@1.0.0'],
    [P('home', 'u', '.bun', 'install', 'global', 'node_modules', '@edspencer', 'paddock'), 'bun-global', true, 'bun add -g @edspencer/paddock@1.0.0'],
    [P('home', 'u', '.volta', 'tools', 'image', 'packages', '@edspencer', 'paddock', 'lib', 'node_modules', '@edspencer', 'paddock'), 'volta', true, 'volta install @edspencer/paddock@1.0.0'],
    [P('home', 'u', '.config', 'yarn', 'global', 'node_modules', '@edspencer', 'paddock'), 'yarn-global', false, 'yarn global add @edspencer/paddock@1.0.0'],
  ];
  for (const [root, method, canUpdate, command] of rows) {
    const info = detect(root, {}, npmRoot);
    assert.deepEqual([info.method, info.canUpdate], [method, canUpdate], root);
    assert.equal(updateCommand(info, { packageName: NAME, target: '1.0.0' }).command, command);
  }
});

test('row 10: a dependency of a project, naming the project', () => {
  const info = detect(P('home', 'u', 'work', 'app', 'node_modules', '@edspencer', 'paddock'), {}, npmRoot);
  assert.equal(info.method, 'dependency');
  assert.deepEqual(updateCommand(info, { packageName: NAME, target: '1.0.0' }), {
    command: 'npm install @edspencer/paddock@1.0.0',
    note: `run it in the project that depends on @edspencer/paddock (${P('home', 'u', 'work', 'app')})`,
  });
});

test('walks past an unreadable package.json on the way up', () => {
  const root = P('srv', 'x', 'node_modules', '@edspencer', 'paddock');
  const inner = path.join(root, 'dist', 'package.json');
  const info = detectInstall({
    packageName: NAME,
    envPrefix: 'PADDOCK',
    entry: path.join(root, 'dist', 'cli.js'),
    env: {},
    fs: {
      existsSync: (p) => p === inner || p === path.join(root, 'package.json'),
      readFileSync: (p) => (p === inner ? '{ not json' : JSON.stringify({ name: NAME })),
      realpathSync: (p) => p,
    },
  });
  assert.deepEqual([info.packageRoot, info.named], [root, true]);
});

test('no package.json anywhere reads as a checkout, with nothing to install', () => {
  const info = detectInstall({ packageName: NAME, envPrefix: 'PADDOCK', entry: P('x', 'cli.js'), env: {}, fs: { existsSync: () => false, readFileSync: () => '', realpathSync: (p) => p } });
  assert.deepEqual([info.method, info.packageRoot], ['checkout', undefined]);
});

test('every row has a line a person can read', () => {
  const methods = ['docker', 'managed', 'npx', 'checkout', 'npm-global', 'pnpm-global', 'bun-global', 'volta', 'yarn-global', 'dependency'] as const;
  for (const method of methods) assert.ok(describeInstall({ method, packageRoot: undefined, named: false, canUpdate: false }, NAME).length > 10, method);
});
