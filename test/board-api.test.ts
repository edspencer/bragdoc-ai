// The board's HTTP API (PR7), in-process: achievements (paged by week, filters, search, edit with If-Match, archive,
// remove and restore), evidence uploads (type checks, size limit, blob headers), link previews (no network unless
// GitHub is connected), the read-only catalog, Problems, Found's count, and store changes reaching the event bus.
import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Hono } from 'hono';
import type { AchievementCreated, AchievementsPage, AchievementView, EvidenceUploaded, LinkPreview, ServerEvent } from '../shared/api.ts';
import type { Achievement, Evidence } from '../shared/schema/index.ts';
import { createApp } from '../server/index.ts';
import { EventBus } from '../server/events.ts';
import { LinkPreviews } from '../server/link-preview.ts';
import { mondayOf } from '../server/routes/achievements.ts';
import { storeHome, type StoreHome } from './store-fixture.ts';

/** A real 1×1 PNG. */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const PDF = Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n');

let h: StoreHome;
let app: Hono;
let bus: EventBus;
let previews: LinkPreviews;

function setup() {
  h = storeHome();
  bus = new EventBus();
  previews = new LinkPreviews();
  app = createApp({ dataDir: h.home, webDist: null, store: h.store, bus, linkPreviews: previews });
}
afterEach(() => h?.cleanup());

const json = (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) =>
  app.request(path, { method, headers: { 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
const upload = (bytes: Uint8Array, type: string, name?: string) =>
  app.request('/api/evidence', { method: 'POST', headers: { 'content-type': type, ...(name ? { 'x-filename': encodeURIComponent(name) } : {}) }, body: bytes });
const create = async (body: Record<string, unknown>) => {
  const res = await json('POST', '/api/achievements', body);
  assert.ok(res.status === 201 || res.status === 200, `create: ${res.status} ${await res.clone().text()}`);
  return ((await res.json()) as AchievementCreated<Achievement>).achievement;
};

test('mondayOf: weeks start on Monday', () => {
  assert.equal(mondayOf('2026-10-17'), '2026-10-12'); // Saturday
  assert.equal(mondayOf('2026-10-12'), '2026-10-12');
  assert.equal(mondayOf('2026-10-18'), '2026-10-12'); // Sunday
  assert.equal(mondayOf('2026-01-01'), '2025-12-29');
});

test('POST creates (201, file on disk), the same externalKey again returns it (200), and bad bodies are 400s', async () => {
  setup();
  const res = await json('POST', '/api/achievements', { title: 'Shipped the sync engine', body: 'Zero conflicts.', impact: 6 });
  assert.equal(res.status, 201);
  const { achievement: a, created } = (await res.json()) as AchievementCreated<Achievement>;
  assert.equal(created, true);
  assert.equal(a.happenedAt, '2026-10-17');
  assert.match(a.etag!, /^"[0-9a-f]{16}"$/);
  assert.ok(h.exists(`achievements/2026/10/${a.id}.md`));
  assert.match(h.read(`achievements/2026/10/${a.id}.md`), /title: Shipped the sync engine/);

  const pr = { kind: 'github_pr', url: 'https://github.com/acme/app/pull/12', externalKey: 'github_pr:acme/app#12' };
  const first = await create({ title: 'PR twelve', externalKey: pr.externalKey, evidence: [pr] });
  const again = await json('POST', '/api/achievements', { title: 'PR twelve, again', externalKey: pr.externalKey, evidence: [pr] });
  assert.equal(again.status, 200);
  assert.equal(((await again.json()) as AchievementCreated<Achievement>).achievement.id, first.id);

  assert.equal((await json('POST', '/api/achievements', { title: '   ' })).status, 400);
  const unknown = await json('POST', '/api/achievements', { title: 'x', colour: 'red' });
  assert.equal(unknown.status, 400);
  assert.equal(((await unknown.json()) as { error: { code: string } }).error.code, 'invalid');
  const notJson = await app.request('/api/achievements', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{nope' });
  assert.equal(notJson.status, 400);
  // a project that doesn't exist
  assert.equal((await json('POST', '/api/achievements', { title: 'x', projects: ['01JZZZZZZZZZZZZZZZZZZZZZZZ'] })).status, 400);
});

test('a 300-character title is kept whole', async () => {
  setup();
  const title = 'A'.repeat(300);
  const a = await create({ title });
  assert.equal(a.title, title);
  const got = (await (await app.request(`/api/achievements/${a.id}`)).json()) as AchievementView<Achievement>;
  assert.equal(got.title.length, 300);
});

test('GET pages by whole weeks, newest first, with filters and search', async () => {
  setup();
  const days = ['2026-10-16', '2026-10-13', '2026-10-06', '2026-09-30', '2026-09-21', '2026-09-20'];
  const proj = h.services.projects.create({ name: 'Pre-flight', start: '2026-09-01' });
  for (const [i, d] of days.entries()) await create({ title: `Thing ${i} ${i === 3 ? 'kangaroo' : ''}`.trim(), happenedAt: d, ...(i % 2 ? { projects: [proj.id] } : {}) });

  const p1 = (await (await app.request('/api/achievements?weeks=2')).json()) as AchievementsPage<Achievement>;
  assert.deepEqual(p1.items.map((a) => a.happenedAt), ['2026-10-16', '2026-10-13', '2026-10-06']);
  assert.equal(p1.total, 6);
  assert.equal(p1.nextBefore, '2026-10-05');
  const p2 = (await (await app.request(`/api/achievements?weeks=2&before=${p1.nextBefore}`)).json()) as AchievementsPage<Achievement>;
  assert.deepEqual(p2.items.map((a) => a.happenedAt), ['2026-09-30', '2026-09-21']);
  const p3 = (await (await app.request(`/api/achievements?weeks=2&before=${p2.nextBefore}`)).json()) as AchievementsPage<Achievement>;
  assert.deepEqual(p3.items.map((a) => a.happenedAt), ['2026-09-20']);
  assert.equal(p3.nextBefore, null);

  const byProject = (await (await app.request(`/api/achievements?projectId=${proj.id}`)).json()) as AchievementsPage<Achievement>;
  assert.equal(byProject.total, 3);
  const search = (await (await app.request('/api/achievements?q=kangaroo')).json()) as AchievementsPage<Achievement>;
  assert.deepEqual(search.items.map((a) => a.title), ['Thing 3 kangaroo']);
  const none = (await (await app.request('/api/achievements?q=wombat')).json()) as AchievementsPage<Achievement>;
  assert.deepEqual([none.items.length, none.total, none.nextBefore], [0, 0, null]);

  for (const bad of ['weeks=0', 'weeks=500', 'weeks=x', 'before=yesterday', 'minImpact=11', 'colour=red', 'archived=maybe'])
    assert.equal((await app.request(`/api/achievements?${bad}`)).status, 400, bad);
});

test('PATCH edits with If-Match (a stale ETag is a 409); archive hides it from the default list', async () => {
  setup();
  const a = await create({ title: 'Old title' });
  const res = await json('PATCH', `/api/achievements/${a.id}`, { title: 'New title', summary: 'More.', impact: 8, endedAt: '2026-10-20' }, { 'if-match': a.etag! });
  assert.equal(res.status, 200);
  const b = (await res.json()) as AchievementView<Achievement>;
  assert.equal(b.title, 'New title');
  assert.notEqual(b.etag, a.etag);
  const stale = await json('PATCH', `/api/achievements/${a.id}`, { title: 'Lost update' }, { 'if-match': a.etag! });
  assert.equal(stale.status, 409);
  assert.equal(stale.headers.get('etag'), b.etag);
  assert.equal((await json('PATCH', `/api/achievements/${a.id}`, { impact: 0 })).status, 400);
  assert.equal((await json('PATCH', '/api/achievements/01JZZZZZZZZZZZZZZZZZZZZZZZ', { title: 'x' })).status, 404);

  assert.equal((await json('POST', `/api/achievements/${a.id}/archive`, {})).status, 200);
  let list = (await (await app.request('/api/achievements')).json()) as AchievementsPage<Achievement>;
  assert.equal(list.total, 0);
  list = (await (await app.request('/api/achievements?archived=only')).json()) as AchievementsPage<Achievement>;
  assert.equal(list.items[0].archived, true);
  assert.equal((await json('POST', `/api/achievements/${a.id}/unarchive`, {})).status, 200);
  list = (await (await app.request('/api/achievements')).json()) as AchievementsPage<Achievement>;
  assert.equal(list.total, 1);
});

test('remove moves the file to backups/removed/, restore brings it back', async () => {
  setup();
  const a = await create({ title: 'Remove me' });
  const res = await json('POST', `/api/achievements/${a.id}/remove`, {}, { 'if-match': a.etag! });
  assert.equal(res.status, 200);
  const { removedTo } = (await res.json()) as { removedTo: string };
  assert.match(removedTo, /^backups\/removed\//);
  assert.ok(h.exists(removedTo));
  assert.ok(!h.exists(`achievements/2026/10/${a.id}.md`));
  assert.equal((await app.request(`/api/achievements/${a.id}`)).status, 404);
  const back = await json('POST', `/api/achievements/${a.id}/restore`, {});
  assert.equal(back.status, 200);
  assert.ok(h.exists(`achievements/2026/10/${a.id}.md`));
  assert.equal((await json('POST', `/api/achievements/${a.id}/remove`, {}, { 'if-match': '"stale"' })).status, 409);
});

test('uploads: a picture, a PDF and any other file each become the right evidence and file on disk', async () => {
  setup();
  const img = await upload(PNG, 'image/png', 'praise.png');
  assert.equal(img.status, 201);
  const i = (await img.json()) as EvidenceUploaded<Evidence>;
  assert.equal(i.evidence.kind, 'image');
  assert.deepEqual([i.file.mime, i.file.width, i.file.height, i.file.name], ['image/png', 1, 1, 'praise.png']);
  assert.ok(h.exists(`evidence/${i.file.sha256.slice(0, 2)}/${i.file.sha256}.png`));
  assert.ok(h.exists(`evidence/${i.file.sha256.slice(0, 2)}/${i.file.sha256}.yaml`));
  // the same bytes again: stored once
  assert.equal((await upload(PNG, 'image/png', 'again.png')).status, 200);

  const pdf = (await (await upload(PDF, 'application/pdf', 'Q3 review.pdf')).json()) as EvidenceUploaded<Evidence>;
  assert.deepEqual([pdf.evidence.kind, pdf.evidence.title], ['pdf', 'Q3 review.pdf']);

  // a Keynote file: a zip, sent as octet-stream (the browser doesn't know .key), named by its own name
  const zip = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(60, 1)]);
  const key = (await (await upload(zip, 'application/octet-stream', 'all-hands.key')).json()) as EvidenceUploaded<Evidence>;
  assert.deepEqual([key.evidence.kind, key.file.name], ['file', 'all-hands.key']);

  // an achievement carrying all three, as the composer sends it
  const a = await create({ title: 'With evidence', evidence: [i.evidence, pdf.evidence, key.evidence] });
  assert.equal(Object.keys(a.files).length, 3);
  assert.equal(a.files[i.file.sha256].mime, 'image/png');
});

test('uploads: a spoofed picture, a damaged one, an empty file, a CORS-safelisted type and an oversized file are refused', async () => {
  setup();
  const html = Buffer.from('<!doctype html><script>alert(1)</script>');
  const spoof = await upload(html, 'image/png', 'cute.png');
  assert.equal(spoof.status, 415);
  assert.equal(((await spoof.json()) as { error: { code: string } }).error.code, 'type_mismatch');
  assert.equal((await upload(html, 'application/pdf', 'report.pdf')).status, 415);
  const damaged = await upload(PNG.subarray(0, 20), 'image/png', 'broken.png');
  assert.equal(damaged.status, 415);
  assert.equal(((await damaged.json()) as { error: { code: string } }).error.code, 'damaged');
  assert.equal((await upload(new Uint8Array(0), 'image/png', 'empty.png')).status, 400);
  assert.equal((await upload(html, 'text/plain', 'a.txt')).status, 415); // safelisted: a cross-site page could send it
  const big = await upload(new Uint8Array(25 * 1024 * 1024 + 1), 'application/octet-stream', 'huge.bin');
  assert.equal(big.status, 413);
  // nothing was stored by any of them
  assert.equal(h.store.all('evidence').length, 0);
  // the HTML, sent honestly, is a file (served as a download, never as HTML)
  const honest = (await (await upload(html, 'application/octet-stream', 'page.html')).json()) as EvidenceUploaded<Evidence>;
  assert.equal(honest.evidence.kind, 'file');
  const served = await app.request(`/api/evidence/${honest.file.sha256}`);
  assert.equal(served.headers.get('content-type'), 'text/plain');
  assert.match(served.headers.get('content-disposition')!, /^attachment/);
});

test('GET /api/evidence/:sha serves with the blob headers; /thumb is pictures only', async () => {
  setup();
  const i = (await (await upload(PNG, 'image/png', 'p.png')).json()) as EvidenceUploaded<Evidence>;
  const res = await app.request(`/api/evidence/${i.file.sha256}`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'image/png');
  assert.equal(res.headers.get('content-security-policy'), "default-src 'none'; sandbox");
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('cross-origin-resource-policy'), 'same-origin');
  assert.equal(res.headers.get('content-disposition'), null);
  assert.deepEqual(Buffer.from(await res.arrayBuffer()), PNG);
  assert.equal((await app.request(`/api/evidence/${i.file.sha256}`, { headers: { 'if-none-match': res.headers.get('etag')! } })).status, 304);
  assert.equal((await app.request(`/api/evidence/${i.file.sha256}/thumb`)).status, 200);

  const pdf = (await (await upload(PDF, 'application/pdf', 'r.pdf')).json()) as EvidenceUploaded<Evidence>;
  const p = await app.request(`/api/evidence/${pdf.file.sha256}`);
  assert.equal(p.headers.get('content-disposition'), 'attachment; filename="r.pdf"');
  assert.equal((await app.request(`/api/evidence/${pdf.file.sha256}/thumb`)).status, 404);

  assert.equal((await app.request(`/api/evidence/${'0'.repeat(64)}`)).status, 404);
  assert.equal((await app.request('/api/evidence/..%2F..%2Fsecrets.yaml')).status, 404);

  // a hand-edited sidecar can't make a file be served as HTML
  const rel = `evidence/${i.file.sha256.slice(0, 2)}/${i.file.sha256}.yaml`;
  h.put(rel, h.read(rel).replace('mime: image/png', 'mime: text/html'));
  h.store.reloadPath(`${h.home}/${rel}`);
  const evil = await app.request(`/api/evidence/${i.file.sha256}`);
  assert.equal(evil.headers.get('content-type'), 'application/octet-stream');
  assert.match(evil.headers.get('content-disposition')!, /^attachment/);
});

test('link preview: a PR without GitHub connected makes no request and shows owner/repo#n; other links are never fetched', async () => {
  setup();
  let lookups = 0;
  const repo = h.services.repos.create({ remoteUrl: 'git@github.com:Acme/App.git' }).repo;
  const proj = h.services.projects.create({ name: 'App', repoIds: [repo.id] });
  const res = await json('POST', '/api/link-preview', { url: 'https://github.com/acme/app/pull/42/files' });
  const pr = (await res.json()) as Extract<LinkPreview, { kind: 'github_pr' }>;
  assert.equal(pr.kind, 'github_pr');
  assert.deepEqual([pr.repo, pr.number, pr.externalKey, pr.url], ['acme/app', 42, 'github_pr:acme/app#42', 'https://github.com/acme/app/pull/42']);
  assert.equal(pr.title, undefined);
  assert.match(pr.titleNote!, /isn’t connected/);
  assert.equal(pr.repoId, repo.id);
  assert.deepEqual(pr.suggestedProjects, [proj.id]);
  assert.equal(lookups, 0);

  // connected (PR13 registers this): the title comes back
  previews.setGithub(async (ref) => (lookups++, ref.number === 42 ? { title: 'Glove mode' } : null));
  const withTitle = (await (await json('POST', '/api/link-preview', { url: 'https://github.com/acme/app/pull/42' })).json()) as Extract<LinkPreview, { kind: 'github_pr' }>;
  assert.equal(withTitle.title, 'Glove mode');
  const unknown = (await (await json('POST', '/api/link-preview', { url: 'https://github.com/acme/app/pull/7' })).json()) as Extract<LinkPreview, { kind: 'github_pr' }>;
  assert.match(unknown.titleNote!, /doesn’t know/);
  previews.setGithub(async () => {
    throw new Error('rate limited');
  });
  const failed = (await (await json('POST', '/api/link-preview', { url: 'https://github.com/acme/app/pull/42' })).json()) as Extract<LinkPreview, { kind: 'github_pr' }>;
  assert.match(failed.titleNote!, /rate limited/);

  const link = (await (await json('POST', '/api/link-preview', { url: 'https://www.example.com/a/b?c=d' })).json()) as LinkPreview;
  assert.deepEqual(link, { kind: 'url', url: 'https://www.example.com/a/b?c=d', domain: 'example.com' });
  for (const bad of [{ url: 'javascript:alert(1)' }, { url: 'not a url' }, { url: 42 }, {}])
    assert.equal((await json('POST', '/api/link-preview', bad)).status, 400, JSON.stringify(bad));
  // and nothing went through egress
  assert.ok(!h.exists('logs/network.jsonl'));
});

test('a slow GitHub lookup gives up and shows owner/repo#n', async () => {
  const p = new LinkPreviews();
  p.setGithub((_ref, signal) => new Promise((_res, rej) => signal.addEventListener('abort', () => rej(new Error('aborted')))));
  const r = await p.pr({ owner: 'a', repo: 'b', number: 1, fullName: 'a/b', url: '', externalKey: '' }, 20);
  assert.deepEqual(r, { note: 'GitHub took too long to answer.' });
});

test('catalog, Problems and the Found count', async () => {
  setup();
  h.services.projects.create({ name: 'Zeta', start: '2026-01-01' });
  h.services.projects.create({ name: 'Alpha', start: '2026-06-01' });
  h.services.repos.create({ localPath: '/tmp/x/my-app' });
  const projects = (await (await app.request('/api/projects')).json()) as { projects: { id: string; name: string; etag: string; achievements: number }[] };
  assert.deepEqual(projects.projects.map((p) => p.name), ['Alpha', 'Zeta']);
  assert.match(projects.projects[0].etag, /^"[0-9a-f]{16}"$/);
  assert.equal(projects.projects[0].achievements, 0);
  await create({ title: 'In Alpha', projects: [projects.projects[0].id] });
  const again = (await (await app.request('/api/projects')).json()) as { projects: { achievements: number }[] };
  assert.equal(again.projects[0].achievements, 1);
  const repos = (await (await app.request('/api/repos')).json()) as { repos: { name: string; etag: string }[] };
  assert.deepEqual(repos.repos.map((r) => r.name), ['my-app']);
  assert.match(repos.repos[0].etag, /^"/);
  assert.deepEqual(await (await app.request('/api/problems')).json(), { problems: [] });
  h.put('achievements/2026/10/01JC0000000000000000000BAD.md', '---\ntitle: [unclosed\n---\n');
  h.store.reloadPath(`${h.home}/achievements/2026/10/01JC0000000000000000000BAD.md`);
  const problems = (await (await app.request('/api/problems')).json()) as { problems: { code: string; file: string }[] };
  assert.equal(problems.problems.length, 1);
  assert.equal(problems.problems[0].code, 'syntax');
  assert.deepEqual(await (await app.request('/api/found/count')).json(), { pending: 0 });
  h.services.found.add({ source: 'mcp', title: 'Maybe this' });
  assert.deepEqual(await (await app.request('/api/found/count')).json(), { pending: 1 });
});

test('store changes reach the event bus, debounced per type, with problems', async () => {
  setup();
  const seen: ServerEvent[] = [];
  bus.subscribe((e) => seen.push(e));
  const a = await create({ title: 'One' });
  await create({ title: 'Two' });
  bus.flush();
  assert.deepEqual(seen.map((e) => e.type).sort(), ['achievement', 'problems']);
  seen.length = 0;
  // a hand edit (what the watcher reports) is forwarded too
  const rel = `achievements/2026/10/${a.id}.md`;
  h.put(rel, h.read(rel).replace('title: One', 'title: One, edited by hand'));
  h.store.reloadPath(`${h.home}/${rel}`);
  h.services.projects.create({ name: 'P' });
  bus.flush();
  assert.deepEqual(seen.map((e) => e.type).sort(), ['achievement', 'problems', 'project']);
});
