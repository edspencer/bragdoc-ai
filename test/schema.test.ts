// Every schema round-trips: what the services write, a fresh store reads back identically. Plus the generated
// file-format reference in docs/data-format.md is current, and the ULID helpers.
import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ULID_RE, ulid, ulidTime } from '../shared/ulid.ts';
import { IMPACT_SCALE } from '../shared/impact.ts';
import { withReference } from '../shared/schema/reference.ts';
import { AchievementFrontMatterSchema, EvidenceSchema, FoundCandidateSchema, ProjectSchema } from '../shared/schema/index.ts';
import type { EntityKind } from '../server/store/index.ts';
import { ROOT } from './fixture.ts';
import { storeHome, type StoreHome } from './store-fixture.ts';

let h: StoreHome;
afterEach(() => h?.cleanup());

const PNG = Buffer.from('89504e470d0a1a0a0000000d494844520000000300000002080600000000000000', 'hex');

test('every file type round-trips through the store and a restart', async () => {
  h = storeHome();
  const s = h.services;
  s.profile.set({ name: 'Alex Marlowe', role: 'Staff Engineer', githubLogin: 'alexm', aliases: ['AM'], notMe: ['Alexa'], emails: ['alex@example.com'], timezone: 'Europe/London' });
  const co = s.companies.create({ name: 'Cyberdyne', role: 'Engineer', start: '2024-01-01' });
  const { repo } = s.repos.create({ remoteUrl: 'https://github.com/acme/rocket', localPath: '/home/alex/Code/rocket' });
  const p = s.projects.create({ name: 'Apollo', description: 'Moonshot', color: '#123abc', start: '2026-01-01', end: '2026-06-30', status: 'done', companyId: co.id, repoIds: [repo.id] });
  const img = await s.evidence.ingestBytes(PNG, { originalName: 'shot.png' });
  s.evidence.setOcr(img.sha256, { engine: 'tesseract', text: 'nice one', at: '2026-10-17T09:00:00Z' });
  s.achievements.create({
    title: 'Landed it',
    summary: 'Summary',
    body: '# Heading\n\nText.\n',
    happenedAt: '2026-05-01',
    endedAt: '2026-05-03',
    impact: 7,
    impactSource: 'user',
    projects: [p.id],
    repos: [repo.id],
    companyId: co.id,
    evidence: [
      s.evidence.toEvidence(img, 'A screenshot'),
      { kind: 'url', url: 'https://example.com/post', title: 'Post' },
      { kind: 'github_pr', url: 'https://github.com/acme/rocket/pull/1', externalKey: 'github_pr:acme/rocket#1', meta: { additions: 10 } },
      { kind: 'quote', quote: { text: 'Great job', from: 'Sam', where: '#eng' } },
    ],
    source: 'mcp',
    sourceAgent: 'claude-code',
    externalKey: 'mcp:1',
    meta: { legacy: { source: 'llm' } },
  });
  s.found.add({ source: 'mcp', sourceAgent: 'claude-code', externalKey: 'k', title: 'Candidate', impact: 3, matchedRules: ['r'], meta: { x: 1 } });
  const fresh = h.reopen();
  const kinds: EntityKind[] = ['profile', 'company', 'project', 'repo', 'achievement', 'evidence', 'found'];
  for (const k of kinds) {
    assert.equal(fresh.all(k).length, 1, k);
    assert.deepEqual(fresh.all(k), h.store.all(k), `${k} reads back the same`);
  }
  assert.deepEqual(fresh.problems(), []);
  assert.deepEqual(fresh.get('evidence', img.sha256)!.width, 3);
});

test('schemas: defaults on read, and the rules a hand edit is held to', () => {
  const id = ulid();
  const p = ProjectSchema.parse({ id, name: 'x', color: '#000000', start: '2026-01-01' });
  assert.deepEqual([p.schemaVersion, p.end, p.status, p.companyId, p.repoIds], [1, null, 'active', null, []]);
  assert.ok(!ProjectSchema.safeParse({ id, name: 'x', color: 'red', start: '2026-01-01' }).success);
  assert.ok(!ProjectSchema.safeParse({ id, name: 'x', color: '#000000', start: '2026-13-01' }).success);
  const a = AchievementFrontMatterSchema.parse({ id, title: 't', happenedAt: '2026-01-01', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00+01:00' });
  assert.deepEqual([a.projects, a.evidence, a.source, a.archived], [[], [], 'manual', false]);
  assert.ok(!EvidenceSchema.safeParse({ id, kind: 'pdf' }).success, 'a pdf needs a blob');
  assert.ok(!EvidenceSchema.safeParse({ id, kind: 'quote' }).success, 'a quote needs a quote');
  assert.ok(EvidenceSchema.safeParse({ id, kind: 'github_pr', externalKey: 'github_pr:o/r#1' }).success);
  const f = FoundCandidateSchema.parse({ id, source: 'github', title: 't', happenedAt: '2026-01-01', foundAt: '2026-01-01T00:00:00Z' });
  assert.deepEqual([f.status, f.verdict, f.decision, f.files], ['pending', null, null, []]);
});

test('docs/data-format.md carries the current generated reference (run `npm run sync:reference`)', () => {
  const doc = fs.readFileSync(path.join(ROOT, 'docs', 'data-format.md'), 'utf8');
  assert.equal(withReference(doc), doc);
});

test('impact scale: 1 to 10, each with a label and guidance', () => {
  assert.deepEqual(IMPACT_SCALE.map((l) => l.value), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.ok(IMPACT_SCALE.every((l) => l.label && l.guidance));
});

test('ULIDs: format, time, and monotonic within a millisecond', () => {
  const t = Date.parse('2026-10-17T09:00:00Z');
  const ids = Array.from({ length: 50 }, () => ulid(t));
  assert.ok(ids.every((i) => ULID_RE.test(i)));
  assert.deepEqual([...ids].sort(), ids);
  assert.equal(new Set(ids).size, 50);
  assert.equal(ulidTime(ids[0]), t);
  assert.ok(ulid(t + 1) > ids[49]);
});
