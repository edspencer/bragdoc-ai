// The project, company and repo routes (PR8): CRUD over HTTP, If-Match, delete-with-detach and its undo (D39), the
// project summary, adding a repo by folder (one git config read, nothing else), and the live change events.
import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Hono } from 'hono';
import type { CompanyEntry, DeleteResponse, ProjectEntry, ProjectSummary, RepoCreateResponse, ServerEvent } from '../shared/api.ts';
import { parseRemotes, readLocalRepo } from '../server/gitremote.ts';
import { EventBus } from '../server/events.ts';
import { createApp } from '../server/index.ts';
import { rmTmp, tmpDir } from './fixture.ts';
import { storeHome, type StoreHome } from './store-fixture.ts';

const ORIGIN = 'http://localhost:2724';

let h: StoreHome;
let app: Hono;
let bus: EventBus;

function req(method: string, p: string, body?: unknown, headers: Record<string, string> = {}) {
  return app.request(`${ORIGIN}${p}`, {
    method,
    headers: { host: 'localhost:2724', origin: ORIGIN, ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
async function json<T>(method: string, p: string, body?: unknown, headers?: Record<string, string>): Promise<{ status: number; body: T }> {
  const r = await req(method, p, body, headers);
  return { status: r.status, body: (await r.json()) as T };
}

/** A git checkout's skeleton: a .git folder with a config naming `remotes`. */
function fakeRepo(dir: string, config: string): string {
  fs.mkdirSync(path.join(dir, '.git'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.git', 'config'), config);
  return dir;
}

beforeEach(() => {
  h = storeHome();
  bus = new EventBus();
  app = createApp({ dataDir: h.home, webDist: null, store: h.store, bus });
});
afterEach(() => h.cleanup());

describe('projects', () => {
  test('create, list, read, edit with If-Match, and a stale edit is a 409', async () => {
    const empty = await json<{ projects: ProjectEntry[] }>('GET', '/api/projects');
    assert.deepEqual(empty.body.projects, []);

    const made = await json<ProjectEntry>('POST', '/api/projects', { name: 'Search relevance v2', start: '2025-11-03', end: null, color: '#ffff00' });
    assert.equal(made.status, 201);
    assert.equal(made.body.color, '#ffff00');
    assert.equal(made.body.end, null);
    assert.equal(made.body.achievements, 0);
    assert.ok(made.body.etag);

    const list = await json<{ projects: ProjectEntry[] }>('GET', '/api/projects');
    assert.equal(list.body.projects.length, 1);

    const edited = await json<ProjectEntry>('PATCH', `/api/projects/${made.body.id}`, { color: '#111111', status: 'done', end: '2026-02-27' }, { 'if-match': made.body.etag });
    assert.equal(edited.status, 200);
    assert.equal(edited.body.color, '#111111');
    assert.notEqual(edited.body.etag, made.body.etag);

    const stale = await json<{ error: { code: string } }>('PATCH', `/api/projects/${made.body.id}`, { name: 'x' }, { 'if-match': made.body.etag });
    assert.equal(stale.status, 409);
    assert.equal(stale.body.error.code, 'conflict');
  });

  test('bad input is a 400 with a sentence; unknown ids are 404s; a 200-character name is fine', async () => {
    assert.equal((await req('POST', '/api/projects', { name: '' })).status, 400);
    assert.equal((await req('POST', '/api/projects', { name: 'x', color: 'red' })).status, 400);
    assert.equal((await req('POST', '/api/projects', { name: 'x', bogus: 1 })).status, 400);
    assert.equal((await req('POST', '/api/projects', { name: 'x', companyId: '01JAAAAAAAAAAAAAAAAAAAAAAA' })).status, 400);
    const notJson = await app.request(`${ORIGIN}/api/projects`, { method: 'POST', headers: { host: 'localhost:2724', 'content-type': 'application/json' }, body: '{' });
    assert.equal(notJson.status, 400);
    assert.equal((await req('GET', '/api/projects/01JAAAAAAAAAAAAAAAAAAAAAAA')).status, 404);
    assert.equal((await req('PATCH', '/api/projects/01JAAAAAAAAAAAAAAAAAAAAAAA', { name: 'x' })).status, 404);
    assert.equal((await req('DELETE', '/api/projects/../config')).status, 404);
    const long = 'A'.repeat(200);
    const made = await json<ProjectEntry>('POST', '/api/projects', { name: long });
    assert.equal(made.status, 201);
    assert.equal(made.body.name, long);
  });

  test('deleting a project untags its achievements; undo restores both', async () => {
    const p = h.services.projects.create({ name: 'Billing migration', start: '2026-01-05' });
    const other = h.services.projects.create({ name: 'Other', start: '2026-01-05' });
    const a1 = h.services.achievements.create({ title: 'Cut over', projects: [p.id, other.id] }).achievement;
    const a2 = h.services.achievements.create({ title: 'Backfill', projects: [p.id] }).achievement;
    const listed = await json<{ projects: ProjectEntry[] }>('GET', '/api/projects');
    assert.equal(listed.body.projects.find((x) => x.id === p.id)!.achievements, 2);

    const del = await json<DeleteResponse>('DELETE', `/api/projects/${p.id}`);
    assert.equal(del.status, 200);
    assert.match(del.body.removedTo, /^backups\/removed\//);
    assert.deepEqual(new Set(del.body.detached.achievements), new Set([a1.id, a2.id]));
    assert.deepEqual(h.store.get('achievement', a1.id)!.projects, [other.id]);
    assert.deepEqual(h.store.get('achievement', a2.id)!.projects, []);
    assert.equal(h.store.problems().filter((x) => x.code === 'dangling').length, 0, 'no dangling references left behind');

    const back = await json<ProjectEntry>('POST', `/api/projects/${p.id}/restore`, { reattach: del.body.detached });
    assert.equal(back.status, 200);
    assert.equal(back.body.achievements, 2);
    assert.ok(h.store.get('achievement', a1.id)!.projects.includes(p.id));
  });

  test('a stale If-Match on delete changes nothing', async () => {
    const p = h.services.projects.create({ name: 'P' });
    const a = h.services.achievements.create({ title: 'A', projects: [p.id] }).achievement;
    const r = await req('DELETE', `/api/projects/${p.id}`, undefined, { 'if-match': '"stale"' });
    assert.equal(r.status, 409);
    assert.ok(h.store.get('project', p.id));
    assert.deepEqual(h.store.get('achievement', a.id)!.projects, [p.id]);
  });

  test('a hand-broken achievement keeps its dangling reference and the delete still succeeds', async () => {
    const p = h.services.projects.create({ name: 'P' });
    const a = h.services.achievements.create({ title: 'A', projects: [p.id] }).achievement;
    const file = h.store.entry('achievement', a.id)!.file;
    h.put(file, h.read(file).replace('title: A', 'title: [unclosed'));
    h.store.reloadPath(path.join(h.home, file));
    const del = await json<DeleteResponse>('DELETE', `/api/projects/${p.id}`);
    assert.equal(del.status, 200);
    assert.deepEqual(del.body.detached.achievements, []);
  });

  test('link and unlink repos; the summary lists the pile, newest first, with evidence counts', async () => {
    const c = h.services.companies.create({ name: 'Altimetry', role: 'Senior Engineer' });
    const r = h.services.repos.create({ remoteUrl: 'https://github.com/example/preflight-web' }).repo;
    const p = h.services.projects.create({ name: 'Pre-flight checklist', start: '2026-09-07', companyId: c.id });
    const linked = await json<ProjectEntry>('POST', `/api/projects/${p.id}/repos`, { link: [r.id] });
    assert.deepEqual(linked.body.repoIds, [r.id]);
    assert.equal((await req('POST', `/api/projects/${p.id}/repos`, {})).status, 400);
    assert.equal((await req('POST', `/api/projects/${p.id}/repos`, { link: ['01JAAAAAAAAAAAAAAAAAAAAAAA'] })).status, 400);

    h.services.achievements.create({ title: 'Older', happenedAt: '2026-09-10', projects: [p.id], evidence: [{ kind: 'url', url: 'https://example.com/a' }] }).achievement;
    h.services.achievements.create({
      title: 'Newer',
      happenedAt: '2026-10-01',
      projects: [p.id],
      evidence: [
        { kind: 'quote', quote: { text: 'Great work' } },
        { kind: 'url', url: 'https://example.com/b' },
      ],
    }).achievement;
    h.services.achievements.create({ title: 'Archived', happenedAt: '2026-10-02', projects: [p.id], archived: true }).achievement;

    const s = await json<ProjectSummary>('GET', `/api/projects/${p.id}/summary`);
    assert.equal(s.status, 200);
    assert.equal(s.body.company?.name, 'Altimetry');
    assert.deepEqual(s.body.repos.map((x) => x.name), ['example/preflight-web']);
    assert.equal(s.body.achievements, 2);
    assert.deepEqual(s.body.pile.map((x) => x.title), ['Newer', 'Older']);
    assert.deepEqual(s.body.evidence, { total: 3, byKind: { url: 2, quote: 1 } });
    assert.deepEqual(s.body.pile[0].evidence, { quote: 1, url: 1 });
    assert.equal(s.body.firstAt, '2026-09-10');
    assert.equal(s.body.lastAt, '2026-10-01');

    const un = await json<ProjectEntry>('POST', `/api/projects/${p.id}/repos`, { unlink: [r.id] });
    assert.deepEqual(un.body.repoIds, []);
  });

  test('a summary with nothing in it', async () => {
    const p = h.services.projects.create({ name: 'Empty' });
    const s = await json<ProjectSummary>('GET', `/api/projects/${p.id}/summary`);
    assert.equal(s.body.achievements, 0);
    assert.deepEqual(s.body.pile, []);
    assert.equal(s.body.firstAt, null);
    assert.equal(s.body.company, null);
  });
});

describe('companies', () => {
  test('CRUD; deleting a company leaves its projects in "No company", and undo puts them back', async () => {
    const made = await json<CompanyEntry>('POST', '/api/companies', { name: 'Quillfeather', role: 'Software Engineer II', start: '2024-03-01', end: '2026-06-30' });
    assert.equal(made.status, 201);
    const edited = await json<CompanyEntry>('PATCH', `/api/companies/${made.body.id}`, { role: null }, { 'if-match': made.body.etag });
    assert.equal(edited.body.role, undefined);
    const list = await json<{ companies: CompanyEntry[] }>('GET', '/api/companies');
    assert.equal(list.body.companies.length, 1);

    const p = h.services.projects.create({ name: 'P', companyId: made.body.id });
    const a = h.services.achievements.create({ title: 'A', companyId: made.body.id }).achievement;
    const del = await json<DeleteResponse>('DELETE', `/api/companies/${made.body.id}`);
    assert.deepEqual(del.body.detached, { achievements: [a.id], projects: [p.id] });
    assert.equal(h.store.get('project', p.id)!.companyId, null);
    assert.equal(h.store.get('achievement', a.id)!.companyId ?? null, null);
    assert.equal((await json<{ companies: CompanyEntry[] }>('GET', '/api/companies')).body.companies.length, 0);

    await json('POST', `/api/companies/${made.body.id}/restore`, { reattach: del.body.detached });
    assert.equal(h.store.get('project', p.id)!.companyId, made.body.id);
    assert.equal(h.store.get('achievement', a.id)!.companyId, made.body.id);
  });

  test('undo never overwrites a company picked meanwhile', async () => {
    const c1 = h.services.companies.create({ name: 'One' });
    const c2 = h.services.companies.create({ name: 'Two' });
    const p = h.services.projects.create({ name: 'P', companyId: c1.id });
    const del = await json<DeleteResponse>('DELETE', `/api/companies/${c1.id}`);
    h.services.projects.update(p.id, { companyId: c2.id });
    await json('POST', `/api/companies/${c1.id}/restore`, { reattach: del.body.detached });
    assert.equal(h.store.get('project', p.id)!.companyId, c2.id);
  });
});

describe('repos', () => {
  let scratch: string;
  beforeEach(() => (scratch = tmpDir('bragdoc-repos-')));
  afterEach(() => rmTmp(scratch));

  test('by folder: reads origin from .git/config; the same folder again is the same repo', async () => {
    const dir = fakeRepo(path.join(scratch, 'my-app'), '[core]\n\tbare = false\n[remote "upstream"]\n\turl = https://github.com/other/my-app\n[remote "origin"]\n\turl = git@github.com:example/my-app.git\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n');
    const r = await json<RepoCreateResponse>('POST', '/api/repos', { localPath: dir });
    assert.equal(r.status, 201);
    assert.equal(r.body.repo.remoteUrl, 'https://github.com/example/my-app');
    assert.equal(r.body.repo.host, 'github.com');
    assert.equal(r.body.repo.name, 'example/my-app');
    assert.equal(r.body.repo.localPath, dir);
    const again = await json<RepoCreateResponse>('POST', '/api/repos', { localPath: dir + '/' });
    assert.equal(again.status, 200);
    assert.equal(again.body.created, false);
    assert.equal(again.body.repo.id, r.body.repo.id);
  });

  test('by folder with no remote: a local repo named after the folder', async () => {
    const dir = fakeRepo(path.join(scratch, 'notes'), '[core]\n\tbare = false\n');
    const r = await json<RepoCreateResponse>('POST', '/api/repos', { localPath: dir });
    assert.equal(r.body.repo.name, 'notes');
    assert.equal(r.body.repo.host, 'local');
    assert.equal(r.body.repo.remoteUrl, undefined);
  });

  test('a remote with credentials in it is never stored as typed', async () => {
    const dir = fakeRepo(path.join(scratch, 'secret'), '[remote "origin"]\n\turl = https://alex:ghp_not_a_real_token@github.com/example/secret.git\n');
    const r = await json<RepoCreateResponse>('POST', '/api/repos', { localPath: dir });
    assert.equal(r.body.repo.remoteUrl, 'https://github.com/example/secret');
    assert.doesNotMatch(h.read(`repos/${r.body.repo.id}.yaml`), /ghp_|alex/);
  });

  test('a linked worktree (.git is a file) reads the main repository\'s config', async () => {
    const main = fakeRepo(path.join(scratch, 'main'), '[remote "origin"]\n\turl = https://github.com/example/main\n');
    const wtGit = path.join(main, '.git', 'worktrees', 'feature');
    fs.mkdirSync(wtGit, { recursive: true });
    fs.writeFileSync(path.join(wtGit, 'commondir'), '../..\n');
    const wt = path.join(scratch, 'feature');
    fs.mkdirSync(wt);
    fs.writeFileSync(path.join(wt, '.git'), `gitdir: ${wtGit}\n`);
    assert.deepEqual(readLocalRepo(wt), { path: wt, remoteUrl: 'https://github.com/example/main' });
  });

  test('unhappy folders: missing, not a git repo, a file, relative', async () => {
    const missing = await json<{ error: { message: string } }>('POST', '/api/repos', { localPath: path.join(scratch, 'nope') });
    assert.equal(missing.status, 400);
    assert.match(missing.body.error.message, /no folder at/);
    fs.mkdirSync(path.join(scratch, 'plain'));
    const plain = await json<{ error: { message: string } }>('POST', '/api/repos', { localPath: path.join(scratch, 'plain') });
    assert.equal(plain.status, 400);
    assert.match(plain.body.error.message, /isn't a git repository/);
    fs.writeFileSync(path.join(scratch, 'f.txt'), 'x');
    assert.match((await json<{ error: { message: string } }>('POST', '/api/repos', { localPath: path.join(scratch, 'f.txt') })).body.error.message, /is a file/);
    assert.match((await json<{ error: { message: string } }>('POST', '/api/repos', { localPath: 'Code/x' })).body.error.message, /full path/);
    assert.equal(h.store.all('repo').length, 0, 'nothing was added');
  });

  test('by remote URL; one we don\'t understand is a 400', async () => {
    const r = await json<RepoCreateResponse>('POST', '/api/repos', { remoteUrl: 'https://github.com/example/site/' });
    assert.equal(r.status, 201);
    assert.equal(r.body.repo.name, 'example/site');
    const bare = await json<RepoCreateResponse>('POST', '/api/repos', { remoteUrl: 'github.com/example/bare' });
    assert.equal(bare.body.repo.remoteUrl, 'https://github.com/example/bare');
    assert.equal((await req('POST', '/api/repos', { remoteUrl: 'not a url' })).status, 400);
    assert.equal((await req('POST', '/api/repos', {})).status, 400);
  });

  test('deleting a repo unlinks it from projects and achievements; undo relinks', async () => {
    const r = h.services.repos.create({ remoteUrl: 'https://github.com/example/a' }).repo;
    const p = h.services.projects.create({ name: 'P', repoIds: [r.id] });
    const a = h.services.achievements.create({ title: 'A', repos: [r.id] }).achievement;
    const del = await json<DeleteResponse>('DELETE', `/api/repos/${r.id}`);
    assert.deepEqual(del.body.detached, { achievements: [a.id], projects: [p.id] });
    assert.deepEqual(h.store.get('project', p.id)!.repoIds, []);
    await json('POST', `/api/repos/${r.id}/restore`, { reattach: del.body.detached });
    assert.deepEqual(h.store.get('project', p.id)!.repoIds, [r.id]);
    assert.deepEqual(h.store.get('achievement', a.id)!.repos, [r.id]);
  });
});

describe('live updates', () => {
  test('a project, company or repo change (ours or a hand edit) is one change event per kind', async () => {
    const seen: ServerEvent[] = [];
    bus.subscribe((e) => seen.push(e));
    await req('POST', '/api/projects', { name: 'One' });
    await req('POST', '/api/projects', { name: 'Two' });
    await req('POST', '/api/companies', { name: 'Co' });
    bus.flush();
    assert.deepEqual(seen.map((e) => e.type).sort(), ['company', 'project']);
  });
});

describe('parseRemotes', () => {
  test('sections, comments, quotes and case', () => {
    assert.deepEqual(parseRemotes('# c\n[Remote "a"]\n  URL = "https://x.example/a" ; trailing\n[branch "main"]\n\turl = nope\n[remote "b"]\n\turl=git@x.example:b.git\n'), [
      { name: 'a', url: 'https://x.example/a' },
      { name: 'b', url: 'git@x.example:b.git' },
    ]);
    assert.deepEqual(parseRemotes(''), []);
  });
});

test('a project can\'t end before it starts, on create or edit', async () => {
  const h2 = storeHome();
  try {
    const app2 = createApp({ dataDir: h2.home, webDist: null, store: h2.store });
    const post = (b: unknown) => app2.request(`${ORIGIN}/api/projects`, { method: 'POST', headers: { host: 'localhost:2724', 'content-type': 'application/json' }, body: JSON.stringify(b) });
    assert.equal((await post({ name: 'x', start: '2026-05-01', end: '2026-04-01' })).status, 400);
    const ok = (await (await post({ name: 'x', start: '2026-05-01', end: '2026-05-01' })).json()) as ProjectEntry;
    const patch = await app2.request(`${ORIGIN}/api/projects/${ok.id}`, { method: 'PATCH', headers: { host: 'localhost:2724', 'content-type': 'application/json' }, body: JSON.stringify({ start: '2026-06-01' }) });
    assert.equal(patch.status, 400);
    assert.match(((await patch.json()) as { error: { message: string } }).error.message, /before it starts/);
  } finally {
    h2.cleanup();
  }
});

test('a project can\'t end before it starts, on create or edit; nor a company', async () => {
  const h2 = storeHome();
  try {
    const app2 = createApp({ dataDir: h2.home, webDist: null, store: h2.store });
    const send = (method: string, p: string, b: unknown) =>
      app2.request(`${ORIGIN}${p}`, { method, headers: { host: 'localhost:2724', 'content-type': 'application/json' }, body: JSON.stringify(b) });
    assert.equal((await send('POST', '/api/projects', { name: 'x', start: '2026-05-01', end: '2026-04-01' })).status, 400);
    const ok = (await (await send('POST', '/api/projects', { name: 'x', start: '2026-05-01', end: '2026-05-01' })).json()) as ProjectEntry;
    const patch = await send('PATCH', `/api/projects/${ok.id}`, { start: '2026-06-01' });
    assert.equal(patch.status, 400);
    assert.match(((await patch.json()) as { error: { message: string } }).error.message, /before it starts/);
    assert.equal((await send('POST', '/api/companies', { name: 'c', start: '2026-05-01', end: '2026-04-01' })).status, 400);
    const c = (await (await send('POST', '/api/companies', { name: 'c', start: '2026-05-01' })).json()) as CompanyEntry;
    assert.equal((await send('PATCH', `/api/companies/${c.id}`, { end: '2026-01-01' })).status, 400);
  } finally {
    h2.cleanup();
  }
});
