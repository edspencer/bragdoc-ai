// Onboarding (SPEC R10, PR16): the bounded folder scan and its hints (server/discover.ts), Welcome's first-run state
// and profile routes, adding the repos you tick, and the example dataset (server/example.ts): it round-trips, adds
// nothing twice, and removing it takes exactly what it added.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { DiscoverAddResponse, DiscoverScanResponse, ExampleChanged, ExampleStatus, ProfileResponse, WelcomeResponse } from '../shared/api.ts';
import { HINTS, SCAN_DEPTH, ago, checkRoot, lastReflogEntry, scan, suggestions, whyOf } from '../server/discover.ts';
import { EXAMPLE_DIR, addExample, loadDataset, removeExample, shiftDate, status, weekShift } from '../server/example.ts';
import { initHome } from '../server/home.ts';
import { createApp } from '../server/index.ts';
import { openStore } from '../server/store/index.ts';
import { evidenceFiles } from '../scripts/gen-example.ts';
import { rmTmp, tmpDir } from './fixture.ts';
import { storeHome } from './store-fixture.ts';

const NOW = new Date('2026-10-17T12:00:00Z');
const DAY = 86_400_000;
const secs = (daysAgo: number) => Math.floor((NOW.getTime() - daysAgo * DAY) / 1000);
const SHA = 'a'.repeat(40);

/** A fake git checkout: .git/config (an optional remote), a reflog line, FETCH_HEAD with an mtime. */
function fakeRepo(dir: string, o: { remote?: string; commitDaysAgo?: number; fetchDaysAgo?: number; pushDaysAgo?: number; checkoutDaysAgo?: number } = {}) {
  const git = path.join(dir, '.git');
  fs.mkdirSync(path.join(git, 'logs', 'refs', 'remotes', 'origin'), { recursive: true });
  fs.writeFileSync(path.join(git, 'HEAD'), 'ref: refs/heads/main\n');
  // HEAD's own mtime is the fallback for a repo with no reflog: make it old, as a clone's is
  const old = new Date(NOW.getTime() - 400 * DAY);
  fs.utimesSync(path.join(git, 'HEAD'), old, old);
  fs.writeFileSync(path.join(git, 'config'), `[core]\n\tbare = false\n${o.remote ? `[remote "origin"]\n\turl = ${o.remote}\n` : ''}`);
  const lines: string[] = [];
  const who = 'Alex Marlowe <alex@example.com>';
  if (o.commitDaysAgo !== undefined) lines.push(`${SHA} ${SHA} ${who} ${secs(o.commitDaysAgo)} +0000\tcommit: a change`);
  if (o.checkoutDaysAgo !== undefined) lines.push(`${SHA} ${SHA} ${who} ${secs(o.checkoutDaysAgo)} +0000\tcheckout: moving from main to topic`);
  if (lines.length) fs.writeFileSync(path.join(git, 'logs', 'HEAD'), lines.join('\n') + '\n');
  if (o.pushDaysAgo !== undefined) fs.writeFileSync(path.join(git, 'logs', 'refs', 'remotes', 'origin', 'main'), `${SHA} ${SHA} ${who} ${secs(o.pushDaysAgo)} +0000\tupdate by push\n`);
  if (o.fetchDaysAgo !== undefined) {
    const f = path.join(git, 'FETCH_HEAD');
    fs.writeFileSync(f, `${SHA}\t\tbranch 'main' of example\n`);
    const t = new Date(NOW.getTime() - o.fetchDaysAgo * DAY);
    fs.utimesSync(f, t, t);
  }
}

function withTree(fn: (root: string) => Promise<void>) {
  return async () => {
    const root = tmpDir('bragdoc-discover-');
    try {
      await fn(root);
    } finally {
      rmTmp(root);
    }
  };
}

const opts = (home: string) => ({ home, now: () => NOW, env: {}, platform: 'linux' as const });

describe('the folder scan', () => {
  test('finds repos at mixed depths up to 4, ranked by recency, each with a why', withTree(async (root) => {
    const code = path.join(root, 'Code');
    fakeRepo(path.join(code, 'pushed'), { remote: 'git@github.com:acme/pushed.git', commitDaysAgo: 5, pushDaysAgo: 2 });
    fakeRepo(path.join(code, 'work', 'committed'), { remote: 'https://github.com/acme/committed', commitDaysAgo: 1 });
    fakeRepo(path.join(code, 'a', 'b', 'pulled'), { commitDaysAgo: 42, fetchDaysAgo: 3 });
    fakeRepo(path.join(code, 'a', 'b', 'c', 'deepest'), { commitDaysAgo: 200 }); // depth 4: found
    fakeRepo(path.join(code, 'a', 'b', 'c', 'd', 'too-deep'), { commitDaysAgo: 0 }); // depth 5: not
    fakeRepo(path.join(code, 'no-remote'), {}); // no reflog at all
    fakeRepo(path.join(code, 'node_modules', 'dep'), { commitDaysAgo: 0 });
    fakeRepo(path.join(code, '.cache', 'hidden'), { commitDaysAgo: 0 });
    fakeRepo(path.join(code, 'outer'), { commitDaysAgo: 10 });
    fakeRepo(path.join(code, 'outer', 'inner'), { commitDaysAgo: 0 }); // inside a repo: not looked for
    const r = await scan({ root: code }, opts(root));
    assert.equal(r.timedOut, false);
    assert.deepEqual(
      r.repos.map((x) => x.name),
      ['committed', 'pushed', 'pulled', 'outer', 'deepest', 'no-remote'],
    );
    const by = Object.fromEntries(r.repos.map((x) => [x.name, x]));
    assert.equal(by.pushed!.why, 'you pushed 2 days ago');
    assert.equal(by['no-remote']!.why, 'last touched over a year ago');
    assert.equal(by.pushed!.remoteUrl, 'https://github.com/acme/pushed');
    assert.equal(by.committed!.why, 'you committed yesterday');
    assert.equal(by.pulled!.why, 'fetched 3 days ago; your last commit was 6 weeks ago');
    assert.equal(by['no-remote']!.remoteUrl, null);
    assert.deepEqual(by.pushed!.via, ['folder']);
    assert.equal(SCAN_DEPTH, 4);
  }));

  test('a symlink loop ends, a link inside is listed once, and nothing outside the folder is listed', withTree(async (root) => {
    const code = path.join(root, 'Code');
    fakeRepo(path.join(code, 'real', 'app'), { commitDaysAgo: 1 });
    fs.symlinkSync(code, path.join(code, 'real', 'loop')); // Code/real/loop → Code
    fs.symlinkSync(path.join(code, 'real'), path.join(code, 'alias')); // a second way in
    fakeRepo(path.join(root, 'elsewhere', 'secret'), { commitDaysAgo: 0 });
    fs.symlinkSync(path.join(root, 'elsewhere'), path.join(code, 'out')); // points outside
    fs.symlinkSync(path.join(root, 'nowhere'), path.join(code, 'dangling'));
    const r = await scan({ root: code }, opts(root));
    assert.deepEqual(r.repos.map((x) => x.name), ['app']);
  }));

  test('the time box holds on a huge folder: partial results and timedOut', withTree(async (root) => {
    const code = path.join(root, 'huge');
    for (let i = 0; i < 5000; i++) fs.mkdirSync(path.join(code, `d${i}`, 'x'), { recursive: true });
    fakeRepo(path.join(code, 'd1'), { commitDaysAgo: 1 });
    const t0 = Date.now();
    const r = await scan({ root: code }, { ...opts(root), now: () => new Date(), timeMs: 150 });
    assert.ok(Date.now() - t0 < 2000, `took ${Date.now() - t0} ms`);
    assert.equal(r.timedOut, true);
    assert.ok(r.looked > 0 && r.looked < 10001);
  }));

  test('a folder that can’t be scanned is a clear error, before anything is read', withTree(async (root) => {
    fs.writeFileSync(path.join(root, 'file.txt'), 'x');
    const code = (p: string) => {
      try {
        checkRoot(p, root);
        return 'ok';
      } catch (e) {
        return (e as { code: string }).code;
      }
    };
    assert.equal(code(path.join(root, 'nope')), 'no_such_folder');
    assert.equal(code(path.join(root, 'file.txt')), 'not_a_folder');
    assert.equal(code('Code'), 'not_absolute');
    assert.equal(code(''), 'not_absolute');
    assert.equal(code('/'), 'too_broad');
    assert.equal(code('~'), 'ok');
    if (process.getuid?.() !== 0) {
      fs.mkdirSync(path.join(root, 'locked'), { mode: 0o000 });
      assert.equal(code(path.join(root, 'locked')), 'unreadable');
      fs.chmodSync(path.join(root, 'locked'), 0o700);
    }
  }));

  test('suggestions list the usual folders that exist, and hint sources by a look at names only', withTree(async (root) => {
    fs.mkdirSync(path.join(root, 'Code'));
    fs.mkdirSync(path.join(root, 'work'));
    fs.writeFileSync(path.join(root, 'src'), 'a file, not a folder');
    const s = suggestions(opts(root));
    assert.deepEqual(s.folders, ['~/Code', '~/work']);
    assert.deepEqual(
      s.hints.map((h) => [h.id, h.available]),
      [
        ['vscode', false],
        ['jetbrains', false],
        ['claude', false],
      ],
    );
  }));

  test('hints: only the ones asked for are read, and only paths that are repos come back', withTree(async (root) => {
    fakeRepo(path.join(root, 'proj', 'one'), { commitDaysAgo: 2 });
    fakeRepo(path.join(root, 'proj', 'two'), { commitDaysAgo: 9 });
    fs.mkdirSync(path.join(root, 'proj', 'not-a-repo'));
    const storage = path.join(root, '.config', 'Code', 'User', 'globalStorage');
    fs.mkdirSync(storage, { recursive: true });
    fs.writeFileSync(path.join(storage, 'storage.json'), JSON.stringify({ windowsState: { lastActiveWindow: { folder: `file://${path.join(root, 'proj', 'one')}` } }, x: [`file://${path.join(root, 'proj', 'not-a-repo')}`] }));
    const jb = path.join(root, '.config', 'JetBrains', 'IdeaIC2026.1', 'options');
    fs.mkdirSync(jb, { recursive: true });
    fs.writeFileSync(path.join(jb, 'recentProjects.xml'), `<application><component><option name="additionalInfo"><map><entry key="$USER_HOME$/proj/two"><value/></entry><entry key="$USER_HOME$/proj/one"/></map></option></component></application>`);
    const claude = path.join(root, '.claude', 'projects', '-proj-two');
    fs.mkdirSync(claude, { recursive: true });
    fs.writeFileSync(path.join(claude, 's.jsonl'), `{"type":"user","cwd":${JSON.stringify(path.join(root, 'proj', 'two'))},"message":"private words"}\n`);
    const o = { ...opts(root), env: { XDG_CONFIG_HOME: path.join(root, '.config') } };
    assert.deepEqual(suggestions(o).hints.map((h) => h.available), [true, true, true]);
    const none = await scan({ hints: [] }, o);
    assert.equal(none.repos.length, 0);
    const vs = await scan({ hints: ['vscode'] }, o);
    assert.deepEqual(vs.repos.map((r) => [r.name, r.via]), [['one', ['vscode']]]);
    const all = await scan({ hints: ['vscode', 'jetbrains', 'claude'] }, o);
    assert.deepEqual(all.repos.map((r) => [r.name, r.via]), [
      ['one', ['vscode', 'jetbrains']],
      ['two', ['jetbrains', 'claude']],
    ]);
    // folder + hint: listed once
    const both = await scan({ root: path.join(root, 'proj'), hints: ['claude'] }, o);
    assert.deepEqual(both.repos.map((r) => [r.name, r.via]), [['one', ['folder']], ['two', ['folder', 'claude']]]);
    assert.equal(HINTS.length, 3);
  }));

  test('the folder named may be a repo itself: listed, and still looked through', withTree(async (root) => {
    fakeRepo(root, { commitDaysAgo: 30 }); // dotfiles in ~
    fakeRepo(path.join(root, 'Code', 'app'), { commitDaysAgo: 1 });
    const r = await scan({ root: '~' }, opts(root));
    assert.deepEqual(r.repos.map((x) => x.path), ['~/Code/app', '~']);
  }));

  test('a .git that is a symlink is listed but not followed; a symlinked root is scanned as its target', withTree(async (root) => {
    fakeRepo(path.join(root, 'outside', 'real'), { commitDaysAgo: 0, remote: 'https://github.com/acme/secret' });
    fs.mkdirSync(path.join(root, 'Code', 'linked'), { recursive: true });
    fs.symlinkSync(path.join(root, 'outside', 'real', '.git'), path.join(root, 'Code', 'linked', '.git'));
    fs.symlinkSync(path.join(root, 'Code'), path.join(root, 'CodeLink'));
    const r = await scan({ root: '~/CodeLink' }, opts(root));
    assert.equal(r.root, '~/Code');
    assert.deepEqual(r.repos.map((x) => [x.name, x.remoteUrl, x.linked, x.lastActivity]), [['linked', null, true, null]]);
  }));

  test('on macOS, scanning home skips the folders the OS guards with a prompt, unless you name one', withTree(async (root) => {
    fakeRepo(path.join(root, 'Documents', 'thesis'), { commitDaysAgo: 1 });
    fakeRepo(path.join(root, 'Code', 'app'), { commitDaysAgo: 1 });
    const mac = { ...opts(root), platform: 'darwin' as const };
    assert.deepEqual((await scan({ root: '~' }, mac)).repos.map((x) => x.name), ['app']);
    assert.deepEqual((await scan({ root: '~/Documents' }, mac)).repos.map((x) => x.name), ['thesis']);
    assert.deepEqual((await scan({ root: '~' }, opts(root))).repos.map((x) => x.name).sort(), ['app', 'thesis']);
  }));

  test('one deadline covers reading the repos too: what it runs out of time for is listed, unread', withTree(async (root) => {
    for (let i = 0; i < 30; i++) fakeRepo(path.join(root, 'Code', `r${i}`), { commitDaysAgo: i });
    let t = NOW.getTime();
    // each look at the clock moves it on 10 ms: the 1 s budget runs out part-way through
    const r = await scan({ root: '~/Code' }, { ...opts(root), now: () => new Date((t += 10)), timeMs: 1000 });
    assert.equal(r.repos.length, 30);
    assert.equal(r.timedOut, true);
    assert.ok(r.repos.some((x) => x.why === 'not looked at: out of time'));
    assert.ok(r.repos.some((x) => x.why.startsWith('you committed')));
  }));

  test('a folder that eats the time box still leaves time for the hints you ticked', withTree(async (root) => {
    fakeRepo(path.join(root, 'side'), { commitDaysAgo: 1 });
    const storage = path.join(root, '.config', 'Code', 'User', 'globalStorage');
    fs.mkdirSync(storage, { recursive: true });
    fs.writeFileSync(path.join(storage, 'storage.json'), JSON.stringify({ w: `file://${path.join(root, 'side')}` }));
    for (let i = 0; i < 300; i++) fs.mkdirSync(path.join(root, 'big', `d${i}`, 'x'), { recursive: true });
    let t = NOW.getTime();
    const r = await scan({ root: '~/big', hints: ['vscode'] }, { ...opts(root), env: { XDG_CONFIG_HOME: path.join(root, '.config') }, now: () => new Date((t += 5)), timeMs: 500 });
    assert.equal(r.timedOut, true);
    assert.deepEqual(r.repos.map((x) => x.name), ['side']);
  }));

  test('a hint naming a folder inside a repo counts as that repo', withTree(async (root) => {
    fakeRepo(path.join(root, 'mono'), { commitDaysAgo: 2 });
    fs.mkdirSync(path.join(root, 'mono', 'packages', 'web'), { recursive: true });
    const storage = path.join(root, '.config', 'Code', 'User', 'globalStorage');
    fs.mkdirSync(storage, { recursive: true });
    fs.writeFileSync(path.join(storage, 'storage.json'), JSON.stringify({ w: `file://${path.join(root, 'mono', 'packages', 'web')}`, h: `file://${root}` }));
    const r = await scan({ hints: ['vscode'] }, { ...opts(root), env: { XDG_CONFIG_HOME: path.join(root, '.config') } });
    assert.deepEqual(r.repos.map((x) => x.name), ['mono']);
  }));

  test('reflogs and words', () => {
    assert.deepEqual(lastReflogEntry(`${SHA} ${SHA} A <a@b> 1700000000 +0100\tcommit: x\n`), { at: new Date(1700000000_000), message: 'commit: x' });
    assert.equal(lastReflogEntry('garbage'), null);
    assert.equal(ago(new Date(NOW.getTime() - 3 * DAY), NOW), '3 days ago');
    assert.equal(ago(new Date(NOW.getTime() - 400 * DAY), NOW), 'over a year ago');
    assert.equal(whyOf({ commit: null, latest: null }, NOW), 'no history to go on');
  });
});

describe('Welcome, profile and adding repos over HTTP', () => {
  const withApp = (fn: (app: ReturnType<typeof createApp>, dir: string, root: string) => Promise<void>) => async () => {
    const root = tmpDir('bragdoc-welcome-');
    const dir = path.join(root, '.bragdoc');
    try {
      initHome(dir);
      await fn(createApp({ dataDir: dir, webDist: null }), dir, root);
    } finally {
      rmTmp(root);
    }
  };
  const send = (method: string, body: unknown = {}): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  test('a fresh home is a first run; skipping ends it, in config.yaml', withApp(async (app, dir) => {
    let w = (await (await app.request('/api/welcome')).json()) as WelcomeResponse;
    assert.equal(w.firstRun, true);
    assert.equal(w.legacyCli, false);
    w = (await (await app.request('/api/welcome/skip', send('POST'))).json()) as WelcomeResponse;
    assert.deepEqual([w.firstRun, w.skipped], [false, true]);
    assert.match(fs.readFileSync(path.join(dir, 'config.yaml'), 'utf8'), /^welcome:\n {2}skipped: true {3}#/m);
    w = (await (await app.request('/api/welcome/skip', send('POST', { skipped: false }))).json()) as WelcomeResponse;
    assert.equal(w.firstRun, true);
    // a broken config.yaml: refused, nothing written
    fs.writeFileSync(path.join(dir, 'config.yaml'), 'welcome: [');
    const r = await app.request('/api/welcome/skip', send('POST'));
    assert.equal(r.status, 409);
    assert.equal(fs.readFileSync(path.join(dir, 'config.yaml'), 'utf8'), 'welcome: [');
  }));

  test('the profile: the first write needs a name; then it is no longer a first run', withApp(async (app) => {
    let p = (await (await app.request('/api/profile')).json()) as ProfileResponse;
    assert.deepEqual(p, { profile: null, etag: null });
    assert.equal((await app.request('/api/profile', send('PUT', { role: 'Engineer' }))).status, 400);
    const r = await app.request('/api/profile', send('PUT', { name: 'Alex Marlowe', aliases: ['@alex', 'Alex M'], githubLogin: 'amarlowe' }));
    assert.equal(r.status, 200);
    p = (await r.json()) as ProfileResponse;
    assert.equal((p.profile as { name: string }).name, 'Alex Marlowe');
    assert.ok(p.etag);
    const w = (await (await app.request('/api/welcome')).json()) as WelcomeResponse;
    assert.deepEqual([w.firstRun, w.hasProfile], [false, true]);
    // a stale If-Match is a conflict
    const stale = await app.request('/api/profile', { ...send('PUT', { role: 'x' }), headers: { 'Content-Type': 'application/json', 'If-Match': '"nope"' } });
    assert.equal(stale.status, 409);
  }));

  test('the old CLI’s files moved aside: the import offer shows', withApp(async (app, dir) => {
    fs.mkdirSync(path.join(dir, 'legacy-cli'));
    assert.equal(((await (await app.request('/api/welcome')).json()) as WelcomeResponse).legacyCli, true);
  }));

  test('scan marks repos you already have; add saves only what you ticked, with a project if you like', withApp(async (app, _dir, root) => {
    const code = path.join(root, 'Code');
    fakeRepo(path.join(code, 'one'), { remote: 'git@github.com:acme/one.git', commitDaysAgo: 1 });
    fakeRepo(path.join(code, 'two'), { commitDaysAgo: 2 });
    fakeRepo(path.join(code, 'three'), { commitDaysAgo: 3 });
    assert.equal((await app.request('/api/discover/scan', send('POST', {}))).status, 400);
    const bad = await app.request('/api/discover/scan', send('POST', { root: path.join(root, 'missing') }));
    assert.equal(bad.status, 400);
    assert.equal(((await bad.json()) as { error: { code: string } }).error.code, 'no_such_folder');
    let s = (await (await app.request('/api/discover/scan', send('POST', { root: code }))).json()) as DiscoverScanResponse;
    assert.equal(s.repos.length, 3);
    assert.ok(s.repos.every((r) => !r.known));
    // nothing stored by a scan
    assert.deepEqual(((await (await app.request('/api/repos')).json()) as { repos: unknown[] }).repos, []);
    const add = (await (
      await app.request('/api/discover/add', send('POST', { repos: [{ path: path.join(code, 'one'), project: { name: 'One' } }, { path: path.join(code, 'two') }, { path: path.join(root, 'not-here') }] }))
    ).json()) as DiscoverAddResponse;
    assert.equal(add.results.length, 3);
    assert.ok('repo' in add.results[0]! && add.results[0].repo.remoteUrl === 'https://github.com/acme/one' && add.results[0].projectId);
    assert.ok('repo' in add.results[1]! && add.results[1].projectId === null);
    assert.ok('error' in add.results[2]!);
    const repos = ((await (await app.request('/api/repos')).json()) as { repos: { name: string }[] }).repos.map((r) => r.name).sort();
    assert.deepEqual(repos, ['acme/one', 'two']);
    const projects = ((await (await app.request('/api/projects')).json()) as { projects: { name: string; repoIds: string[] }[] }).projects;
    assert.deepEqual(projects.map((p) => [p.name, p.repoIds.length]), [['One', 1]]);
    s = (await (await app.request('/api/discover/scan', send('POST', { root: code }))).json()) as DiscoverScanResponse;
    assert.deepEqual(s.repos.map((r) => [r.name, r.known]), [['one', true], ['two', true], ['three', false]]);
    // adding again: the same repo, not a second one; a name is always a new project, an id an existing one
    const again = (await (await app.request('/api/discover/add', send('POST', { repos: [{ path: path.join(code, 'two'), project: { name: 'One' } }] }))).json()) as DiscoverAddResponse;
    assert.ok('created' in again.results[0]! && again.results[0].created === false);
    assert.equal(((await (await app.request('/api/projects')).json()) as { projects: unknown[] }).projects.length, 2);
    const firstId = 'repo' in add.results[0]! ? add.results[0].projectId! : '';
    const linked = (await (await app.request('/api/discover/add', send('POST', { repos: [{ path: path.join(code, 'three'), project: { id: firstId } }] }))).json()) as DiscoverAddResponse;
    assert.ok('projectId' in linked.results[0]! && linked.results[0].projectId === firstId);
  }));
});

describe('example data', () => {
  test('the shipped dataset is valid, its files exist, and the generator makes the same bytes', () => {
    const d = loadDataset();
    assert.ok(d.achievements.length >= 30);
    const files = evidenceFiles();
    const named = new Set(d.achievements.flatMap((a) => a.evidence.flatMap((e) => (e.kind === 'file' ? [e.file] : []))));
    for (const f of named) assert.ok(fs.existsSync(path.join(EXAMPLE_DIR, f)), f);
    assert.deepEqual([...named].map((f) => path.basename(f)).sort(), Object.keys(files).sort());
    for (const [name, bytes] of Object.entries(files)) assert.ok(fs.readFileSync(path.join(EXAMPLE_DIR, 'evidence', name)).equals(bytes), `${name} differs: run npm run gen:example`);
    // invented owners only: never a real account's name (D58)
    for (const r of d.repos) assert.match(r.remoteUrl, /^https:\/\/github\.com\/(altimetry|quillfeather)-example\//);
    for (const a of d.achievements) for (const e of a.evidence) if (e.kind === 'url') assert.match(new URL(e.url).hostname, /\.example$/);
  });

  test('dates move by whole weeks, so the newest is in the last 7 days', () => {
    assert.equal(weekShift('2026-10-16', '2026-10-16'), 0);
    assert.equal(weekShift('2026-10-16', '2026-10-22'), 0);
    assert.equal(weekShift('2026-10-16', '2026-10-23'), 7);
    assert.equal(weekShift('2026-10-16', '2027-03-01'), 133);
    assert.equal(shiftDate('2026-10-16', 133), '2027-02-26');
  });

  test('adding round-trips: everything marked, nothing twice, and removing takes exactly that', async () => {
    const h = storeHome();
    try {
      const { store, services } = h;
      // some of your own first, one of them on a project you'll tag example data with
      const mine = services.projects.create({ name: 'My own project' });
      const own = services.achievements.create({ title: 'Mine', projects: [mine.id] }).achievement;
      const added = await addExample(store, services, { asOf: '2026-10-17' });
      const d = loadDataset();
      assert.deepEqual(added, { achievements: d.achievements.length, projects: d.projects.length, companies: d.companies.length, repos: d.repos.length });
      assert.deepEqual(status(store).counts, added);
      // deterministic: the same titles and dates every time for the same day
      const newest = store.all('achievement').filter((a) => a.example).sort((a, b) => b.happenedAt.localeCompare(a.happenedAt))[0]!;
      assert.equal(newest.title, 'Demoed offline sync at the company all-hands');
      assert.equal(newest.happenedAt, '2026-10-15');
      assert.ok(store.all('repo').every((r) => !r.example || r.tracked === false));
      const pic = store.all('achievement').find((a) => a.title === 'Billing cutover with zero customer-facing errors')!;
      assert.deepEqual(pic.evidence.map((e) => e.kind), ['image', 'github_pr']);
      assert.equal(pic.evidence[1]!.externalKey, 'github_pr:quillfeather-example/billing-core#512');
      // again: nothing new
      assert.deepEqual(await addExample(store, services), { achievements: 0, projects: 0, companies: 0, repos: 0 });
      // you tag your own achievement with an example project, and edit an example one
      const exProject = store.all('project').find((p) => p.example)!;
      services.achievements.update(own.id, { projects: [mine.id, exProject.id] });
      const removed = removeExample(store, services);
      assert.deepEqual({ ...removed, skipped: undefined }, { ...added, skipped: undefined });
      assert.deepEqual(status(store), { present: false, counts: { achievements: 0, projects: 0, companies: 0, repos: 0 } });
      // yours are untouched (only the example project's reference taken off), and nothing dangles
      assert.deepEqual(store.get('achievement', own.id)!.projects, [mine.id]);
      assert.ok(store.get('project', mine.id));
      assert.deepEqual(store.problems(), []);
      // the files went to backups/removed/, nothing unlinked
      assert.ok(fs.readdirSync(path.join(h.home, 'backups', 'removed')).length > 0);
      // and it can come back
      assert.equal((await addExample(store, services, { asOf: '2026-10-17' })).achievements, d.achievements.length);
    } finally {
      h.cleanup();
    }
  });

  test('removing while an add runs is refused; your entries on an example repo or company lose only that reference', async () => {
    const h = storeHome();
    try {
      const { store, services } = h;
      const adding = addExample(store, services, { asOf: '2026-10-17' });
      assert.throws(() => removeExample(store, services), /still being added/);
      await adding;
      const exRepo = store.all('repo').find((r) => r.example)!;
      const exCompany = store.all('company').find((c) => c.example)!;
      const mine = services.achievements.create({ title: 'Mine', repos: [exRepo.id], companyId: exCompany.id }).achievement;
      const myProject = services.projects.create({ name: 'Mine too', companyId: exCompany.id, repoIds: [exRepo.id] });
      removeExample(store, services);
      assert.deepEqual(store.get('achievement', mine.id)!.repos, []);
      assert.equal(store.get('achievement', mine.id)!.companyId ?? null, null);
      assert.deepEqual([store.get('project', myProject.id)!.companyId, store.get('project', myProject.id)!.repoIds], [null, []]);
      assert.deepEqual(store.problems(), []);
    } finally {
      h.cleanup();
    }
  });

  test('over HTTP: status, add, remove; a second add while one runs waits for it', async () => {
    const root = tmpDir('bragdoc-example-');
    const dir = path.join(root, '.bragdoc');
    try {
      initHome(dir);
      const store = openStore(dir);
      const app = createApp({ dataDir: dir, webDist: null, store });
      const send = (p: string, body: unknown = {}) => app.request(p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      assert.deepEqual(((await (await app.request('/api/example')).json()) as ExampleStatus).present, false);
      assert.equal((await send('/api/example', { asOf: 'tomorrow' })).status, 400);
      const [a, b] = await Promise.all([send('/api/example'), send('/api/example')]);
      const [ra, rb] = (await Promise.all([a.json(), b.json()])) as ExampleChanged[];
      assert.equal(ra!.changed.achievements + rb!.changed.achievements, loadDataset().achievements.length);
      assert.equal(ra!.status.present, true);
      const r = (await (await send('/api/example/remove')).json()) as ExampleChanged;
      assert.equal(r.status.present, false);
      assert.equal(r.changed.achievements, loadDataset().achievements.length);
    } finally {
      rmTmp(root);
    }
  });
});
