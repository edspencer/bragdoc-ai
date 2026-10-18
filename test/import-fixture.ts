// Synthetic exports from the hosted BragDoc app (version 1.0), for the importer's tests and smoke-pack. Everything here
// is made up (Alex Marlowe, Northwind Labs, example repos); ids are deterministic so fixtures are stable.
// `node --import tsx test/import-fixture.ts` rewrites the small ones in test/fixtures/import/ (the 5,000-achievement
// one is built by the test that uses it, rather than committed).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** A deterministic UUID: `kind` picks the block, `n` the item. */
export const uuid = (kind: number, n: number) => `${kind.toString(16).padStart(8, '0')}-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;

const USER = uuid(0xaaaa, 1);
const t = (d: string) => new Date(`${d}T00:00:00.000Z`).toISOString();

export type Json = Record<string, unknown>;

export function company(n: number, o: Json = {}): Json {
  return { id: uuid(1, n), userId: USER, name: `Company ${n}`, domain: `company${n}.example.com`, role: 'Engineer', startDate: t('2021-01-04'), endDate: null, ...o };
}

export function project(n: number, o: Json = {}): Json {
  return {
    id: uuid(2, n),
    userId: USER,
    companyId: null,
    name: `Project ${n}`,
    description: null,
    status: 'active',
    color: '#3b6cf6',
    startDate: t('2022-02-01'),
    endDate: null,
    repoRemoteUrl: null,
    createdAt: t('2022-02-01'),
    updatedAt: t('2022-02-01'),
    ...o,
  };
}

export function achievement(n: number, o: Json = {}): Json {
  const day = new Date(Date.UTC(2023, 0, 2) + (n % 900) * 86400000).toISOString();
  return {
    id: uuid(3, n),
    userId: USER,
    companyId: null,
    projectId: null,
    userMessageId: null,
    title: `Achievement ${n}`,
    summary: null,
    details: null,
    eventStart: day,
    eventEnd: null,
    eventDuration: 'week',
    isArchived: false,
    source: 'manual',
    impact: 2,
    impactSource: 'user',
    impactUpdatedAt: typeof o.eventStart === 'string' ? o.eventStart : day,
    // added when it happened, unless the test says otherwise
    createdAt: typeof o.eventStart === 'string' ? o.eventStart : day,
    updatedAt: typeof o.eventStart === 'string' ? o.eventStart : day,
    ...o,
  };
}

export function exportOf(o: Partial<Record<'companies' | 'projects' | 'achievements' | 'documents' | 'performanceReviews', unknown[]>> & Json = {}): Json {
  return { version: '1.0', exportedAt: '2026-01-15T20:16:17.782Z', userId: USER, companies: [], projects: [], achievements: [], documents: [], ...o };
}

/** The full one: two companies, four projects (two sharing a repo in different spellings), achievements of every kind, documents. */
export function alexExport(): Json {
  const northwind = company(1, { name: 'Northwind Labs', domain: 'northwind.example.com', role: 'Senior Engineer', startDate: t('2021-03-01') });
  const acme = company(2, { name: 'Acme Robotics', domain: 'acme.example.com', role: 'Staff Engineer', startDate: t('2024-06-03'), endDate: null });
  northwind.endDate = t('2024-05-31');
  const atlas = project(1, {
    companyId: northwind.id,
    name: 'Atlas search',
    description: 'Rebuilt product search on a new index.',
    status: 'completed',
    color: '#ef5a3c',
    startDate: t('2022-01-10'),
    endDate: t('2023-04-28'),
    repoRemoteUrl: 'git@github.com:example/atlas.git',
  });
  const atlasApi = project(2, {
    companyId: northwind.id,
    name: 'Atlas API',
    status: 'archived',
    color: '#14a3a3',
    startDate: t('2023-01-09'),
    endDate: t('2023-11-30'),
    repoRemoteUrl: 'https://github.com/example/atlas',
  });
  const onboarding = project(3, { companyId: acme.id, name: 'Onboarding revamp', description: 'New-hire onboarding, start to finish.', color: '#2fb37e', startDate: t('2024-07-01'), repoRemoteUrl: 'https://github.com/example/onboarding.git' });
  const mentoring = project(4, { companyId: null, name: 'Mentoring', color: '#a25ddc', startDate: t('2022-09-01') });
  const a = (n: number, o: Json) => achievement(n, o);
  const achievements = [
    a(1, { projectId: atlas.id, companyId: northwind.id, title: 'Shipped the new search index', summary: 'Search p95 latency down from 900 ms to 120 ms.', details: 'Cut over **all** traffic in one week.\n\n- zero downtime\n- rollback plan rehearsed', eventStart: t('2022-11-14'), eventEnd: t('2022-11-18'), impact: 9, impactSource: 'user', source: 'manual' }),
    a(2, { projectId: atlas.id, companyId: northwind.id, title: 'Wrote the relevance tuning guide', eventStart: t('2023-02-06'), impact: 5, impactSource: 'llm', source: 'llm', eventDuration: 'month' }),
    a(3, { projectId: atlasApi.id, companyId: northwind.id, title: 'Versioned the public API', summary: 'v2 with a deprecation window.', eventStart: t('2023-06-12'), impact: 7, source: 'commit', eventDuration: 'quarter' }),
    a(4, { projectId: onboarding.id, companyId: acme.id, title: 'Cut new-hire setup from two days to two hours', eventStart: t('2024-09-02'), impact: 8, impactSource: 'user', embedding: [0.12, -0.4, 0.33], embeddingModel: 'text-embedding-3-small', embeddingGeneratedAt: t('2024-09-03') }),
    a(5, { projectId: mentoring.id, title: 'Mentored two interns to return offers', eventStart: t('2023-08-25'), impact: 6, eventDuration: 'half year' }),
    a(6, { projectId: null, companyId: acme.id, title: 'Spoke at the internal tech summit', eventStart: t('2025-03-20'), impact: 4, impactSource: 'llm', userMessageId: uuid(9, 1) }),
    a(7, { projectId: atlas.id, title: 'Retired the old search cluster', eventStart: null, createdAt: t('2023-05-02'), updatedAt: t('2023-05-03'), impact: null, impactSource: null, isArchived: true }),
    a(8, { projectId: onboarding.id, companyId: acme.id, title: 'Ran the onboarding survey', eventStart: t('2025-01-13'), impact: 3, isArchived: null }),
  ];
  const documents = [
    { id: uuid(4, 1), createdAt: t('2024-05-20'), updatedAt: t('2024-05-21'), title: 'H1 2024 self-review', content: '# H1 2024\n\nI led the search rebuild.\n', userId: USER, companyId: northwind.id, type: 'performance_review', shareToken: 'tok_example_123' },
    { id: uuid(4, 2), createdAt: t('2025-01-06'), updatedAt: t('2025-01-06'), title: 'Weekly update: week 1', content: 'Onboarding survey launched.', userId: USER, companyId: acme.id, type: 'weekly_report', shareToken: null },
  ];
  return exportOf({ companies: [northwind, acme], projects: [atlas, atlasApi, onboarding, mentoring], achievements, documents });
}

/** Every nullable field null (and the optional performanceReviews key absent). */
export function allNullsExport(): Json {
  return exportOf({
    companies: [company(1, { domain: null, role: '', endDate: null })],
    projects: [project(1, { companyId: null, description: null, endDate: null, repoRemoteUrl: null, status: '', color: '' })],
    achievements: [
      achievement(1, {
        companyId: null,
        projectId: null,
        userMessageId: null,
        summary: null,
        details: null,
        eventStart: null,
        eventEnd: null,
        isArchived: null,
        impact: null,
        impactSource: null,
        impactUpdatedAt: null,
      }),
    ],
    documents: [{ id: uuid(4, 1), createdAt: t('2025-01-06'), updatedAt: t('2025-01-06'), title: 'Notes', content: null, userId: USER, companyId: null, type: null, shareToken: null }],
  });
}

/** The optional and nullable fields left out entirely, as a hand-trimmed or older export might. */
export function missingOptionalExport(): Json {
  const ex: Json = {
    version: '1.0',
    companies: [{ id: uuid(1, 1), name: 'Northwind Labs' }],
    projects: [{ id: uuid(2, 1), name: 'Atlas search', companyId: uuid(1, 1) }],
    achievements: [{ id: uuid(3, 1), title: 'Shipped it', createdAt: t('2024-02-01') }, { id: uuid(3, 2), title: 'Also this', createdAt: t('2024-02-08'), projectId: uuid(2, 1) }],
  };
  return ex;
}

/** References to things the export doesn't contain, plus a few items that can't be imported at all. */
export function orphansExport(): Json {
  return exportOf({
    companies: [company(1)],
    projects: [project(1, { companyId: uuid(1, 99) }), project(2, { color: 'blue', status: 'on hold' })],
    achievements: [
      achievement(1, { projectId: uuid(2, 99) }),
      achievement(2, { companyId: uuid(1, 98) }),
      achievement(3, { projectId: uuid(2, 2) }),
      achievement(4, { title: '', summary: 'Fixed the flaky deploy\nand more' }),
      achievement(5, { impact: 42 }),
      achievement(6, { createdAt: 'last tuesday' }),
      { id: uuid(3, 7), userId: USER },
      'not an object',
      achievement(1, { title: 'A repeat of achievement 1' }),
    ],
    performanceReviews: [{ id: uuid(5, 1), userId: USER, name: 'Annual review 2025', startDate: t('2025-01-01'), endDate: t('2025-12-31'), instructions: 'Focus on impact.', documentId: uuid(4, 77), createdAt: t('2025-11-01'), updatedAt: t('2025-11-01') }],
  });
}

/** `n` achievements over a few companies and projects (the large-export test: 5,000). */
export function bigExport(n: number): Json {
  const companies = [1, 2, 3].map((i) => company(i));
  const projects = Array.from({ length: 12 }, (_, i) => project(i + 1, { companyId: companies[i % 3]!.id, repoRemoteUrl: i % 2 ? `https://github.com/example/repo-${i}` : null }));
  const achievements = Array.from({ length: n }, (_, i) =>
    achievement(i + 1, { projectId: projects[i % 12]!.id, summary: `Summary for achievement ${i + 1}.`, details: `Some details about achievement ${i + 1}.\n`, embedding: [0.1, 0.2, 0.3] }),
  );
  return exportOf({ companies, projects, achievements });
}

export const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'import');

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const json = (o: unknown) => JSON.stringify(o, null, 2) + '\n';
  const files: Record<string, string> = {
    'alex-marlowe.json': json(alexExport()),
    'all-nulls.json': json(allNullsExport()),
    'missing-optional.json': json(missingOptionalExport()),
    'orphans.json': json(orphansExport()),
    'version-2.json': json({ ...alexExport(), version: '2.0' }),
    // cut off part-way, as an interrupted download would be
    'corrupt.json': json(alexExport()).slice(0, 700),
  };
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(FIXTURES_DIR, name), text);
  process.stdout.write(`wrote ${Object.keys(files).length} fixtures to ${path.relative(process.cwd(), FIXTURES_DIR)}\n`);
}
