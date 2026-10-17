// The hosted-export importer (SPEC R12): the mapping, idempotency, per-item problems, refusals, the HTTP routes and
// their 50 MB limit, the lock, a 5,000-achievement export, and the CLI (with and without a running server). Exports
// are synthetic (test/import-fixture.ts; the small ones are committed in test/fixtures/import/).
import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { ImportReport } from '../shared/api.ts';
import { ConfigStore } from '../server/config.ts';
import { ImportRunning, takeImportLock } from '../server/import/lock.ts';
import { formatReport } from '../server/import/report.ts';
import { ExportRefused, readExport } from '../server/import/v1-schema.ts';
import { apply, planImport } from '../server/import/v1.ts';
import { createApp } from '../server/index.ts';
import { Runtime } from '../server/runtime.ts';
import { LARGE_JSON_LIMIT, UploadRegistry } from '../server/security.ts';
import { relPathFor } from '../server/store/files.ts';
import { ROOT, stopChild, tmpHome } from './fixture.ts';
import { FIXTURES_DIR, achievement, alexExport, allNullsExport, bigExport, exportOf, missingOptionalExport, orphansExport, uuid } from './import-fixture.ts';
import { storeHome, type StoreHome } from './store-fixture.ts';

const cleanups: (() => void)[] = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});
function home(): StoreHome {
  const h = storeHome();
  cleanups.push(h.cleanup);
  return h;
}
const fixture = (name: string) => fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8');
const json = (o: unknown) => JSON.stringify(o);

/** Every file in the data home (relative), except backups/. */
function files(dir: string, rel = ''): string[] {
  if (!fs.existsSync(path.join(dir, rel))) return [];
  return fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).flatMap((e) => {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (r === 'backups') return [];
    return e.isDirectory() ? files(dir, r) : [r];
  });
}

async function importInto(h: StoreHome, ex: unknown): Promise<ImportReport> {
  return apply(h.store, h.services, planImport(h.store, json(ex)));
}

test('the committed fixtures are what test/import-fixture.ts makes', () => {
  assert.deepEqual(JSON.parse(fixture('alex-marlowe.json')), alexExport());
  assert.deepEqual(JSON.parse(fixture('orphans.json')), orphansExport());
  assert.deepEqual(JSON.parse(fixture('all-nulls.json')), allNullsExport());
  assert.deepEqual(JSON.parse(fixture('missing-optional.json')), missingOptionalExport());
});

test('a dry run counts everything and says what is left behind, and writes nothing', () => {
  const h = home();
  const { report } = planImport(h.store, fixture('alex-marlowe.json'));
  assert.equal(report.dryRun, true);
  assert.equal(report.exportedAt, '2026-01-15T20:16:17.782Z');
  assert.deepEqual(report.counts, {
    companies: { add: 2, skip: 0, fail: 0 },
    projects: { add: 4, skip: 0, fail: 0 },
    repos: { add: 2, skip: 0, fail: 0 }, // atlas (in two spellings, on two projects) and onboarding
    achievements: { add: 8, skip: 0, fail: 0 },
    documents: { add: 2, skip: 0, fail: 0 },
    reviews: { add: 0, skip: 0, fail: 0 },
  });
  assert.deepEqual(report.problems, []);
  const dropped = Object.fromEntries(report.dropped.map((d) => [d.field, d.count]));
  assert.deepEqual(dropped, {
    userId: 17, // the envelope, 2 companies, 4 projects, 8 achievements, 2 documents
    'companies[].domain': 2,
    'projects[].createdAt': 4,
    'projects[].updatedAt': 4,
    'achievements[].embedding': 1,
    'achievements[].embeddingModel': 1,
    'achievements[].embeddingGeneratedAt': 1,
    'achievements[].userMessageId': 1,
    'documents[].shareToken': 1,
  });
  for (const d of report.dropped) assert.ok(d.why.length > 10, d.field);
  assert.match(report.importsDir!, /^imports\/2026-10-17T09-00-00Z$/);
  assert.deepEqual(files(h.home), []);
});

test('the mapping: companies, projects with repos, achievements with their dates, impact and legacy fields', async () => {
  const h = home();
  const r = await importInto(h, alexExport());
  assert.equal(r.dryRun, false);
  assert.equal(r.counts.achievements.add, 8);
  const byLegacy = <T extends { legacyId?: string }>(all: T[], n: number, kind: number) => all.find((x) => x.legacyId === uuid(kind, n))!;
  const companies = h.store.all('company');
  const northwind = byLegacy(companies, 1, 1);
  assert.deepEqual({ ...northwind, id: undefined }, { schemaVersion: 1, id: undefined, name: 'Northwind Labs', role: 'Senior Engineer', start: '2021-03-01', end: '2024-05-31', legacyId: uuid(1, 1) });
  const acme = byLegacy(companies, 2, 1);
  assert.equal(acme.end, null);

  const projects = h.store.all('project');
  const atlas = byLegacy(projects, 1, 2);
  const atlasApi = byLegacy(projects, 2, 2);
  const mentoring = byLegacy(projects, 4, 2);
  assert.equal(atlas.status, 'done'); // completed
  assert.equal(atlasApi.status, 'archived');
  assert.equal(byLegacy(projects, 3, 2).status, 'active');
  assert.equal(atlas.color, '#ef5a3c');
  assert.deepEqual([atlas.start, atlas.end, atlas.companyId], ['2022-01-10', '2023-04-28', northwind.id]);
  assert.equal(mentoring.companyId, null);
  // one repo for both spellings of example/atlas, linked to both projects
  const repos = h.store.all('repo');
  assert.equal(repos.length, 2);
  const atlasRepo = repos.find((x) => x.name === 'example/atlas')!;
  assert.deepEqual([atlasRepo.remoteUrl, atlasRepo.host], ['https://github.com/example/atlas', 'github.com']);
  assert.deepEqual(atlas.repoIds, [atlasRepo.id]);
  assert.deepEqual(atlasApi.repoIds, [atlasRepo.id]);
  assert.deepEqual(mentoring.repoIds, []);

  const all = h.store.all('achievement');
  const a = (n: number) => byLegacy(all, n, 3);
  const a1 = a(1);
  assert.equal(a1.title, 'Shipped the new search index');
  assert.equal(a1.summary, 'Search p95 latency down from 900 ms to 120 ms.');
  assert.equal(a1.body, 'Cut over **all** traffic in one week.\n\n- zero downtime\n- rollback plan rehearsed\n');
  assert.deepEqual([a1.happenedAt, a1.endedAt], ['2022-11-14', '2022-11-18']);
  assert.deepEqual([a1.impact, a1.impactSource, a1.source, a1.archived], [9, 'user', 'import', false]);
  assert.deepEqual(a1.projects, [atlas.id]);
  assert.equal(a1.companyId, undefined); // its project's company: implied, not repeated
  assert.deepEqual(a1.meta, { legacy: { source: 'manual', eventDuration: 'week', impactSource: 'user', impactUpdatedAt: '2022-11-14T00:00:00.000Z' } });
  assert.equal(a1.createdAt, '2022-11-14T00:00:00.000Z');
  // filed under the month it was originally added
  assert.match(h.store.entry('achievement', a1.id)!.file, /^achievements\/2022\/11\//);
  // an impact the hosted app's AI suggested is marked as carried over
  assert.deepEqual([a(2).impact, a(2).impactSource, (a(2).meta!.legacy as Record<string, unknown>).source], [5, 'import', 'llm']);
  assert.equal((a(3).meta!.legacy as Record<string, unknown>).source, 'commit');
  // no project, a company: the company is kept
  assert.deepEqual([a(6).projects, a(6).companyId], [[], acme.id]);
  // no eventStart: the day it was added; no impact; archived
  assert.deepEqual([a(7).happenedAt, a(7).impact, a(7).impactSource, a(7).archived], ['2023-05-02', undefined, undefined, true]);
  assert.equal(a(8).archived, false); // isArchived null
  assert.equal(h.store.problems().length, 0);

  // documents: read-only markdown under imports/<timestamp>/, with a README
  const docs = files(h.home).filter((f) => f.startsWith('imports/'));
  assert.deepEqual(docs.sort(), [
    `${r.importsDir}/README.md`,
    `${r.importsDir}/documents/2024-05-20-h1-2024-self-review.md`,
    `${r.importsDir}/documents/2025-01-06-weekly-update-week-1.md`,
  ]);
  const review = h.read(`${r.importsDir}/documents/2024-05-20-h1-2024-self-review.md`);
  assert.match(review, /^---\n# Carried over from the hosted BragDoc app/);
  assert.match(review, /\ntitle: H1 2024 self-review\ntype: performance_review\ncompany: Northwind Labs\nlegacyId: 00000004-0000-4000-8000-000000000001\n/);
  assert.match(review, /---\n# H1 2024\n\nI led the search rebuild\.\n$/);
  assert.doesNotMatch(review, /tok_example/); // the share token stays behind
  if (process.platform !== 'win32') assert.equal(fs.statSync(path.join(h.home, `${r.importsDir}/documents/2024-05-20-h1-2024-self-review.md`)).mode & 0o777, 0o444);
});

test('importing the same export again adds nothing, and a newer export adds only what is new', async () => {
  const h = home();
  await importInto(h, alexExport());
  const before = files(h.home).sort();
  h.clock.tick(60_000);
  const again = await importInto(h, alexExport());
  for (const k of ['companies', 'projects', 'achievements', 'documents'] as const) assert.equal(again.counts[k].add, 0, k);
  assert.deepEqual(again.counts.repos, { add: 0, skip: 2, fail: 0 });
  assert.deepEqual(again.counts.achievements, { add: 0, skip: 8, fail: 0 });
  assert.equal(again.importsDir, null);
  assert.equal(again.snapshot, null);
  assert.deepEqual(files(h.home).sort(), before);
  assert.match(formatReport(again), /Everything in it was already here, so nothing was added\./);

  // after a restart (the index rebuilt from the files) it's still idempotent
  const store = h.reopen();
  const { report } = planImport(store, json(alexExport()));
  assert.equal(report.counts.achievements.skip, 8);

  // a later export with one more achievement and one more document
  const newer = alexExport() as { achievements: unknown[]; documents: unknown[] };
  newer.achievements.push({ ...(newer.achievements[0] as object), id: uuid(3, 100), title: 'Something new' });
  newer.documents.push({ ...(newer.documents[0] as object), id: uuid(4, 100), title: 'Another review' });
  h.clock.tick(60_000);
  const later = await importInto(h, newer);
  assert.deepEqual([later.counts.achievements.add, later.counts.achievements.skip, later.counts.documents.add, later.counts.documents.skip], [1, 8, 1, 2]);
  // a snapshot of what was there before
  assert.match(later.snapshot ?? '', /^backups\/2026-10-17T09-02-00Z$/);
  assert.ok(fs.existsSync(path.join(h.home, later.snapshot!, 'achievements')));
  assert.notEqual(later.importsDir, null);
});

test('all nulls, and optional fields missing altogether, still import', async () => {
  const h = home();
  const r = await importInto(h, allNullsExport());
  assert.deepEqual(r.problems, []);
  const [p] = h.store.all('project');
  assert.equal(p.status, 'active'); // status ''
  assert.match(p.color, /^#[0-9a-f]{6}$/); // colour '': the next swatch, without a warning
  const [c] = h.store.all('company');
  assert.equal(c.role, undefined);
  const [a] = h.store.all('achievement');
  assert.equal(a.happenedAt, a.createdAt.slice(0, 10));
  assert.deepEqual([a.impact, a.summary, a.body, a.archived, a.meta], [undefined, undefined, '', false, { legacy: { eventDuration: 'week', source: 'manual' } }]);
  const doc = files(h.home).find((f) => f.includes('/documents/'))!;
  assert.match(h.read(doc), /title: Notes\n[\s\S]*---\n$/);

  const h2 = home();
  const r2 = await importInto(h2, missingOptionalExport());
  assert.deepEqual(r2.problems.map((p) => `${p.level} ${p.item}: ${p.message}`), [`warning "Atlas search" (id 00000002…): has no start date; it starts today (2026-10-17)`]);
  assert.deepEqual([r2.counts.companies.add, r2.counts.projects.add, r2.counts.achievements.add, r2.counts.documents.add], [1, 1, 2, 0]);
  assert.equal(r2.importsDir, null);
  const proj = h2.store.all('project')[0]!;
  assert.equal(proj.start, '2026-10-17'); // no dates at all: today, with the warning above
  assert.equal(proj.companyId, h2.store.all('company')[0]!.id);
  assert.deepEqual(h2.store.all('achievement').find((x) => x.title === 'Also this')!.projects, [proj.id]);
});

test('orphans and bad items: problems item by item, and the rest imports', async () => {
  const h = home();
  const r = await importInto(h, orphansExport());
  assert.deepEqual(r.counts.achievements, { add: 5, skip: 1, fail: 3 });
  assert.deepEqual(r.counts.projects, { add: 2, skip: 0, fail: 0 });
  assert.deepEqual(r.counts.reviews, { add: 1, skip: 0, fail: 0 });
  const errors = r.problems.filter((p) => p.level === 'error');
  assert.equal(errors.length, 3);
  assert.ok(r.problems.indexOf(errors[0]!) === 0, 'errors come first');
  const msg = (re: RegExp) => r.problems.find((p) => re.test(`${p.item}: ${p.message}`));
  assert.ok(msg(/"Achievement 6".*createdAt: not a date and time/), 'a bad date');
  assert.ok(msg(/achievement #7 \(id 00000003…\): not imported: .*title/), 'no title, no createdAt');
  assert.ok(msg(/achievement #8: not imported: it isn't an object/), 'not an object');
  assert.ok(msg(/A repeat of achievement 1.*appears more than once/), 'a repeat');
  assert.ok(msg(/"Project 1".*company .* isn't in the export; imported without a company/));
  assert.ok(msg(/"Project 2".*colour "blue"/));
  assert.equal(h.store.all('project').find((p) => p.name === 'Project 2')!.status, 'paused'); // "on hold"
  assert.ok(msg(/"Achievement 1".*project .* isn't in the export/));
  assert.ok(msg(/"Achievement 2".*company .* isn't in the export/));
  assert.ok(msg(/achievement #4.*has no title; imported as "Fixed the flaky deploy"/));
  assert.ok(msg(/"Achievement 5".*impact 42 is off/));

  const all = h.store.all('achievement');
  const byTitle = (t: string) => all.find((a) => a.title === t)!;
  assert.deepEqual(byTitle('Achievement 1').projects, []);
  assert.equal((byTitle('Achievement 1').meta!.legacy as Record<string, unknown>).projectId, uuid(2, 99));
  assert.equal((byTitle('Achievement 2').meta!.legacy as Record<string, unknown>).companyId, uuid(1, 98));
  assert.equal(byTitle('Achievement 3').projects.length, 1);
  assert.equal(byTitle('Achievement 5').impact, undefined);
  assert.equal((byTitle('Achievement 5').meta!.legacy as Record<string, unknown>).impact, 42);
  assert.equal(byTitle('Fixed the flaky deploy').summary, 'Fixed the flaky deploy\nand more');
  // the review names the document it can't find by its hosted id
  const review = files(h.home).find((f) => f.includes('/reviews/'))!;
  assert.match(review, /reviews\/2025-01-01-annual-review-2025\.md$/);
  assert.match(h.read(review), new RegExp(`documentLegacyId: ${uuid(4, 77)}\\n[\\s\\S]*---\\nFocus on impact\\.\\n$`));
  assert.equal(h.store.problems().length, 0);
  const text = formatReport(r);
  assert.match(text, /Problems: 3 not imported, \d+ imported with a change\./);
});

test('files that cannot be imported are refused, with a sentence and no stack trace', () => {
  const refused = (input: string, code: string, re: RegExp) => {
    assert.throws(
      () => readExport(input),
      (e: unknown) => e instanceof ExportRefused && e.code === code && re.test(e.message),
      input.slice(0, 40),
    );
  };
  refused(fixture('version-2.json'), 'unsupported_version', /version "2\.0", and this BragDoc reads version "1\.0" exports only/);
  refused(fixture('corrupt.json'), 'invalid_export', /isn't valid JSON \((it ends part-way through|line \d+, column \d+)\)/);
  refused('', 'invalid_export', /The file is empty/);
  refused('[1, 2]', 'invalid_export', /not an object/);
  refused('{"companies": []}', 'invalid_export', /has no "version"/);
  refused('{"version": "1.0", "achievements": {"a": 1}}', 'invalid_export', /"achievements" should be a list, and it's an object/);
  refused('{not json', 'invalid_export', /isn't valid JSON \(line 1, column 2\)/);
  // a BOM and missing lists are fine
  assert.deepEqual(readExport('﻿{"version": "1.0"}').lists.achievements, []);
});

test('HTTP: plan, apply, re-apply; refusals; JSON only; a body up to 50 MB', async () => {
  const h = home();
  const app = createApp({ dataDir: h.home, store: h.store, runtime: new Runtime(h.home), config: new ConfigStore(h.home), webDist: null });
  const HOST = '127.0.0.1:2724';
  const post = (p: string, body: string, type = 'application/json', extra: Record<string, string> = {}) => app.request(p, { method: 'POST', headers: { host: HOST, 'content-type': type, ...extra }, body });

  const plan = await post('/api/import/plan', fixture('alex-marlowe.json'));
  assert.equal(plan.status, 200);
  const pr = (await plan.json()) as ImportReport;
  assert.deepEqual([pr.dryRun, pr.counts.achievements.add], [true, 8]);
  assert.equal(h.store.all('achievement').length, 0);

  const done = await post('/api/import/apply', fixture('alex-marlowe.json'));
  assert.equal(done.status, 200);
  const dr = (await done.json()) as ImportReport;
  assert.deepEqual([dr.dryRun, dr.counts.achievements.add], [false, 8]);
  assert.equal(dr.snapshot, null, 'an empty data home has nothing to snapshot');
  assert.equal(h.store.all('achievement').length, 8);
  assert.equal(fs.existsSync(path.join(h.home, 'cache', 'import.lock')), false, 'the lock is released');

  const again = (await (await post('/api/import/apply', fixture('alex-marlowe.json'))).json()) as ImportReport;
  assert.deepEqual([again.counts.achievements.add, again.counts.achievements.skip], [0, 8]);

  const v2 = await post('/api/import/plan', fixture('version-2.json'));
  assert.equal(v2.status, 400);
  assert.equal(((await v2.json()) as { error: { code: string } }).error.code, 'unsupported_version');
  const bad = await post('/api/import/apply', fixture('corrupt.json'));
  assert.equal(bad.status, 400);
  assert.equal(((await bad.json()) as { error: { code: string } }).error.code, 'invalid_export');

  // never a CORS-safelisted type (any web page could send one), and never cross-site
  assert.equal((await post('/api/import/apply', fixture('alex-marlowe.json'), 'text/plain')).status, 415);
  assert.equal((await post('/api/import/apply', fixture('alex-marlowe.json'), 'application/json', { origin: 'https://evil.example' })).status, 403);

  // over 1 MB is fine here (and only here), over 50 MB isn't
  const big = json(bigExport(2500));
  assert.ok(big.length > 1024 * 1024, `${big.length}`);
  const bigPlan = await post('/api/import/plan', big);
  assert.equal(bigPlan.status, 200);
  const bc = ((await bigPlan.json()) as ImportReport).counts.achievements;
  assert.deepEqual([bc.add, bc.skip], [2492, 8]); // its first eight share ids with the export imported above
  assert.equal((await post('/api/health', big)).status, 413, 'other routes keep the 1 MB limit');
  const huge = await post('/api/import/plan', ' '.repeat(LARGE_JSON_LIMIT + 1));
  assert.equal(huge.status, 413);
  assert.match(((await huge.json()) as { error: { message: string } }).error.message, /larger than 50 MB/);

  // one import at a time
  const release = takeImportLock(h.home);
  try {
    const busy = await post('/api/import/apply', fixture('alex-marlowe.json'));
    assert.equal(busy.status, 409);
    assert.equal(((await busy.json()) as { error: { code: string } }).error.code, 'import_running');
  } finally {
    release();
  }
});

test('the lock: one holder; a dead holder is taken over; release removes only our own', () => {
  const h = home();
  const release = takeImportLock(h.home);
  assert.throws(() => takeImportLock(h.home), ImportRunning);
  release();
  assert.equal(fs.existsSync(path.join(h.home, 'cache', 'import.lock')), false);
  // a lock left by a process that has exited
  const dead = spawnSync(process.execPath, ['-e', 'process.stdout.write(String(process.pid))'], { encoding: 'utf8' });
  fs.writeFileSync(path.join(h.home, 'cache', 'import.lock'), JSON.stringify({ pid: Number(dead.stdout) }));
  const again = takeImportLock(h.home);
  again();
  assert.throws(() => new UploadRegistry().acceptLargeJson({ method: 'POST', path: /x/, maxBytes: LARGE_JSON_LIMIT + 1 }), /at most/);
});

test('5,000 achievements: planned, imported and re-imported in reasonable time', async () => {
  const h = home();
  const ex = json(bigExport(5000));
  let t = performance.now();
  const p = planImport(h.store, ex);
  const planMs = performance.now() - t;
  assert.equal(p.report.counts.achievements.add, 5000);
  assert.equal(p.report.counts.repos.add, 6);
  assert.equal(p.report.dropped.find((d) => d.field === 'achievements[].embedding')!.count, 5000);
  t = performance.now();
  const r = await apply(h.store, h.services, p);
  const applyMs = performance.now() - t;
  assert.deepEqual(r.counts.achievements, { add: 5000, skip: 0, fail: 0 });
  assert.equal(h.store.all('achievement').length, 5000);
  assert.equal(h.store.achievementIdsIn('project', h.store.all('project')[0]!.id).size > 0, true);
  t = performance.now();
  const again = await apply(h.store, h.services, planImport(h.store, ex));
  const againMs = performance.now() - t;
  assert.deepEqual(again.counts.achievements, { add: 0, skip: 5000, fail: 0 });
  process.stdout.write(`# 5,000 achievements: plan ${Math.round(planMs)} ms, apply ${Math.round(applyMs)} ms, re-import ${Math.round(againMs)} ms\n`);
  assert.ok(planMs < 5_000 && againMs < 10_000, 'planning and a no-op re-import are quick');
  assert.ok(applyMs < 120_000, `apply took ${applyMs} ms`);
  // every file is where the store expects it
  const a = h.store.all('achievement')[0]!;
  assert.ok(fs.existsSync(path.join(h.home, relPathFor('achievement', a.id))));
});

test('the CLI: dry run writes nothing; import; re-import; errors are sentences; a running server is used', async () => {
  const t = tmpHome();
  cleanups.push(t.cleanup);
  const CLI = ['--import', 'tsx', path.join(ROOT, 'server', 'cli.ts')];
  const run = (...args: string[]) => spawnSync(process.execPath, [...CLI, ...args], { cwd: ROOT, env: t.env, encoding: 'utf8' });
  const alex = path.join(FIXTURES_DIR, 'alex-marlowe.json');

  const usage = run('import');
  assert.equal(usage.status, 2);
  assert.match(usage.stderr, /import needs the export file/);
  assert.equal(run('import', alex, '--nope').status, 2);
  assert.equal(run('import', alex, 'extra').status, 2);

  for (const [args, re] of [
    [[path.join(t.home, 'nope.json')], /^bragdoc: there's no file ~\/nope\.json\n$/],
    [[t.home], /is a folder/],
    [[path.join(FIXTURES_DIR, 'corrupt.json')], /^bragdoc: can't import .*corrupt\.json: The file isn't valid JSON/],
    [[path.join(FIXTURES_DIR, 'version-2.json')], /version "2\.0"/],
  ] as [string[], RegExp][]) {
    const r = run('import', ...args);
    assert.equal(r.status, 1, r.stderr);
    assert.match(r.stderr, re);
    assert.doesNotMatch(r.stderr, /\n\s+at /, 'no stack trace');
  }

  const dry = run('import', alex, '--dry-run');
  assert.equal(dry.status, 0, dry.stderr);
  assert.match(dry.stdout, /^Dry run of importing .*alex-marlowe\.json \(exported 2026-01-15\)\./);
  assert.match(dry.stdout, /achievements\s+8\s+0\s+0/);
  assert.match(dry.stdout, /Nothing has been written\./);
  assert.equal(fs.existsSync(t.dataDir), false, 'a dry run on a new data home creates nothing');

  const real = run('import', alex);
  assert.equal(real.status, 0, real.stderr);
  assert.match(real.stdout, /^Imported .*\n/);
  assert.equal(files(t.dataDir).filter((f) => f.startsWith('achievements/')).length, 8);
  assert.ok(fs.existsSync(path.join(t.dataDir, 'config.yaml')), 'the data home is laid out as serve would');
  const again = run('import', alex);
  assert.match(again.stdout, /Everything in it was already here/);

  // with BragDoc running, the import goes through it
  const child = spawn(process.execPath, [...CLI, 'serve', '--port', '0'], { cwd: ROOT, env: t.env });
  try {
    await new Promise<void>((resolve, reject) => {
      let out = '';
      const timer = setTimeout(() => reject(new Error(`no banner: ${out}`)), 15_000);
      child.stdout!.on('data', (d) => {
        out += d;
        if (/^BragDoc on /.test(out)) {
          clearTimeout(timer);
          resolve();
        }
      });
      child.on('exit', (code) => reject(new Error(`exited ${code}: ${out}`)));
    });
    const more = path.join(t.home, 'more.json');
    fs.writeFileSync(more, json(exportOf({ achievements: [achievement(501), achievement(502), achievement(503, { createdAt: 'soon' })] })));
    const via = run('import', more);
    assert.equal(via.status, 0, via.stderr);
    assert.match(via.stderr, /^Importing through the running BragDoc \(http:\/\/localhost:\d+\)\./);
    assert.match(via.stdout, /achievements\s+2\s+0\s+1/);
    assert.match(fs.readFileSync(path.join(t.dataDir, 'logs', 'network.jsonl'), 'utf8'), /"purpose":"import\.apply"/);
  } finally {
    await stopChild(child);
  }
});

test('an export with nothing in it imports nothing, and says so', async () => {
  const h = home();
  const r = await importInto(h, exportOf());
  assert.equal(r.snapshot, null);
  assert.match(formatReport({ ...r, dryRun: true }), /There is nothing in it to import\./);
});
