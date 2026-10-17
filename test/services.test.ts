// The services: what HTTP and MCP call. Achievements (CRUD, filters, search, idempotency), projects/companies/repos,
// profile, and Found's lifecycle (add idempotently, keep, merge, dismiss, undo).
import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { relPathFor } from '../server/store/files.ts';
import { ConflictError, ValidationError } from '../server/store/index.ts';
import { normalizeRemote } from '../server/services/catalog.ts';
import * as servicesModule from '../server/services/index.ts';
const require_services = () => servicesModule;
import { storeHome, type StoreHome } from './store-fixture.ts';

let h: StoreHome;
afterEach(() => h?.cleanup());

// a 1×1 PNG
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082', 'hex');

test('achievements: create fills defaults, files under the id month, and keeps the body', () => {
  h = storeHome();
  const { achievement: a, created } = h.services.achievements.create({ title: 'Cut build time in half', body: 'From 20 to 10 minutes.' });
  assert.equal(created, true);
  assert.equal(a.happenedAt, '2026-10-17');
  assert.equal(a.source, 'manual');
  assert.equal(a.archived, false);
  assert.equal(a.createdAt, '2026-10-17T09:00:00.000Z');
  const rel = relPathFor('achievement', a.id);
  assert.match(rel, new RegExp(`^achievements/2026/10/${a.id}\\.md$`));
  assert.match(h.read(rel), /^---\nschemaVersion: 1\nid: .*\ntitle: Cut build time in half\n[\s\S]*---\nFrom 20 to 10 minutes\.\n$/);
});

test('achievements: an importer\'s createdAt picks the id month; legacyId and externalKey make create idempotent', () => {
  h = storeHome();
  const a = h.services.achievements.create({ title: 'Old win', createdAt: '2024-03-02T10:00:00Z', legacyId: 'uuid-1', source: 'import' }).achievement;
  assert.match(relPathFor('achievement', a.id), /^achievements\/2024\/03\//);
  assert.equal(h.services.achievements.create({ title: 'Old win again', legacyId: 'uuid-1' }).created, false);
  const b = h.services.achievements.create({ title: 'PR', externalKey: 'github_pr:o/r#1' });
  const again = h.services.achievements.create({ title: 'PR (dup)', externalKey: 'github_pr:o/r#1' });
  assert.equal(again.created, false);
  assert.equal(again.achievement.id, b.achievement.id);
  assert.equal(h.store.all('achievement').length, 2);
});

test('achievements: inputs are validated, and unknown ids refused', () => {
  h = storeHome();
  assert.throws(() => h.services.achievements.create({ title: '' }), ValidationError);
  assert.throws(() => h.services.achievements.create({ title: 'x', impact: 11 }), ValidationError);
  assert.throws(() => h.services.achievements.create({ title: 'x', surprise: true }), /unrecognized key|surprise/i);
  assert.throws(() => h.services.achievements.create({ title: 'x', projects: ['01JA0000000000000000000000'] }), /no project/);
  assert.throws(() => h.services.achievements.create({ title: 'x', evidence: [{ kind: 'image' }] }), /needs a blob/);
});

test('achievements: update changes only front-matter, keeping the body byte for byte; null clears', () => {
  h = storeHome();
  const body = 'Line one\n\n  indented  \n---\nnot front-matter\n';
  const { achievement: a } = h.services.achievements.create({ title: 'T', summary: 'S', body, impact: 4 });
  const rel = relPathFor('achievement', a.id);
  h.clock.tick(60_000);
  const u = h.services.achievements.update(a.id, { title: 'T2', summary: null, impact: 6 });
  assert.equal(u.title, 'T2');
  assert.equal(u.summary, undefined);
  assert.equal(u.impact, 6);
  assert.equal(u.updatedAt, '2026-10-17T09:01:00.000Z');
  assert.ok(h.read(rel).endsWith(`---\n${body}`));
  assert.equal(h.services.achievements.update(a.id, { body: 'New body' }).body, 'New body\n');
});

test('achievements: archive, list filters, ordering and search', () => {
  h = storeHome();
  const s = h.services;
  const co = s.companies.create({ name: 'Cyberdyne' });
  const p1 = s.projects.create({ name: 'Apollo', companyId: co.id });
  const p2 = s.projects.create({ name: 'Gemini' });
  const { repo } = s.repos.create({ remoteUrl: 'git@github.com:acme/rocket.git' });
  const mk = (title: string, extra: Record<string, unknown>) => s.achievements.create({ title, ...extra }).achievement;
  const a = mk('Launched the rocket', { happenedAt: '2026-09-01', projects: [p1.id], repos: [repo.id], impact: 8 });
  const b = mk('Fixed flaky tests', { happenedAt: '2026-10-01', projects: [p2.id], impact: 3, body: 'The telemetry pipeline was flaky.' });
  const c = mk('Wrote the docs', { happenedAt: '2026-08-15', projects: [p1.id] });
  s.achievements.archive(c.id);
  const titles = (q: Record<string, unknown>) => s.achievements.list(q).items.map((x) => x.title);
  assert.deepEqual(titles({}), ['Fixed flaky tests', 'Launched the rocket']);
  assert.deepEqual(titles({ archived: 'only' }), ['Wrote the docs']);
  assert.deepEqual(titles({ archived: 'include', projectId: p1.id }), ['Launched the rocket', 'Wrote the docs']);
  assert.deepEqual(titles({ repoId: repo.id }), ['Launched the rocket']);
  assert.deepEqual(titles({ companyId: co.id }), ['Launched the rocket']);
  assert.deepEqual(titles({ minImpact: 5 }), ['Launched the rocket']);
  assert.deepEqual(titles({ from: '2026-09-15', to: '2026-12-31' }), ['Fixed flaky tests']);
  assert.deepEqual(titles({ limit: 1, offset: 1 }), ['Launched the rocket']);
  assert.equal(s.achievements.list({ limit: 1 }).total, 2);
  assert.deepEqual(s.achievements.search('telemetry').items.map((x) => x.id), [b.id]);
  assert.deepEqual(s.achievements.search('rock').items.map((x) => x.id), [a.id], 'prefix match');
  assert.deepEqual(s.achievements.search('nothing-matches-this').items, []);
  assert.deepEqual([...h.store.months()].sort(), [['2026-08', 1], ['2026-09', 1], ['2026-10', 1]]);
});

test('search covers evidence titles, quotes and OCR text', async () => {
  h = storeHome();
  const s = h.services;
  const img = await s.evidence.ingestBytes(PNG, { originalName: 'shot.png' });
  const { achievement } = s.achievements.create({
    title: 'Praise',
    evidence: [s.evidence.toEvidence(img, 'Slack screenshot'), { kind: 'quote', quote: { text: 'stellar migration work', from: 'Sam' } }],
  });
  assert.deepEqual(s.achievements.search('stellar').items.map((a) => a.id), [achievement.id]);
  assert.deepEqual(s.achievements.search('slack').items.map((a) => a.id), [achievement.id]);
  s.evidence.setOcr(img.sha256, { engine: 'tesseract', text: 'Thanks Alex for the heroic rollback', at: '2026-10-17T09:00:00Z' });
  assert.deepEqual(s.achievements.search('heroic').items.map((a) => a.id), [achievement.id]);
  // and after a restart, with sidecars loaded after achievements
  const { createServices } = await import('../server/services/index.ts');
  assert.equal(createServices(h.reopen()).achievements.search('heroic').total, 1);
});

test('projects, companies and repos: defaults, links, and repo dedupe by path or remote', () => {
  h = storeHome();
  const s = h.services;
  const p = s.projects.create({ name: 'Apollo' });
  assert.equal(p.color, '#ef5a3c');
  assert.equal(s.projects.create({ name: 'Second' }).color, '#f5a524');
  assert.equal(p.start, '2026-10-17');
  assert.equal(p.end, null);
  const r1 = s.repos.create({ remoteUrl: 'git@github.com:Acme/Rocket.git' });
  assert.equal(r1.repo.remoteUrl, 'https://github.com/Acme/Rocket');
  assert.equal(r1.repo.host, 'github.com');
  assert.equal(r1.repo.name, 'Acme/Rocket');
  assert.equal(s.repos.create({ remoteUrl: 'https://github.com/Acme/Rocket/' }).created, false);
  const r2 = s.repos.create({ localPath: '/home/alex/Code/my-app/' });
  assert.equal(r2.repo.name, 'my-app');
  assert.equal(r2.repo.host, 'local');
  assert.equal(s.repos.create({ localPath: '/home/alex/Code/my-app/' }).created, false);
  s.projects.linkRepo(p.id, r1.repo.id);
  s.projects.linkRepo(p.id, r1.repo.id);
  assert.deepEqual(s.projects.get(p.id).repoIds, [r1.repo.id]);
  assert.deepEqual(s.projects.forRepo(r1.repo.id).map((x) => x.id), [p.id]);
  s.projects.unlinkRepo(p.id, r1.repo.id);
  assert.deepEqual(s.projects.get(p.id).repoIds, []);
  assert.throws(() => s.projects.update(p.id, { companyId: '01JA0000000000000000000000' }), /no company/);
  const c = s.companies.create({ name: 'Cyberdyne', role: 'Engineer' });
  assert.equal(s.companies.update(c.id, { role: null }).role, undefined);
  s.companies.remove(c.id);
  assert.deepEqual(s.companies.list(), []);
  assert.equal(s.companies.restore(c.id).name, 'Cyberdyne');
});

test('normalizeRemote spellings', () => {
  assert.equal(normalizeRemote('ssh://git@github.com/o/r.git')?.url, 'https://github.com/o/r');
  assert.equal(normalizeRemote('https://GitLab.com/g/sub/r')?.url, 'https://gitlab.com/g/sub/r');
  assert.equal(normalizeRemote('not a url'), null);
  assert.equal(normalizeRemote('file:///tmp/x'), null);
});

test('profile: first set needs a name; then patches; null clears', () => {
  h = storeHome();
  assert.equal(h.services.profile.get(), null);
  assert.throws(() => h.services.profile.set({ role: 'Engineer' }), /name/);
  const p = h.services.profile.set({ name: 'Alex Marlowe', aliases: ['AM', 'alexm'] });
  assert.deepEqual(p.notMe, []);
  assert.equal(h.services.profile.set({ role: 'Staff Engineer' }).name, 'Alex Marlowe');
  assert.equal(h.services.profile.set({ role: null }).role, undefined);
});

test('found.add is a no-op for a key already in Found, dismissed, or on the board', () => {
  h = storeHome();
  const f = h.services.found;
  const first = f.add({ source: 'github', externalKey: 'github_pr:o/r#1', title: 'Add caching', evidence: [{ kind: 'github_pr', url: 'https://github.com/o/r/pull/1', externalKey: 'github_pr:o/r#1' }] });
  assert.equal(first.created, true);
  assert.deepEqual(f.add({ source: 'github', externalKey: 'github_pr:o/r#1', title: 'again' }), { candidate: first.candidate, created: false, reason: 'exists' });
  f.dismiss(first.candidate!.id);
  const after = f.add({ source: 'github', externalKey: 'github_pr:o/r#1', title: 'again' });
  assert.equal(after.reason, 'dismissed');
  const onBoard = h.services.achievements.create({ title: 'by hand', evidence: [{ kind: 'github_pr', url: 'https://github.com/o/r/pull/2', externalKey: 'github_pr:o/r#2' }] });
  assert.deepEqual(f.add({ source: 'github', externalKey: 'github_pr:o/r#2', title: 'x' }), { candidate: null, created: false, reason: 'on-board', achievementId: onBoard.achievement.id });
  assert.equal(h.store.all('found').length, 1);
});

test('found.keep makes an achievement (with files ingested); undo removes it again', async () => {
  h = storeHome();
  const s = h.services;
  const p = s.projects.create({ name: 'Apollo' });
  const shot = path.join(h.home, '..', 'Screenshot 2026-10-17.png');
  fs.writeFileSync(shot, PNG);
  const { candidate } = s.found.add({
    source: 'screenshots',
    externalKey: 'screenshot:abc',
    title: 'Sam: great work on the release',
    quote: { text: 'great work on the release', from: 'Sam', where: '#eng' },
    files: [{ path: shot, title: 'Slack' }, { path: '/nonexistent/gone.png' }],
    matchedRules: ['mentions your name', 'praise words'],
    suggestedProjects: [p.id],
  });
  assert.equal(candidate!.verdict, null);
  assert.equal(h.store.all('evidence').length, 0, 'not copied until kept');
  h.clock.tick();
  const kept = await s.found.keep(candidate!.id, { impact: 5 });
  assert.deepEqual(kept.missingFiles, ['/nonexistent/gone.png']);
  const a = s.achievements.get(kept.achievementId);
  assert.equal(a.source, 'screenshot');
  assert.equal(a.externalKey, 'screenshot:abc');
  assert.deepEqual(a.projects, [p.id]);
  assert.equal(a.impact, 5);
  assert.deepEqual(a.evidence.map((e) => e.kind), ['quote', 'image']);
  assert.equal(s.found.get(candidate!.id).status, 'kept');
  assert.equal(s.found.get(candidate!.id).decision!.achievementId, a.id);
  assert.equal(s.found.pendingCount(), 0);
  await assert.rejects(s.found.keep(candidate!.id), ConflictError);
  const back = s.found.undo(candidate!.id);
  assert.equal(back.status, 'pending');
  assert.equal(back.decision, null);
  assert.equal(h.store.get('achievement', a.id), undefined);
  assert.equal(s.achievements.restore(a.id).id, a.id, 'the undone achievement is still recoverable');
});

test('found.merge attaches evidence to an existing achievement; undo takes exactly it off', async () => {
  h = storeHome();
  const s = h.services;
  const { achievement } = s.achievements.create({ title: 'Release 2.0', evidence: [{ kind: 'url', url: 'https://example.com/notes' }] });
  const { candidate } = s.found.add({ source: 'github', externalKey: 'github_pr:o/r#9', title: 'Bump version', evidence: [{ kind: 'github_pr', url: 'https://github.com/o/r/pull/9', externalKey: 'github_pr:o/r#9' }] });
  const merged = await s.found.merge(candidate!.id, achievement.id);
  assert.equal(s.achievements.get(achievement.id).evidence.length, 2);
  assert.equal(merged.candidate.decision!.evidenceIds!.length, 1);
  assert.equal(h.store.achievementIdByKey('github_pr:o/r#9'), achievement.id);
  assert.equal(s.found.add({ source: 'github', externalKey: 'github_pr:o/r#9', title: 'x' }).created, false);
  s.found.undo(candidate!.id);
  assert.deepEqual(s.achievements.get(achievement.id).evidence.map((e) => e.kind), ['url']);
  await assert.rejects(s.found.merge(candidate!.id, '01JA0000000000000000000000'), /no achievement/);
});

test('found: dismiss and undo, list order and filters', () => {
  h = storeHome();
  const f = h.services.found;
  const a = f.add({ source: 'github', title: 'A' }).candidate!;
  h.clock.tick();
  const b = f.add({ source: 'mcp', sourceAgent: 'claude-code', title: 'B' }).candidate!;
  assert.deepEqual(f.list().map((x) => x.title), ['B', 'A']);
  assert.deepEqual(f.list({ source: 'github' }).map((x) => x.title), ['A']);
  f.dismiss(a.id);
  assert.deepEqual(f.list().map((x) => x.title), ['B']);
  assert.deepEqual(f.list({ status: 'dismissed' }).map((x) => x.title), ['A']);
  assert.throws(() => f.undo(b.id), /nothing to undo/);
  f.undo(a.id);
  assert.equal(f.pendingCount(), 2);
});

test('evidence edits match items by id: unknown keys and comments stay with their own item', () => {
  h = storeHome();
  const s = h.services;
  const { achievement: a } = s.achievements.create({
    title: 'Quotes',
    evidence: [
      { kind: 'quote', quote: { text: 'great', from: 'Alice', where: 'slack' } },
      { kind: 'quote', quote: { text: 'nice' } },
    ],
  });
  const rel = relPathFor('achievement', a.id);
  const [q0, q1] = a.evidence;
  // a hand edit: a comment and an unknown key on the second item
  h.put(rel, h.read(rel).replace(`  - id: ${q1.id}\n`, `  # from the standup\n  - id: ${q1.id}\n    pinned: true\n`));
  h.store.reloadPath(path.join(h.home, rel));
  s.achievements.removeEvidence(a.id, [q0.id]);
  let text = h.read(rel);
  assert.match(text, /# from the standup\n  - id: /);
  assert.match(text, /pinned: true/);
  assert.doesNotMatch(text, /Alice|slack/, 'the removed quote\'s who and where went with it');
  s.achievements.addEvidence(a.id, [{ id: '01JA0000000000000000000009', kind: 'url', url: 'https://example.com' }]);
  // an update from a client that doesn't know `pinned` keeps it, too
  s.achievements.update(a.id, { evidence: [{ id: q1.id, kind: 'quote', quote: { text: 'nice!' } }] });
  text = h.read(rel);
  assert.match(text, /pinned: true/);
  assert.match(text, /text: nice!/);
  assert.equal((h.store.get('achievement', a.id)!.evidence[0] as Record<string, unknown>).pinned, true);
});

test('ids are checked before they become paths', () => {
  h = storeHome();
  h.put('secrets.yaml', 'githubToken: shh\n');
  h.put('config.yaml', 'schemaVersion: 1\n');
  assert.throws(() => h.services.projects.remove('../secrets'), /no project/);
  assert.throws(() => h.services.companies.remove('x/../../config'), /no company/);
  assert.throws(() => h.services.repos.restore('../secrets'), /no repo/);
  assert.throws(() => h.services.achievements.update('../../secrets', { title: 'x' }), /no achievement/);
  assert.ok(h.exists('secrets.yaml') && h.exists('config.yaml'));
});

test('keeping a candidate whose key reached the board meanwhile merges, and undo leaves the board alone', async () => {
  h = storeHome();
  const s = h.services;
  const { candidate } = s.found.add({ source: 'github', externalKey: 'github_pr:o/r#5', title: 'PR 5', evidence: [{ kind: 'url', url: 'https://example.com/ci' }] });
  const mine = s.achievements.create({ title: 'My own write-up of PR 5', externalKey: 'github_pr:o/r#5' }).achievement;
  const kept = await s.found.keep(candidate!.id);
  assert.equal(kept.achievementId, mine.id);
  assert.equal(kept.candidate.decision!.action, 'merge');
  s.found.undo(candidate!.id);
  assert.equal(s.achievements.get(mine.id).title, 'My own write-up of PR 5');
  assert.equal(s.achievements.get(mine.id).evidence.length, 0);
});

test('a dismissed key stays dismissed while its file is broken; duplicate files keep the key claimed', () => {
  h = storeHome();
  const f = h.services.found;
  const { candidate } = f.add({ source: 'github', externalKey: 'github_pr:o/r#7', title: 'PR 7' });
  f.dismiss(candidate!.id);
  const rel = relPathFor('found', candidate!.id);
  const good = h.read(rel);
  h.put(rel, good.replace(/^title: .*$/m, 'title: [broken'));
  const s2 = (h.store = h.reopen());
  const { createServices } = require_services();
  const again = createServices(s2).found.add({ source: 'github', externalKey: 'github_pr:o/r#7', title: 'PR 7 again' });
  assert.equal(again.created, false);
  // two achievement files with one key (a hand copy): removing one leaves the key claimed by the other
  const svc = createServices(s2);
  const a = svc.achievements.create({ title: 'A', externalKey: 'k:1' }).achievement;
  const copyId = '01JA0000000000000000000ABC';
  h.put(relPathFor('achievement', copyId), h.read(relPathFor('achievement', a.id)).replace(a.id, copyId));
  s2.reloadPath(path.join(h.home, relPathFor('achievement', copyId)));
  svc.achievements.remove(a.id);
  assert.equal(svc.achievements.create({ title: 'A again', externalKey: 'k:1' }).created, false);
});

test('a candidate in a hidden or data-home path is refused by the schema or at keep; screenshots must be images', async () => {
  h = storeHome();
  const s = h.services;
  assert.throws(() => s.found.add({ source: 'screenshots', title: 'x', files: [{ path: 'relative.png' }] }), /absolute/);
  const txt = path.join(h.home, '..', 'notes.txt');
  fs.writeFileSync(txt, 'not an image');
  const { candidate } = s.found.add({ source: 'screenshots', title: 'x', files: [{ path: txt }, { path: path.join(h.home, 'profile.yaml') }] });
  const kept = await s.found.keep(candidate!.id);
  assert.deepEqual(kept.missingFiles, [txt, path.join(h.home, 'profile.yaml')]);
  assert.equal(h.store.all('evidence').length, 0);
});
