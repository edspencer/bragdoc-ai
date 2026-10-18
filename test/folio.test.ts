// Folio (PR14): presets, the URL state, filters and exclusions, grouping, the markdown (pinned in full below), what a
// clipping may carry (no paths, no localhost URLs, no ids: D53), and GET /api/folio over a real store.
import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Hono } from 'hono';
import { EventBus } from '../server/events.ts';
import { createApp } from '../server/index.ts';
import type { FolioResponse } from '../shared/api.ts';
import {
  NO_PROJECT,
  baseName,
  exportName,
  firstParagraph,
  folioDoc,
  isDay,
  matching,
  mdText,
  presetOf,
  presets,
  readSearch,
  shareableUrl,
  toClipping,
  toMarkdown,
  writeSearch,
  type FolioFilter,
  type FolioItem,
} from '../shared/folio.ts';
import { storeHome, type StoreHome } from './store-fixture.ts';

const P1 = '01JPROJECT00000000000000P1';
const P2 = '01JPROJECT00000000000000P2';
const C1 = '01JCOMPANY00000000000000C1';

function item(id: string, over: Partial<FolioItem> = {}): FolioItem {
  return { id, title: `Item ${id}`, happenedAt: '2026-09-01', projects: [], evidence: [], ...over };
}

const DATA: FolioResponse = {
  from: '2026-07-01',
  to: '2026-09-30',
  author: 'Alex Marlowe',
  projects: [
    { id: P1, name: 'Pre-flight checklist', color: '#ef5a3c', companyId: C1 },
    { id: P2, name: 'Incident tooling', color: '#a25ddc', companyId: null },
  ],
  companies: [{ id: C1, name: 'Altimetry' }],
  items: [
    item('a1', {
      title: 'Offline sync survived its first real weekend',
      summary: 'Crews ran 140 checklists on flaky Wi-Fi.',
      happenedAt: '2026-09-13',
      impact: 8,
      projects: [P1],
      evidence: [
        { kind: 'quote', text: 'Not one conflict all weekend.', from: 'Imani Okafor', where: '#preflight' },
        { kind: 'github_pr', ref: 'altimetry/preflight-web#341', url: 'https://github.com/altimetry/preflight-web/pull/341', title: 'CRDT merge' },
        { kind: 'image', name: 'sync-dashboard.png' },
      ],
    }),
    item('a2', { title: 'Pager bot drafts the incident timeline', happenedAt: '2026-08-06', impact: 7, projects: [P2, P1], evidence: [{ kind: 'url', url: 'https://wiki.example.com/oncall', domain: 'wiki.example.com' }] }),
    item('a3', { title: 'Welcome talk for the August hires', happenedAt: '2026-08-21', projects: [], evidence: [{ kind: 'pdf' }] }),
    item('a4', { title: 'Audit export (PDF/CSV) for the regulator', happenedAt: '2026-09-09', endedAt: '2026-09-12', impact: 7, projects: [P1], evidence: [{ kind: 'url', title: 'Local preview' }] }),
    item('a5', { title: 'Before the window', happenedAt: '2026-06-30', impact: 9, projects: [P1] }),
  ],
};

const filter = (over: Partial<FolioFilter> = {}): FolioFilter => ({ from: '2026-07-01', to: '2026-09-30', projects: [], minImpact: 0, exclude: [], group: 'project', ...over });

describe('presets and dates', () => {
  test('presets are worked out from today, and "this …" runs to today', () => {
    const ps = Object.fromEntries(presets('2026-10-17').map((p) => [p.id, [p.from, p.to]]));
    assert.deepEqual(ps, {
      'this-quarter': ['2026-10-01', '2026-10-17'],
      'last-quarter': ['2026-07-01', '2026-09-30'],
      'last-6-months': ['2026-04-17', '2026-10-17'],
      'this-year': ['2026-01-01', '2026-10-17'],
      'last-year': ['2025-01-01', '2025-12-31'],
    });
    // January: last quarter is last year's Q4; six months back crosses the year
    const jan = Object.fromEntries(presets('2026-01-15').map((p) => [p.id, [p.from, p.to]]));
    assert.deepEqual(jan['last-quarter'], ['2025-10-01', '2025-12-31']);
    assert.deepEqual(jan['last-6-months'], ['2025-07-15', '2026-01-15']);
    // 31 August: six months back is February, which has no 31st
    assert.deepEqual(presets('2026-08-31').find((p) => p.id === 'last-6-months')!.from, '2026-02-28');
    assert.equal(presetOf('2026-07-01', '2026-09-30', '2026-10-17'), 'last-quarter');
    assert.equal(presetOf('2026-07-02', '2026-09-30', '2026-10-17'), undefined);
  });

  test('isDay accepts real calendar days only', () => {
    assert.ok(isDay('2024-02-29'));
    for (const bad of ['2026-02-30', '2026-13-01', '26-01-01', '2026-1-1', '', 20260101, null]) assert.equal(isDay(bad), false, String(bad));
  });
});

describe('the URL state', () => {
  test('defaults to the last six months; a round trip keeps everything', () => {
    const d = readSearch({}, '2026-10-17');
    assert.deepEqual(d, { from: '2026-04-17', to: '2026-10-17', projects: [], minImpact: 0, exclude: [], group: 'project' });
    const f = filter({ projects: [P1, NO_PROJECT], company: C1, minImpact: 5, exclude: ['a2', 'a3'], group: 'week' });
    const s = writeSearch(f);
    assert.deepEqual(s, { from: '2026-07-01', to: '2026-09-30', p: `${P1},none`, c: C1, min: 5, out: 'a2,a3', group: 'week' });
    assert.deepEqual(readSearch(s, '2026-10-17'), f);
  });

  test('a mangled link still opens: bad values are dropped, a backwards window is swapped', () => {
    const f = readSearch({ from: '2026-09-30', to: '2026-07-01', p: 'x,<script>', c: 'a b', min: 'eleven', out: 'ok1,ok2', group: 'year' }, '2026-10-17');
    assert.equal(f.from, '2026-07-01');
    assert.equal(f.to, '2026-09-30');
    assert.deepEqual(f.projects, []);
    assert.equal(f.company, undefined);
    assert.equal(f.minImpact, 0);
    assert.deepEqual(f.exclude, ['ok1', 'ok2']);
    assert.equal(f.group, 'project');
    assert.equal(readSearch({ from: '2026-02-30' }, '2026-10-17').from, '2026-04-17');
    assert.equal(readSearch({ from: '2026-01-01' }, '2026-10-17').to, '2026-10-17'); // from alone: to today
    assert.equal(readSearch({ min: 7 }, '2026-10-17').minImpact, 7); // the router hands numbers over as numbers
  });
});

describe('filters and exclusions', () => {
  test('the window, impact (unrated left out once there is a minimum), projects, "no project" and company', () => {
    const ids = (f: Partial<FolioFilter>) => matching(DATA, filter(f)).map((a) => a.id);
    assert.deepEqual(ids({}), ['a1', 'a4', 'a2', 'a3']); // best first: 8, 7 (newer), 7, unrated
    assert.deepEqual(ids({ minImpact: 8 }), ['a1']);
    assert.deepEqual(ids({ minImpact: 1 }), ['a1', 'a4', 'a2']);
    assert.deepEqual(ids({ projects: [P2] }), ['a2']);
    assert.deepEqual(ids({ projects: [NO_PROJECT] }), ['a3']);
    assert.deepEqual(ids({ projects: [P2, NO_PROJECT] }), ['a2', 'a3']);
    assert.deepEqual(ids({ company: C1 }), ['a1', 'a4', 'a2']); // a2 is in P1 too
    assert.deepEqual(ids({ from: '2026-06-01' })[0], 'a5');
  });

  test('a filter on a project or company that no longer exists counts for nothing (deleted mid-session)', () => {
    const gone = '01JPROJECT0000000000000GON';
    assert.equal(matching(DATA, filter({ projects: [gone] })).length, 4);
    assert.equal(matching(DATA, filter({ company: '01JCOMPANY00000000000000XX' })).length, 4);
    assert.deepEqual(folioDoc(DATA, filter({ projects: [gone] })).scope, []);
  });

  test('excluded items stay in the list but leave the document', () => {
    const f = filter({ exclude: ['a1', 'a3'] });
    assert.equal(matching(DATA, f).length, 4);
    const doc = folioDoc(DATA, f);
    assert.equal(doc.count, 2);
    assert.deepEqual(doc.sections.flatMap((s) => s.items.map((a) => a.id)), ['a4', 'a2']);
    assert.doesNotMatch(toMarkdown(doc), /Offline sync|Welcome talk/);
  });
});

describe('the document', () => {
  test('grouped by project: the markdown, in full', () => {
    assert.equal(
      toMarkdown(folioDoc(DATA, filter())),
      `# Alex Marlowe: achievements

_1 July 2026 – 30 September 2026 · 4 achievements_

## Pre-flight checklist (Altimetry)

- **Offline sync survived its first real weekend** · 13 Sep 2026 · impact 8/10
  Crews ran 140 checklists on flaky Wi-Fi.
  - PR: [altimetry/preflight-web#341: CRDT merge](https://github.com/altimetry/preflight-web/pull/341)
  - Screenshot: sync-dashboard.png
  > Not one conflict all weekend.
  >
  > — Imani Okafor, #preflight
- **Audit export (PDF/CSV) for the regulator** · 9 Sep 2026 – 12 Sep 2026 · impact 7/10
  - Link: Local preview (a local address, left out)

## Incident tooling

- **Pager bot drafts the incident timeline** · 6 Aug 2026 · impact 7/10
  - Link: [wiki.example.com](https://wiki.example.com/oncall)

## No project

- **Welcome talk for the August hires** · 21 Aug 2026
  - Document: a PDF
`,
    );
  });

  test('grouped by month, filtered: the markdown names projects and says what was filtered', () => {
    assert.equal(
      toMarkdown(folioDoc({ ...DATA, author: null }, filter({ group: 'month', projects: [P1], minImpact: 7 }))),
      `# Achievements

_1 July 2026 – 30 September 2026 · 3 achievements_

_Project: Pre-flight checklist · Impact 7 and up_

## September 2026

- **Offline sync survived its first real weekend** · 13 Sep 2026 · Pre-flight checklist · impact 8/10
  Crews ran 140 checklists on flaky Wi-Fi.
  - PR: [altimetry/preflight-web#341: CRDT merge](https://github.com/altimetry/preflight-web/pull/341)
  - Screenshot: sync-dashboard.png
  > Not one conflict all weekend.
  >
  > — Imani Okafor, #preflight
- **Audit export (PDF/CSV) for the regulator** · 9 Sep 2026 – 12 Sep 2026 · Pre-flight checklist · impact 7/10
  - Link: Local preview (a local address, left out)

## August 2026

- **Pager bot drafts the incident timeline** · 6 Aug 2026 · Incident tooling, Pre-flight checklist · impact 7/10
  - Link: [wiki.example.com](https://wiki.example.com/oncall)
`,
    );
  });

  test('by project, a multi-project item goes under the first project the filter kept, once', () => {
    const doc = folioDoc(DATA, filter({ projects: [P1] }));
    assert.deepEqual(
      doc.sections.map((s) => [s.heading, s.items.map((a) => a.id)]),
      [['Pre-flight checklist', ['a1', 'a4', 'a2']]],
    );
  });

  test('by week: Monday headings, newest first', () => {
    const doc = folioDoc(DATA, filter({ group: 'week' }));
    assert.deepEqual(
      doc.sections.map((s) => s.heading),
      ['Week of 7 September 2026', 'Week of 17 August 2026', 'Week of 3 August 2026'],
    );
  });

  test('nothing picked, and the file name', () => {
    const md = toMarkdown(folioDoc(DATA, filter({ from: '2020-01-01', to: '2020-01-31' })));
    assert.match(md, /· 0 achievements_\n\nNothing picked\.\n$/);
    assert.equal(exportName(filter()), 'bragdoc-2026-07-01-2026-09-30.md');
  });

  test('markdown syntax in titles is escaped, not interpreted; a multi-line quote stays one blockquote', () => {
    assert.equal(mdText('snake_case [WIP] *bold* <b> a|b `x` \\'), 'snake\\_case \\[WIP\\] \\*bold\\* \\<b\\> a\\|b \\`x\\` \\\\');
    const md = toMarkdown(folioDoc({ ...DATA, items: [item('q', { title: 'Q', evidence: [{ kind: 'quote', text: 'Line one\nLine two' }] })] }, filter()));
    assert.match(md, /\n {2}> Line one\n {2}> Line two\n$/);
  });

  test('500 items: the document is built quickly', () => {
    const items = Array.from({ length: 500 }, (_, i) => item(`b${i}`, { title: `Bulk ${i}`, happenedAt: `2026-08-${String(1 + (i % 28)).padStart(2, '0')}`, impact: 1 + (i % 10), projects: [i % 2 ? P1 : P2] }));
    const t = performance.now();
    const md = toMarkdown(folioDoc({ ...DATA, items }, filter()));
    assert.ok(performance.now() - t < 200);
    assert.equal(md.match(/^- \*\*/gm)?.length, 500);
  });
});

describe('clippings carry nothing that points back at this machine (D53)', () => {
  const has = { project: (id: string) => id === P1, company: () => false };

  test('urls: only http(s), and never a local address', () => {
    assert.equal(shareableUrl('https://github.com/a/b/pull/1'), 'https://github.com/a/b/pull/1');
    for (const u of ['http://localhost:2724/api/evidence/abc', 'http://127.0.0.1/x', 'http://[::1]:3000/', 'http://0.0.0.0/', 'http://app.localhost/', 'http://printer.local/', 'file:///Users/alex/a.pdf', 'javascript:alert(1)', 'not a url'])
      assert.equal(shareableUrl(u), undefined, u);
  });

  test('files by name only; ids and dangling references dropped; summary from the body when there is none', () => {
    const c = toClipping(
      {
        id: '01JACHIEVE000000000000000A',
        title: 'T',
        body: '# Heading\n\nFirst para\nwraps here.\n\nSecond para.',
        happenedAt: '2026-09-01',
        endedAt: null,
        projects: [P1, '01JPROJECT0000000000000GON'],
        companyId: '01JCOMPANY00000000000000XX',
        evidence: [
          { kind: 'image', blob: 'a'.repeat(64) },
          { kind: 'pdf', blob: 'b'.repeat(64), title: '/Users/alex/Documents/review.pdf' },
          { kind: 'file', blob: 'c'.repeat(64), title: 'The deck we showed' },
          { kind: 'file', blob: 'd'.repeat(64) },
          { kind: 'github_pr', externalKey: 'github_pr:acme/app#12' },
          { kind: 'github_pr', url: 'https://github.com/Acme/App/pull/13/files' },
          { kind: 'url', url: 'http://localhost:5173/preview', title: 'Preview' },
          { kind: 'quote', quote: { text: 'Nice.' } },
        ],
      },
      (sha) => ({ ['a'.repeat(64)]: 'C:\\Users\\alex\\Desktop\\shot.png', ['d'.repeat(64)]: undefined })[sha],
      has,
    );
    assert.deepEqual(c, {
      id: '01JACHIEVE000000000000000A',
      title: 'T',
      summary: 'First para wraps here.',
      happenedAt: '2026-09-01',
      projects: [P1],
      evidence: [
        { kind: 'image', name: 'shot.png' },
        { kind: 'pdf', name: 'review.pdf' },
        { kind: 'file', name: 'The deck we showed' },
        { kind: 'file' },
        { kind: 'github_pr', ref: 'acme/app#12', url: 'https://github.com/acme/app/pull/12' },
        { kind: 'github_pr', ref: 'Acme/App#13', url: 'https://github.com/Acme/App/pull/13/files' },
        { kind: 'url', title: 'Preview' },
        { kind: 'quote', text: 'Nice.' },
      ],
    });
    const md = toMarkdown(folioDoc({ ...DATA, items: [c] }, filter({ from: '2026-01-01', to: '2026-12-31' })));
    assert.doesNotMatch(md, /01J[0-9A-Z]{23}|localhost|Users|\\\\|[a-f0-9]{64}/);
  });

  test('helpers', () => {
    assert.equal(baseName('/a/b/c.png'), 'c.png');
    assert.equal(baseName('C:\\x\\y.pdf'), 'y.pdf');
    assert.equal(baseName('  '), undefined);
    assert.equal(firstParagraph('```\ncode\n```\n\n- one\n- two'), 'one two');
    assert.equal(firstParagraph(''), undefined);
    assert.equal(firstParagraph('x'.repeat(500))!.length, 400);
  });
});

describe('GET /api/folio', () => {
  const ORIGIN = 'http://localhost:2724';
  let h: StoreHome;
  let app: Hono;
  beforeEach(() => {
    h = storeHome();
    app = createApp({ dataDir: h.home, webDist: null, store: h.store, bus: new EventBus() });
  });
  afterEach(() => h.cleanup());
  const get = (p: string) => app.request(`${ORIGIN}${p}`, { headers: { host: 'localhost:2724' } });

  test('the window, archived left out, newest first, with names and nothing else', async () => {
    const co = h.services.companies.create({ name: 'Altimetry' });
    const p = h.services.projects.create({ name: 'Pre-flight', color: '#ef5a3c', start: '2026-01-01', companyId: co.id });
    const mk = (title: string, happenedAt: string, extra: Record<string, unknown> = {}) => h.services.achievements.create({ title, happenedAt, projects: [p.id], ...extra }).achievement;
    mk('Old', '2026-06-30');
    const a = mk('In', '2026-07-01', { impact: 6, evidence: [{ kind: 'url', url: 'http://localhost:2724/x' }] });
    mk('Later', '2026-09-30');
    h.services.achievements.archive(mk('Archived', '2026-08-01').id);
    h.services.profile.set({ name: 'Alex Marlowe' });

    const r = await get('/api/folio?from=2026-07-01&to=2026-09-30');
    assert.equal(r.status, 200);
    const body = (await r.json()) as FolioResponse;
    assert.equal(body.author, 'Alex Marlowe');
    assert.deepEqual(body.items.map((i) => i.title), ['Later', 'In']);
    assert.deepEqual(body.items[1], { id: a.id, title: 'In', happenedAt: '2026-07-01', impact: 6, projects: [p.id], evidence: [{ kind: 'url' }] });
    assert.deepEqual(body.projects, [{ id: p.id, name: 'Pre-flight', color: '#ef5a3c', companyId: co.id }]);
    assert.deepEqual(body.companies, [{ id: co.id, name: 'Altimetry' }]);
  });

  test('bad windows are 400s with a sentence', async () => {
    for (const q of ['', '?from=2026-07-01', '?from=2026-07-01&to=2026-02-30', '?from=2026-09-01&to=2026-07-01', '?from=1900-01-01&to=2026-01-01', '?from=2026-07-01&to=2026-09-30&x=1']) {
      const r = await get(`/api/folio${q}`);
      assert.equal(r.status, 400, q);
      assert.match(((await r.json()) as { error: { message: string } }).error.message, /\w/);
    }
  });

  test('an empty data home is an empty folio, not an error', async () => {
    const body = (await (await get('/api/folio?from=2026-01-01&to=2026-12-31')).json()) as FolioResponse;
    assert.deepEqual(body, { from: '2026-01-01', to: '2026-12-31', author: null, items: [], projects: [], companies: [] });
  });
});
