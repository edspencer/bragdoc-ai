// server/mcp/ and /mcp: every tool through the official SDK client (in both protocol eras), against the Hono app in
// process: get_context on an empty and a seeded home, writes with their provenance, idempotency on externalKey,
// mcp.writeTo: found, evidence files (and the ones refused), the resource and its change notifications, the prompts,
// and the security rules on /mcp (the bearer token, rotation, Host, Origin, Fetch Metadata). Adapted from Hallway's
// test/mcp.test.ts.
import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { ConfigStore } from '../server/config.ts';
import { createApp } from '../server/index.ts';
import { agentName } from '../server/mcp/index.ts';
import { Runtime } from '../server/runtime.ts';
import { tmpDir, rmTmp } from './fixture.ts';
import { storeHome } from './store-fixture.ts';

const cleanups: (() => void | Promise<void>)[] = [];
after(async () => {
  for (const c of cleanups.reverse()) await c();
});

const HOST = 'localhost:2724';
/** A 1×1 PNG. */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

type Era = 'legacy' | 'auto';

async function setup({ era = 'legacy' as Era, client: clientHeader = 'claude-code' as string | null, name = 'test-client', writeTo = 'board' as 'board' | 'found' } = {}) {
  const s = storeHome();
  cleanups.push(s.cleanup);
  if (writeTo === 'found') fs.writeFileSync(path.join(s.home, 'config.yaml'), 'mcp:\n  writeTo: found\n');
  const runtime = new Runtime(s.home);
  const config = new ConfigStore(s.home);
  const app = createApp({ dataDir: s.home, store: s.store, runtime, config, webDist: null });
  const fetch = async (url: string | URL | Request, init?: RequestInit) => {
    const req = new Request(url, init);
    const headers = new Headers(req.headers);
    headers.set('host', HOST);
    headers.set('authorization', `Bearer ${runtime.mcpToken()}`);
    if (clientHeader) headers.set('x-bragdoc-client', clientHeader);
    return app.request(new Request(req, { headers }));
  };
  const client = new Client({ name, version: '1' }, era === 'auto' ? { versionNegotiation: { mode: 'auto' } } : {});
  await client.connect(new StreamableHTTPClientTransport(new URL(`http://${HOST}/mcp`), { fetch }));
  cleanups.push(() => client.close());
  const call = async (tool: string, args: Record<string, unknown> = {}) => {
    const r = (await client.callTool({ name: tool, arguments: args })) as { isError?: boolean; content: { type: string; text: string }[]; structuredContent?: Record<string, unknown> };
    return { error: r.isError ? r.content[0]!.text : null, data: (r.structuredContent ?? {}) as Record<string, any> };
  };
  const raw = (body: unknown, headers: Record<string, string> = {}, method = 'POST') =>
    app.request('/mcp', {
      method,
      headers: { host: HOST, 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2025-11-25', ...headers },
      ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
    });
  return { ...s, app, runtime, client, call, raw };
}

/** A small seeded home: a profile, a company, two projects (one linked to a repo), and three achievements. */
function seed(t: Awaited<ReturnType<typeof setup>>, codeDir = '/home/alex/Code/my-app') {
  const { services, clock } = t;
  services.profile.set({ name: 'Alex Marlowe', role: 'Staff Engineer', aliases: ['alexm'] });
  const company = services.companies.create({ name: 'Example Corp' });
  const { repo } = services.repos.create({ localPath: codeDir, remoteUrl: 'git@github.com:example/my-app.git' });
  const importer = services.projects.create({ name: 'Importer', start: '2026-06-01', companyId: company.id, repoIds: [repo.id] });
  const billing = services.projects.create({ name: 'Billing', start: '2026-01-10', status: 'done', end: '2026-05-30' });
  const old = services.achievements.create({ title: 'Migrated invoices to the new ledger', happenedAt: '2026-05-20', projects: [billing.id], impact: 5 }).achievement;
  clock.tick();
  const csv = services.achievements.create({ title: 'Shipped the CSV importer', summary: 'Customers bring their history from a spreadsheet.', happenedAt: '2026-10-01', projects: [importer.id], repos: [repo.id] }).achievement;
  clock.tick();
  const talk = services.achievements.create({ title: 'Gave the onboarding talk', happenedAt: '2026-09-15' }).achievement;
  return { company, repo, importer, billing, old, csv, talk };
}

const TOOLS = [
  'bragdoc_get_context',
  'bragdoc_search_achievements',
  'bragdoc_get_achievement',
  'bragdoc_add_achievement',
  'bragdoc_update_achievement',
  'bragdoc_attach_evidence',
  'bragdoc_add_found',
  'bragdoc_list_projects',
  'bragdoc_upsert_project',
  'bragdoc_list_repos',
  'bragdoc_link_repo',
];

for (const era of ['legacy', 'auto'] as const) {
  describe(`MCP over Streamable HTTP (${era === 'legacy' ? '2025 initialize handshake' : '2026-07-28 per-request'})`, () => {
    test('lists exactly the tools in SPEC R11 (+ get_achievement), none of which deletes anything', async () => {
      const { client } = await setup({ era });
      const tools = (await client.listTools()).tools;
      assert.deepEqual(tools.map((t) => t.name).sort(), [...TOOLS].sort());
      for (const t of tools) {
        assert.match(t.name, /^bragdoc_[a-z]+_[a-z_]+$/);
        assert.doesNotMatch(t.name, /delete|remove/);
        assert.ok((t.description ?? '').length > 60, `${t.name} has a description written for tool search`);
      }
      const ctx = tools.find((t) => t.name === 'bragdoc_get_context')!;
      assert.match(ctx.description!, /^Call this before writing to BragDoc/);
      assert.match(ctx.description!, /search for related achievements before adding/i);
      assert.match(tools.find((t) => t.name === 'bragdoc_add_achievement')!.description!, /Search for related achievements first.*investigate contradictions/);
    });

    test('get_context on an empty home: no profile yet, nothing recorded, the rubric, house style and rules', async () => {
      const { call } = await setup({ era });
      const { error, data } = await call('bragdoc_get_context');
      assert.equal(error, null);
      assert.equal(data.profile, null);
      assert.match(data.firstRun, /has not set up their profile/);
      assert.deepEqual(data.counts, { achievements: 0, projects: 0, repos: 0, foundPending: 0 });
      assert.deepEqual(data.recentAchievements, []);
      assert.equal(data.today, '2026-10-17');
      assert.equal(data.writesGoTo, 'board');
      assert.equal(data.impactScale.length, 10);
      assert.match(data.impactScale[0], /^1 Routine: /);
      assert.ok(data.houseStyle.some((s: string) => /^Title:/.test(s)));
      assert.ok(data.rules.some((s: string) => /^Search before adding/.test(s)));
    });

    test('add_achievement goes on the board as written by the client named in X-BragDoc-Client', async () => {
      const { call, store } = await setup({ era });
      const { error, data } = await call('bragdoc_add_achievement', { title: 'Shipped X', summary: 'It mattered.', happenedAt: '2026-10-16', impact: 4 });
      assert.equal(error, null);
      assert.equal(data.created, true);
      assert.equal(data.writtenTo, 'board');
      const a = store.get('achievement', data.achievement.id)!;
      assert.equal(a.source, 'mcp');
      assert.equal(a.sourceAgent, 'Claude Code');
      assert.equal(a.impact, 4);
      assert.match(data.achievement.file, /^achievements\/2026\/10\/[0-9A-Z]{26}\.md$/);
      assert.match(data.achievement.etag, /^"[0-9a-f]{16}"$/);
    });
  });
}

describe('get_context with data', () => {
  test('profile, active projects with dates, tracked repos, recent achievements newest first', async () => {
    const t = await setup();
    const s = seed(t);
    const { data } = await t.call('bragdoc_get_context');
    assert.equal(data.profile.name, 'Alex Marlowe');
    assert.deepEqual(data.profile.aliases, ['alexm']);
    assert.equal(data.firstRun, undefined);
    assert.deepEqual(
      data.activeProjects.map((p: any) => [p.name, p.start, p.end, p.company?.name ?? null, p.repos.map((r: any) => r.name)]),
      [['Importer', '2026-06-01', null, 'Example Corp', ['example/my-app']]],
    );
    assert.deepEqual(data.otherProjects.map((p: any) => [p.name, p.status]), [['Billing', 'done']]);
    assert.deepEqual(data.repos.map((r: any) => [r.name, r.remoteUrl, r.projects.map((p: any) => p.name)]), [['example/my-app', 'https://github.com/example/my-app', ['Importer']]]);
    assert.deepEqual(data.recentAchievements.map((a: any) => a.title), ['Shipped the CSV importer', 'Gave the onboarding talk', 'Migrated invoices to the new ledger']);
    assert.deepEqual(data.recentAchievements[0].projects, [{ id: s.importer.id, name: 'Importer' }]);
    assert.equal(data.counts.achievements, 3);
  });

  test('repoPath (a directory inside a tracked checkout) focuses on that repo and its projects; project by name', async () => {
    const t = await setup();
    const s = seed(t);
    const { data } = await t.call('bragdoc_get_context', { repoPath: '/home/alex/Code/my-app/server/lib' });
    assert.equal(data.focus.repo.id, s.repo.id);
    assert.deepEqual(data.focus.projects, [{ id: s.importer.id, name: 'Importer' }]);
    assert.deepEqual(data.focus.recent.map((a: any) => a.title), ['Shipped the CSV importer']);
    const elsewhere = (await t.call('bragdoc_get_context', { repoPath: '/home/alex/Code/other' })).data;
    assert.equal(elsewhere.focus.repo, null);
    assert.match(elsewhere.focus.note, /bragdoc_link_repo/);
    const byName = (await t.call('bragdoc_get_context', { project: 'billing' })).data;
    assert.equal(byName.focus.project.id, s.billing.id);
    assert.deepEqual(byName.focus.recent.map((a: any) => a.title), ['Migrated invoices to the new ledger']);
  });

  test('more than 20 achievements: the newest 20; archived ones are left out', async () => {
    const t = await setup();
    for (let i = 1; i <= 25; i++) t.services.achievements.create({ title: `Thing ${i}`, happenedAt: `2026-09-${String(i).padStart(2, '0')}` });
    const hidden = t.services.achievements.create({ title: 'Hidden', happenedAt: '2026-09-30' }).achievement;
    t.services.achievements.archive(hidden.id);
    const { data } = await t.call('bragdoc_get_context');
    assert.equal(data.recentAchievements.length, 20);
    assert.equal(data.recentAchievements[0].title, 'Thing 25');
    assert.equal(data.counts.achievements, 25);
  });
});

describe('writing achievements', () => {
  test('add_achievement is idempotent on externalKey (and on a PR URL given as evidence)', async () => {
    const t = await setup();
    const first = await t.call('bragdoc_add_achievement', { title: 'Shipped the importer', externalKey: 'github_pr:example/my-app#42' });
    assert.equal(first.data.created, true);
    const again = await t.call('bragdoc_add_achievement', { title: 'Shipped the importer (retry)', externalKey: 'github_pr:example/my-app#42' });
    assert.equal(again.error, null);
    assert.equal(again.data.created, false);
    assert.equal(again.data.achievement.id, first.data.achievement.id);
    assert.equal(again.data.achievement.title, 'Shipped the importer');
    // the same PR as evidence, under no key of its own
    const viaPr = await t.call('bragdoc_add_achievement', { title: 'Importer, again', evidence: [{ url: 'https://github.com/example/my-app/pull/42/files' }] });
    assert.equal(viaPr.data.created, false);
    assert.equal(t.store.all('achievement').length, 1);
  });

  test('evidence: a PR URL becomes github_pr with its key, a link stays a url, a quote, and a file is stored', async () => {
    const t = await setup();
    const dir = tmpDir('bragdoc-mcp-files-');
    cleanups.push(() => rmTmp(dir));
    fs.writeFileSync(path.join(dir, 'shot.png'), PNG);
    const { error, data } = await t.call('bragdoc_add_achievement', {
      title: 'Launched the dashboard',
      externalKey: 'ticket:ENG-7',
      evidence: [
        { url: 'https://github.com/example/my-app/pull/7', title: 'The PR' },
        { url: 'https://example.com/launch' },
        { quote: { text: 'This is great work', from: 'Sam', where: '#launch' } },
        { path: path.join(dir, 'shot.png'), title: 'Before and after' },
      ],
    });
    assert.equal(error, null);
    const ev = data.achievement.evidence;
    assert.deepEqual(
      ev.map((e: any) => [e.kind, e.url ?? e.quote?.text ?? e.blob?.slice(0, 4), e.externalKey ?? null]),
      [
        ['github_pr', 'https://github.com/example/my-app/pull/7', 'github_pr:example/my-app#7'],
        ['url', 'https://example.com/launch', null],
        ['quote', 'This is great work', null],
        ['image', ev[3].blob.slice(0, 4), null],
      ],
    );
    assert.equal(t.store.get('evidence', ev[3].blob)?.mime, 'image/png');
  });

  test('bad evidence fails the whole call and writes nothing', async () => {
    const t = await setup();
    for (const [evidence, msg] of [
      [[{ url: 'javascript:alert(1)' }], /only http and https/],
      [[{ url: 'https://example.com', quote: { text: 'x' } }], /exactly one of url, path or quote/],
      [[{}], /exactly one of url, path or quote/],
      [[{ path: 'relative/file.png' }], /isn't an absolute path/],
    ] as const) {
      const r = await t.call('bragdoc_add_achievement', { title: 'Nope', evidence });
      assert.match(r.error ?? '', msg);
    }
    assert.equal(t.store.all('achievement').length, 0);
    // unknown keys are refused, not dropped
    assert.ok((await t.call('bragdoc_add_achievement', { title: 'Typo', summery: 'oops' })).error);
  });

  test('mcp.writeTo: found sends new achievements to Found, idempotently, and files stay where they are', async () => {
    const t = await setup({ writeTo: 'found' });
    const dir = tmpDir('bragdoc-mcp-found-');
    cleanups.push(() => rmTmp(dir));
    fs.writeFileSync(path.join(dir, 'praise.png'), PNG);
    const { error, data } = await t.call('bragdoc_add_achievement', {
      title: 'Fixed the flaky deploy',
      externalKey: 'commit:abc123',
      evidence: [{ path: path.join(dir, 'praise.png') }, { url: 'https://example.com/x' }],
    });
    assert.equal(error, null);
    assert.equal(data.writtenTo, 'found');
    assert.equal(data.created, true);
    assert.equal(t.store.all('achievement').length, 0);
    const f = t.store.get('found', data.candidate.id)!;
    assert.equal(f.source, 'mcp');
    assert.equal(f.sourceAgent, 'Claude Code');
    assert.equal(f.files[0]!.path, path.join(dir, 'praise.png'));
    assert.equal(t.store.all('evidence').length, 0, 'not copied until it is kept');
    assert.equal((await t.call('bragdoc_add_achievement', { title: 'Again', externalKey: 'commit:abc123' })).data.created, false);
    assert.equal(t.store.all('found').length, 1);
    // a bad file is refused at once, not when the user keeps it
    fs.writeFileSync(path.join(dir, 'tool.exe'), Buffer.concat([Buffer.from('MZ'), Buffer.alloc(200)]));
    assert.match((await t.call('bragdoc_add_achievement', { title: 'Exe', evidence: [{ path: path.join(dir, 'tool.exe') }] })).error ?? '', /only images, PDFs/);
  });

  test('update_achievement changes fields, honours an etag, and refuses unknown ids', async () => {
    const t = await setup();
    const s = seed(t);
    const { data } = await t.call('bragdoc_get_achievement', { id: s.talk.id });
    const etag = data.achievement.etag;
    const u = await t.call('bragdoc_update_achievement', { id: s.talk.id, title: 'Gave the onboarding talk to 40 new hires', impact: 3, projects: [s.importer.id], etag });
    assert.equal(u.error, null);
    assert.equal(t.store.get('achievement', s.talk.id)!.title, 'Gave the onboarding talk to 40 new hires');
    const stale = await t.call('bragdoc_update_achievement', { id: s.talk.id, title: 'Stale', etag });
    assert.match(stale.error ?? '', /^Conflict: .*current etag is "/);
    assert.match((await t.call('bragdoc_update_achievement', { id: '01JBZ8Q3W5C2Y6N0R7T4K9M1XE', title: 'x' })).error ?? '', /no achievement/);
    assert.match((await t.call('bragdoc_update_achievement', { id: s.talk.id, projects: ['01JBZ8Q3W5C2Y6N0R7T4K9M1XE'] })).error ?? '', /^Invalid: projects/);
  });

  test('search_achievements: words, filters, newest first without a query', async () => {
    const t = await setup();
    const s = seed(t);
    const r = await t.call('bragdoc_search_achievements', { query: 'spreadsheet' });
    assert.deepEqual(r.data.achievements.map((a: any) => a.id), [s.csv.id]);
    assert.deepEqual((await t.call('bragdoc_search_achievements', {})).data.achievements.map((a: any) => a.title), ['Shipped the CSV importer', 'Gave the onboarding talk', 'Migrated invoices to the new ledger']);
    assert.deepEqual((await t.call('bragdoc_search_achievements', { projectId: s.billing.id })).data.achievements.map((a: any) => a.id), [s.old.id]);
    assert.deepEqual((await t.call('bragdoc_search_achievements', { from: '2026-09-01', limit: 1 })).data, { total: 2, achievements: [(await t.call('bragdoc_search_achievements', { from: '2026-09-01' })).data.achievements[0]] });
  });
});

describe('attach_evidence', () => {
  test('a link, a PR, a quote and a file; what it already has is skipped', async () => {
    const t = await setup();
    const s = seed(t);
    const dir = tmpDir('bragdoc-mcp-attach-');
    cleanups.push(() => rmTmp(dir));
    fs.writeFileSync(path.join(dir, 'notes.md'), '# Launch notes\n');
    const pr = await t.call('bragdoc_attach_evidence', { achievementId: s.csv.id, url: 'https://github.com/example/my-app/pull/9' });
    assert.equal(pr.error, null);
    assert.equal(pr.data.added.length, 1);
    assert.equal((await t.call('bragdoc_attach_evidence', { achievementId: s.csv.id, url: 'https://github.com/example/my-app/pull/9' })).data.alreadyAttached, true);
    await t.call('bragdoc_attach_evidence', { achievementId: s.csv.id, quote: { text: 'Saved us a week' } });
    const file = await t.call('bragdoc_attach_evidence', { achievementId: s.csv.id, path: path.join(dir, 'notes.md'), title: 'Notes' });
    assert.equal(file.error, null);
    assert.equal((await t.call('bragdoc_attach_evidence', { achievementId: s.csv.id, path: path.join(dir, 'notes.md') })).data.alreadyAttached, true);
    const kinds = t.store.get('achievement', s.csv.id)!.evidence.map((e) => e.kind);
    assert.deepEqual(kinds, ['github_pr', 'quote', 'file']);
  });

  test('refuses a directory, a 1 GB file, an .exe, a hidden folder and the data home, storing nothing', async () => {
    const t = await setup();
    const s = seed(t);
    const dir = tmpDir('bragdoc-mcp-refuse-');
    cleanups.push(() => rmTmp(dir));
    const big = path.join(dir, 'huge.mov');
    const fd = fs.openSync(big, 'w');
    fs.ftruncateSync(fd, 1024 ** 3); // sparse: takes no disk
    fs.closeSync(fd);
    fs.writeFileSync(path.join(dir, 'setup.exe'), Buffer.concat([Buffer.from('MZ'), Buffer.alloc(512, 1)]));
    fs.mkdirSync(path.join(dir, '.secret'));
    fs.writeFileSync(path.join(dir, '.secret', 'key.png'), PNG);
    fs.writeFileSync(path.join(t.home, 'runtime.json'), '{}');
    for (const [p, msg] of [
      [dir, /is not a regular file/],
      [big, /1024\.0 MB; the limit is 25 MB/],
      [path.join(dir, 'setup.exe'), /that file is application\/x-msdownload; only images, PDFs, office documents, text files and videos/],
      [path.join(dir, '.secret', 'key.png'), /hidden folder/],
      [path.join(t.home, 'runtime.json'), /inside BragDoc's data folder/],
      [path.join(dir, 'missing.png'), /no file at/],
    ] as const) {
      const r = await t.call('bragdoc_attach_evidence', { achievementId: s.csv.id, path: p });
      assert.match(r.error ?? '', msg, p);
    }
    assert.equal(t.store.all('evidence').length, 0);
    assert.equal(t.store.get('achievement', s.csv.id)!.evidence.length, 0);
    assert.match((await t.call('bragdoc_attach_evidence', { achievementId: '01JBZ8Q3W5C2Y6N0R7T4K9M1XE', url: 'https://example.com' })).error ?? '', /no achievement/);
  });
});

describe('Found, projects and repos', () => {
  test('add_found: a candidate from the agent, never added twice, and a dismissed key stays dismissed', async () => {
    const t = await setup();
    const r = await t.call('bragdoc_add_found', { title: 'Maybe: unblocked the release', why: 'the release thread thanked them', externalKey: 'slack:123' });
    assert.equal(r.error, null);
    assert.equal(r.data.created, true);
    const f = t.store.get('found', r.data.candidate.id)!;
    assert.equal(f.status, 'pending');
    assert.equal(f.sourceAgent, 'Claude Code');
    assert.deepEqual(f.matchedRules, ['Claude Code: the release thread thanked them']);
    t.services.found.dismiss(f.id);
    const again = await t.call('bragdoc_add_found', { title: 'Maybe, again', externalKey: 'slack:123' });
    assert.equal(again.data.created, false);
    assert.equal(again.data.reason, 'dismissed');
    assert.equal(t.store.all('found').length, 1);
  });

  test('upsert_project creates, then updates by name or id; list_projects', async () => {
    const t = await setup();
    const c = await t.call('bragdoc_upsert_project', { name: 'Search revamp', start: '2026-08-01', description: 'Faster search' });
    assert.equal(c.data.created, true);
    const byName = await t.call('bragdoc_upsert_project', { name: 'search REVAMP', status: 'paused' });
    assert.equal(byName.data.created, false);
    assert.equal(byName.data.project.id, c.data.project.id);
    assert.equal(byName.data.project.status, 'paused');
    const byId = await t.call('bragdoc_upsert_project', { id: c.data.project.id, end: '2026-10-01' });
    assert.equal(byId.data.project.end, '2026-10-01');
    assert.match((await t.call('bragdoc_upsert_project', { description: 'no name' })).error ?? '', /needs a name/);
    assert.deepEqual((await t.call('bragdoc_list_projects')).data.projects.map((p: any) => p.name), ['Search revamp']);
  });

  test('link_repo adds a repo once (by path or remote) and links it to a project', async () => {
    const t = await setup();
    const p = (await t.call('bragdoc_upsert_project', { name: 'Importer' })).data.project;
    const a = await t.call('bragdoc_link_repo', { localPath: '/home/alex/Code/my-app', remoteUrl: 'https://github.com/example/my-app.git', projectId: p.id });
    assert.equal(a.error, null);
    assert.equal(a.data.created, true);
    assert.equal(a.data.repo.name, 'example/my-app');
    assert.deepEqual(a.data.project.repos.map((r: any) => r.name), ['example/my-app']);
    const b = await t.call('bragdoc_link_repo', { remoteUrl: 'git@github.com:example/my-app.git' });
    assert.equal(b.data.created, false);
    assert.equal(b.data.repo.id, a.data.repo.id);
    assert.deepEqual(b.data.repo.projects, [{ id: p.id, name: 'Importer' }]);
    assert.match((await t.call('bragdoc_link_repo', { localPath: 'relative' })).error ?? '', /absolute/);
    assert.deepEqual((await t.call('bragdoc_list_repos')).data.repos.map((r: any) => r.name), ['example/my-app']);
  });
});

describe('who wrote it', () => {
  test('agentName: the header, then the client name, known ids get their product name', () => {
    assert.equal(agentName('claude-code'), 'Claude Code');
    assert.equal(agentName(' My Agent '), 'My Agent');
    assert.equal(agentName(null, { name: 'cursor-vscode' }), 'Cursor');
    assert.equal(agentName(null, { name: 'some-client', title: 'Some Client' }), 'Some Client');
    assert.equal(agentName(null, { name: 'some-client' }), 'some-client');
    assert.equal(agentName('\u0000\u0001'), undefined);
    assert.equal(agentName(undefined), undefined);
    assert.equal(agentName('x'.repeat(200))!.length, 60);
  });

  test("without the header: a 2026-era client's own name; a 2025-era client served statelessly: nobody", async () => {
    const modern = await setup({ era: 'auto', client: null, name: 'claude-code' });
    const a = (await modern.call('bragdoc_add_achievement', { title: 'Modern' })).data.achievement;
    assert.equal(modern.store.get('achievement', a.id)!.sourceAgent, 'Claude Code');
    const legacy = await setup({ era: 'legacy', client: null, name: 'claude-code' });
    const b = (await legacy.call('bragdoc_add_achievement', { title: 'Legacy' })).data.achievement;
    assert.equal(legacy.store.get('achievement', b.id)!.sourceAgent, undefined);
    assert.equal(legacy.store.get('achievement', b.id)!.source, 'mcp');
  });
});

describe('the resource and the prompts', () => {
  test('bragdoc://context reads; a write is announced on a listen stream (2026-era)', async () => {
    const t = await setup({ era: 'auto' });
    seed(t);
    const ctx = JSON.parse(((await t.client.readResource({ uri: 'bragdoc://context' })).contents[0] as { text: string }).text);
    assert.equal(ctx.profile.name, 'Alex Marlowe');
    assert.ok((await t.client.listResources()).resources.some((r) => r.uri === 'bragdoc://context'));

    let heard: () => void;
    const updated = new Promise<void>((r) => (heard = r));
    t.client.setNotificationHandler('notifications/resources/updated', (n) => {
      if (n.params.uri === 'bragdoc://context') heard();
    });
    const sub = await t.client.listen({ resourceSubscriptions: ['bragdoc://context'] });
    await t.call('bragdoc_add_achievement', { title: 'Announced' });
    await Promise.race([updated, new Promise((_, rej) => setTimeout(() => rej(new Error('no resources/updated')), 3000))]);
    await sub.close();
  });

  test('log-this and weekly-recap', async () => {
    const { client } = await setup();
    assert.deepEqual((await client.listPrompts()).prompts.map((p) => p.name).sort(), ['log-this', 'weekly-recap']);
    const p = await client.getPrompt({ name: 'log-this', arguments: { what: 'the importer' } });
    const text = (p.messages[0]!.content as { text: string }).text;
    assert.match(text, /^Log this in my BragDoc: the importer/);
    assert.match(text, /bragdoc_get_context/);
    assert.match(text, /bragdoc_search_achievements/);
    const w = await client.getPrompt({ name: 'weekly-recap', arguments: {} });
    assert.match((w.messages[0]!.content as { text: string }).text, /git log/);
  });
});

describe('/mcp security', () => {
  const list = { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} };
  test('no token or a wrong one: 401 with a Bearer challenge, before the body is looked at', async () => {
    const t = await setup();
    const none = await t.raw(list);
    assert.equal(none.status, 401);
    assert.equal(none.headers.get('www-authenticate'), 'Bearer realm="bragdoc"');
    assert.equal(((await none.json()) as { error: { code: string } }).error.code, 'unauthorized');
    assert.equal((await t.raw(list, { authorization: 'Bearer nope' })).status, 401);
    assert.equal((await t.raw(list, { authorization: `Basic ${t.runtime.mcpToken()}` })).status, 401);
    assert.equal((await t.raw(list, { authorization: `Bearer ${t.runtime.mcpToken()}x` })).status, 401);
    assert.equal((await t.raw(list, { authorization: 'Bearer' })).status, 401);
    // a malformed body never gets ahead of the auth decision
    const bad = await t.app.request('/mcp', { method: 'POST', headers: { host: HOST, 'content-type': 'application/json' }, body: '{not json' });
    assert.equal(bad.status, 401);
    // with the token: 200, and the scheme is case-insensitive
    assert.equal((await t.raw(list, { authorization: `bearer ${t.runtime.mcpToken()}` })).status, 200);
  });

  test('rotating the token: the old one is refused at once', async () => {
    const t = await setup();
    const old = t.runtime.mcpToken();
    assert.equal((await t.raw(list, { authorization: `Bearer ${old}` })).status, 200);
    const fresh = t.runtime.rotate();
    assert.notEqual(fresh, old);
    assert.equal((await t.raw(list, { authorization: `Bearer ${old}` })).status, 401);
    assert.equal((await t.raw(list, { authorization: `Bearer ${fresh}` })).status, 200);
  });

  test('hostile headers: foreign Host, foreign or null Origin, cross-site fetches, a form post: refused even with the token', async () => {
    const t = await setup();
    const auth = { authorization: `Bearer ${t.runtime.mcpToken()}` };
    assert.equal((await t.raw(list, { ...auth, host: 'evil.example.com' })).status, 403);
    assert.equal((await t.raw(list, { ...auth, host: 'localhost.evil.example.com:2724' })).status, 403);
    assert.equal((await t.raw(list, { ...auth, origin: 'http://evil.example.com' })).status, 403);
    assert.equal((await t.raw(list, { ...auth, origin: 'http://localhost:9999' })).status, 403, 'another local app');
    assert.equal((await t.raw(list, { ...auth, origin: 'null' })).status, 403);
    assert.equal((await t.raw(list, { ...auth, 'sec-fetch-site': 'cross-site' })).status, 403);
    assert.equal((await t.raw(list, { ...auth, 'sec-fetch-site': 'same-site' })).status, 403);
    assert.equal((await t.raw(list, { ...auth, 'content-type': 'text/plain' })).status, 415);
    // its own origin is fine
    assert.equal((await t.raw(list, { ...auth, origin: `http://${HOST}` })).status, 200);
  });

  test('GET and DELETE: 401 without the token, 405 with it; OAuth discovery is a JSON 404, not the web app', async () => {
    const t = await setup();
    const auth = { authorization: `Bearer ${t.runtime.mcpToken()}` };
    assert.equal((await t.raw(null, {}, 'GET')).status, 401);
    const get = await t.raw(null, auth, 'GET');
    assert.equal(get.status, 405);
    assert.equal(get.headers.get('allow'), 'POST');
    assert.equal((await t.raw(null, auth, 'DELETE')).status, 405);
    for (const p of ['/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/mcp', '/.well-known/oauth-authorization-server']) {
      const r = await t.app.request(p, { headers: { host: HOST } });
      assert.equal(r.status, 404, p);
      assert.match(r.headers.get('content-type') ?? '', /json/);
    }
  });
});
