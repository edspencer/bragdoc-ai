// BragDoc's side of `bragdoc update` and `doctor` (D87, D88): the registry through egress.ts and nowhere else, npm's
// runs in the network log, the health polls on loopback, the backup before a version that raises a schemaVersion, and
// the commands' flags. The sequence itself is the reference's, tested in test/update-update.test.ts.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { UsageError } from '../server/args.ts';
import { makeCtx } from '../server/commands/context.ts';
import { doctor, runChecks } from '../server/commands/doctor.ts';
import { loggedSpawn, raisesSchema, schemaVersions, schemaVersionsOf, update, updateProduct, viaEgress } from '../server/commands/update.ts';
import { busy } from '../server/commands/busy.ts';
import { service } from '../server/commands/service.ts';
import { DEFAULT_CONFIG } from '../server/config.ts';
import { Egress, EgressDenied, readNetworkLog } from '../server/egress.ts';
import { VERSION } from '../server/paths.ts';
import { runSync } from '../server/proc.ts';
import { backupBeforeUpdate, listSnapshots, pruneSnapshots } from '../server/store/backups.ts';
import { schemaVersionsFrom } from '../scripts/schema-versions.mjs';
import { loadSchema, validate } from '@edspencer/cli-conformance/dist/src/schema.js';
import { ROOT, rmTmp, tmpDir } from './fixture.ts';

const dirs: string[] = [];
after(() => dirs.forEach(rmTmp));
const dir = (p = 'bragdoc-update-') => {
  const d = tmpDir(p);
  dirs.push(d);
  return d;
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

test("the registry fetch asks only for BragDoc's dist-tags and manifests, at the registry, and logs each as update.registry", async () => {
  const d = dir();
  const asked: string[] = [];
  const egress = new Egress({ dataDir: d, config: () => DEFAULT_CONFIG, fetchImpl: async (url) => (asked.push(url.href), json({ latest: '9.9.9' })) });
  const get = egress.registry({ registryUrl: 'https://registry.npmjs.org/', packageName: '@bragdoc/local' });
  await get('https://registry.npmjs.org/-/package/@bragdoc%2flocal/dist-tags');
  await get('https://registry.npmjs.org/@bragdoc%2flocal/0.5.0');
  assert.deepEqual(asked, ['https://registry.npmjs.org/-/package/@bragdoc%2flocal/dist-tags', 'https://registry.npmjs.org/@bragdoc%2flocal/0.5.0']);

  const refused = [
    'https://registry.npmjs.org/-/package/left-pad/dist-tags', // another package
    'https://registry.npmjs.org/@bragdoc%2flocal/0.5.0/extra',
    'https://registry.npmjs.org/-/whoami',
    'https://evil.example.com/-/package/@bragdoc%2flocal/dist-tags', // another host
    'http://registry.npmjs.org/-/package/@bragdoc%2flocal/dist-tags', // plain http off this computer (another origin, too)
    'https://registry.npmjs.org/-/package/@bragdoc%2flocal/dist-tags?x=1',
  ];
  for (const u of refused) await assert.rejects(get(u), EgressDenied, u);
  await assert.rejects(get('https://registry.npmjs.org/@bragdoc%2flocal/0.5.0', { method: 'PUT', body: '{}' }), /a plain GET/);
  assert.equal(asked.length, 2, 'nothing refused was sent');

  const entries = readNetworkLog(d, { limit: 100 }).entries;
  assert.ok(entries.every((e) => e.purpose === 'update.registry'));
  assert.equal(entries.filter((e) => e.outcome === 'ok').length, 2);
  assert.equal(entries.filter((e) => e.outcome === 'denied').length, refused.length + 1);
});

test('a registry under a path (a mirror) and on this computer (a local one) is asked there, over plain http on loopback', async () => {
  const d = dir();
  const asked: string[] = [];
  const egress = new Egress({ dataDir: d, config: () => DEFAULT_CONFIG, fetchImpl: async (url) => (asked.push(url.href), json({})) });
  const mirror = egress.registry({ registryUrl: 'https://npm.example.com/api/npm/', packageName: '@bragdoc/local' });
  await mirror('https://npm.example.com/api/npm/@bragdoc%2flocal/1.0.0');
  await assert.rejects(mirror('https://npm.example.com/@bragdoc%2flocal/1.0.0'), EgressDenied, 'outside its path');
  const local = egress.registry({ registryUrl: 'http://127.0.0.1:4873', packageName: '@bragdoc/local' });
  await local('http://127.0.0.1:4873/-/package/@bragdoc%2flocal/dist-tags');
  assert.deepEqual(asked, ['https://npm.example.com/api/npm/@bragdoc%2flocal/1.0.0', 'http://127.0.0.1:4873/-/package/@bragdoc%2flocal/dist-tags']);
});

test('the update fetch: /api/health on this computer through the loopback probe, everything else to the registry', async () => {
  const loopback: string[] = [];
  const registry: string[] = [];
  const f = viaEgress({ loopback: async (port, p) => (loopback.push(`${port}${p}`), json({ ok: true })) }, async (u) => (registry.push(u), json({})));
  await f('http://localhost:2724/api/health');
  await f('http://127.0.0.1:5050/api/health');
  await f('http://127.0.0.1:4873/-/package/@bragdoc%2flocal/dist-tags');
  await f('http://example.com:2724/api/health'); // not this computer: the registry fetch refuses it
  assert.deepEqual(loopback, ['2724/api/health', '5050/api/health']);
  assert.deepEqual(registry, ['http://127.0.0.1:4873/-/package/@bragdoc%2flocal/dist-tags', 'http://example.com:2724/api/health']);
});

test("npm's installs and fetches are recorded in the network log (they leave from npm's process); its questions aren't", () => {
  const logged: { args: string[]; exitCode: number | null; error?: string }[] = [];
  const run = loggedSpawn({ logProcess: (e) => void logged.push(e) }, (_cmd, args) => ({ status: args.includes('fail') ? 1 : 0, stdout: '', stderr: args.includes('fail') ? 'npm error 404\n' : '' }));
  run(process.execPath, ['/x/npm/bin/npm-cli.js', 'root', '-g']);
  run(process.execPath, ['/x/npm/bin/npm-cli.js', 'config', 'get', 'registry']);
  run(process.execPath, ['/x/npm/bin/npm-cli.js', 'cache', 'add', '@bragdoc/local@1.0.0']);
  run(process.execPath, ['/x/npm/bin/npm-cli.js', 'install', '--global', '@bragdoc/local@1.0.0', 'fail']);
  run('pnpm', ['add', '-g', '@bragdoc/local@1.0.0']);
  run(process.execPath, ['/usr/lib/node_modules/@bragdoc/local/dist/server/cli.js', '--version']);
  assert.deepEqual(
    logged.map((e) => [e.args.slice(0, 2).join(' '), e.exitCode, e.error ?? null]),
    [
      ['cache add', 0, null],
      ['install --global', 1, 'npm error 404'],
      ['pnpm add', 0, null],
    ],
  );
});

test('runSync runs this Node and allow-listed binaries only, never another path, and never throws', () => {
  const r = runSync(process.execPath, ['-e', 'process.stdout.write("hi")']);
  assert.deepEqual(r, { status: 0, stdout: 'hi', stderr: '' });
  assert.match(runSync('/bin/sh', ['-c', 'true']).stderr, /runs no program by path but its own Node/);
  assert.equal(runSync('/bin/sh', ['-c', 'true']).status, null);
  assert.match(runSync('curl', ['https://example.com']).stderr, /doesn't run "curl"/);
  assert.equal(runSync(process.execPath, ['-e', 'process.exit(3)']).status, 3);
  assert.match(runSync(process.execPath, ['-e', 'setTimeout(() => {}, 5000)'], { timeoutMs: 100 }).stderr, /took longer than 100 ms/);
});

test('schema versions: the new version raising one means a backup; the same, lower, or a kind it drops means none', () => {
  const now = { profile: 1, achievement: 1, config: 1 };
  assert.equal(raisesSchema(now, { profile: 1, achievement: 1, config: 1 }), false);
  assert.equal(raisesSchema(now, { profile: 1, achievement: 2, config: 1 }), true);
  assert.equal(raisesSchema(now, { profile: 1, config: 1 }), false);
  assert.equal(raisesSchema(now, { profile: 1, config: 1, folio: 1 }), false, 'a new kind starts at 1: nothing old to misread');
  assert.equal(raisesSchema(now, { config: 2 }), true);
  assert.equal(raisesSchema({ ...now, achievement: 2 }, { ...now }), false, 'a downgrade');
  assert.equal(raisesSchema(now, null), true, "a version that doesn't say is backed up for");
  assert.deepEqual(Object.keys(schemaVersions()).sort(), ['achievement', 'company', 'config', 'evidence', 'found', 'instructions', 'profile', 'project', 'repo']);
});

test("the build's schema-versions.json is the code's, and is read from beside a CLI", async () => {
  // from the sources, through the same function the build uses on dist/ (its imports resolve the .ts under tsx)
  const d = dir();
  fs.mkdirSync(path.join(d, 'dist', 'server'), { recursive: true });
  const cli = path.join(d, 'dist', 'server', 'cli.js');
  assert.equal(schemaVersionsOf(cli), null, 'an older BragDoc says nothing');
  fs.writeFileSync(path.join(d, 'dist', 'server', 'schema-versions.json'), JSON.stringify({ ...schemaVersions(), achievement: 7 }));
  assert.equal(schemaVersionsOf(cli)?.achievement, 7);
  if (fs.existsSync(path.join(ROOT, 'dist', 'shared', 'schema', 'common.js'))) assert.deepEqual(await schemaVersionsFrom(path.join(ROOT, 'dist')), schemaVersions());
  assert.match(JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts.build, /schema-versions\.mjs/);
});

test('backupBeforeUpdate copies the editable files to backups/pre-<version>/, which pruning never removes', () => {
  const home = dir();
  assert.equal(backupBeforeUpdate(home, '1.0.0'), null, 'nothing to copy');
  fs.mkdirSync(path.join(home, 'achievements'), { recursive: true });
  fs.writeFileSync(path.join(home, 'achievements', 'a.yaml'), 'title: Shipped it\n');
  fs.writeFileSync(path.join(home, 'config.yaml'), 'schemaVersion: 1\n');
  fs.writeFileSync(path.join(home, 'secrets.yaml'), 'github: token\n');
  const first = backupBeforeUpdate(home, '1.0.0')!;
  assert.equal(first, path.join(home, 'backups', 'pre-1.0.0'));
  assert.equal(fs.readFileSync(path.join(first, 'achievements', 'a.yaml'), 'utf8'), 'title: Shipped it\n');
  assert.ok(!fs.existsSync(path.join(first, 'secrets.yaml')), 'never the secrets');
  assert.equal(backupBeforeUpdate(home, '1.0.0'), path.join(home, 'backups', 'pre-1.0.0-2'), 'a second attempt keeps the first copy');
  assert.deepEqual(listSnapshots(path.join(home, 'backups')), [], "it isn't a snapshot");
  pruneSnapshots(home);
  assert.ok(fs.existsSync(first));
  assert.throws(() => backupBeforeUpdate(home, '../../etc'), /not a version/);
});

test("the product: BragDoc's names, and beforeStart backs up only before a version that raises a schemaVersion", async () => {
  const home = dir();
  fs.mkdirSync(path.join(home, 'achievements'), { recursive: true });
  fs.writeFileSync(path.join(home, 'achievements', 'a.yaml'), 'title: x\n');
  const product = updateProduct(makeCtx({ homedir: home, env: {} }), { dataDir: home, svc: { installed: false, dataDir: home, port: null } });
  assert.equal(product.packageName, '@bragdoc/local');
  assert.equal(product.envPrefix, 'BRAGDOC');
  assert.equal(product.binSubpath, 'dist/server/cli.js');
  assert.equal(product.changelogUrl('1.2.3'), 'https://github.com/edspencer/bragdoc-ai/releases/tag/v1.2.3');
  const pkg = dir();
  const cli = path.join(pkg, 'dist', 'server', 'cli.js');
  fs.mkdirSync(path.dirname(cli), { recursive: true });
  fs.writeFileSync(path.join(pkg, 'dist', 'server', 'schema-versions.json'), JSON.stringify(schemaVersions()));
  assert.equal(await product.beforeStart!({ cli, version: '9.0.0' }), undefined, 'same formats: nothing to copy');
  fs.writeFileSync(path.join(pkg, 'dist', 'server', 'schema-versions.json'), JSON.stringify({ ...schemaVersions(), achievement: 2 }));
  assert.equal(await product.beforeStart!({ cli, version: '9.0.0' }), path.join(home, 'backups', 'pre-9.0.0'));
  assert.equal(product.service.tail(5), '', 'no log yet');
  assert.deepEqual(await product.service.inspect(), { installed: false, running: false });
});

test('update, doctor and install take only their own flags (cli-contract SPEC §1: exit 2, not parsed and dropped)', async () => {
  const ctx = makeCtx({ env: {}, out: () => {}, err: () => {} });
  for (const bad of ['refresh', 'offline', 'follow', 'dry-run']) await assert.rejects(update(ctx, [], { [bad]: '1' }, undefined), UsageError, bad);
  for (const bad of ['check', 'yes', 'force', 'to', 'refresh']) await assert.rejects(doctor(ctx, [], { [bad]: '1' }, undefined), UsageError, bad);
  for (const bad of ['check', 'yes', 'offline']) await assert.rejects(busy(ctx, [], { [bad]: '1' }, undefined), UsageError, bad);
  await assert.rejects(service(ctx, ['status'], { refresh: '1' }, undefined), UsageError);
  await assert.rejects(service(ctx, ['start'], { check: '1' }, undefined), UsageError);
  await assert.rejects(update(ctx, ['now'], {}, undefined), /unexpected argument/);
});

test('doctor: every check has a stable id and a fix when it fails, --offline asks nothing, and --json matches the schema', async () => {
  const home = dir('bragdoc-doctor-');
  let out = '';
  let err = '';
  const asked: string[] = [];
  const ctx = makeCtx({
    env: { HOME: home, BRAGDOC_HOME: path.join(home, '.bragdoc'), PATH: process.env.PATH, USER: 'someone-example' },
    homedir: home,
    platform: 'linux',
    out: (s) => (out += s),
    err: (s) => (err += s),
    // nothing installed, and no systemd to ask
    run: async () => ({ code: 1, stdout: '', stderr: 'Failed to connect to bus: No medium found' }),
    proc: async (bin, args) => (asked.push([bin, ...args].join(' ')), { code: 0, stdout: 'Linger=no\n', stderr: '' }),
    probe: async () => ({ kind: 'other' }),
    loopback: async () => {
      throw new TypeError('fetch failed');
    },
  });
  const code = await doctor(ctx, [], { offline: '1', json: '1' }, undefined);
  const doc = JSON.parse(out);
  assert.deepEqual(validate(loadSchema('doctor'), doc), []);
  assert.equal(doc.version, VERSION);
  const byId = Object.fromEntries(doc.checks.map((c: { id: string }) => [c.id, c]));
  for (const id of ['node-engines', 'install-method', 'unit', 'running-version', 'port', 'linger', 'data-home', 'config', 'git', 'update']) assert.ok(byId[id], id);
  assert.equal(byId.update.status, 'skip');
  assert.equal(byId.port.status, 'fail', 'something else holds the port');
  assert.match(byId.port.fix, /--port/);
  assert.equal(byId.linger.status, 'warn');
  assert.equal(byId.linger.fix, 'sudo loginctl enable-linger someone-example');
  assert.deepEqual(asked, ['loginctl show-user someone-example -p Linger']);
  assert.equal(doc.ok, false);
  assert.equal(code, 1, 'a failure is exit 1');
  // the prose went to stderr, the symbols first, a fix under the failure
  assert.match(err, /^✗ Something that isn't BragDoc is answering on port 2724\.\n {4}fix: /m);
  assert.match(err, /^! Lingering is off/m);
  assert.match(err, /^✓ Node /m);
  assert.doesNotMatch(err, /newer version/, '--offline: the skipped check isn\'t printed');
  assert.equal(readNetworkLog(path.join(home, '.bragdoc'), {}).total, 0, 'nothing asked of the network');
});

test("doctor's registry check goes through egress, writes update-check.json, and puts the notice on stderr", async () => {
  const home = dir('bragdoc-doctor-');
  const dataDir = path.join(home, '.bragdoc');
  fs.mkdirSync(dataDir);
  let err = '';
  const ctx = makeCtx({
    env: { HOME: home, BRAGDOC_HOME: dataDir, PATH: process.env.PATH, npm_config_registry: 'http://127.0.0.1:9' },
    homedir: home,
    platform: 'darwin',
    out: () => {},
    err: (s) => (err += s),
    run: async () => ({ code: 113, stdout: '', stderr: 'Could not find service' }),
    probe: async () => ({ kind: 'none' }),
  });
  // nothing at 127.0.0.1:9: a warning, not a failure, and the attempt is in the log
  const checks = await runChecks(ctx, { offline: false, notice: (s) => (err += s) });
  const u = checks.find((c) => c.id === 'update')!;
  assert.equal(u.status, 'warn');
  assert.match(u.message, /Couldn't check for a newer version: couldn't reach the registry/);
  const entries = readNetworkLog(dataDir, {}).entries;
  assert.ok(entries.length >= 1 && entries.every((e) => e.purpose === 'update.registry' && e.host === '127.0.0.1:9'), JSON.stringify(entries));
});
