// Example data (SPEC R10): "Fill it with example data" on the empty board, "Remove example data" in Settings → Data.
// The dataset is a few months in the working life of Alex Marlowe, a made-up engineer at two made-up companies, with
// their projects, repos, pull requests, quotes, screenshots and documents. It ships with the package in
// fixtures/example/ (example.json plus the evidence files; scripts/gen-example.ts makes them), and the same dataset
// feeds the e2e specs and the docs' screenshots, so it's deterministic: the same entries every time, with dates moved
// by whole weeks so the newest lands in the last seven days (a board of last year's work would look abandoned).
//
// Adapted from Local Review's server/examples.ts: every entry is marked `example: true`; adding only ever creates
// (an entry already there is left alone, so adding twice adds nothing); removing takes away exactly the entries marked
// `example: true` and nothing of yours. Removing goes through the services like any delete: files move to
// backups/removed/ (nothing is unlinked), and a project, repo or company is also taken off anything of yours that
// refers to it (D45's detach), so nothing is left dangling. Evidence files stay in evidence/, content-addressed: one
// of yours may be the same file.
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { ExampleCounts, ExampleStatus } from '../shared/api.js';
import type { Evidence } from '../shared/schema/index.js';
import { PACKAGE_ROOT } from './paths.js';
import type { Services } from './services/index.js';
import { today } from './services/util.js';
import { ConflictError, NotFoundError, ValidationError, type Store } from './store/index.js';

export const EXAMPLE_DIR = path.join(PACKAGE_ROOT, 'fixtures', 'example');
/** An example achievement's externalKey: `example:<key>`, so adding it again finds the one already there. */
export const EXAMPLE_KEY_PREFIX = 'example:';

const isoDate = z.iso.date();
const EvidenceSpec = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('file'), file: z.string().regex(/^evidence\/[\w.-]+$/), title: z.string().optional() }),
  z.strictObject({ kind: z.literal('github_pr'), repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/), number: z.number().int().positive(), title: z.string(), mergedAt: isoDate.optional(), additions: z.number().int().optional(), deletions: z.number().int().optional() }),
  z.strictObject({ kind: z.literal('url'), url: z.url(), title: z.string().optional() }),
  z.strictObject({ kind: z.literal('quote'), text: z.string(), from: z.string().optional(), where: z.string().optional() }),
]);
export type ExampleEvidence = z.infer<typeof EvidenceSpec>;

export const ExampleDatasetSchema = z.strictObject({
  /** The day the dataset was written as of: every date moves by the same whole number of weeks from here. */
  anchor: isoDate,
  companies: z.array(z.strictObject({ key: z.string(), name: z.string(), role: z.string().optional(), start: isoDate, end: isoDate.optional() })),
  repos: z.array(z.strictObject({ key: z.string(), remoteUrl: z.url() })),
  projects: z.array(
    z.strictObject({
      key: z.string(),
      name: z.string(),
      description: z.string().optional(),
      color: z.string().regex(/^#[0-9a-f]{6}$/),
      start: isoDate,
      end: isoDate.optional(),
      status: z.enum(['active', 'paused', 'done', 'archived']).optional(),
      company: z.string().optional(),
      repos: z.array(z.string()).default([]),
    }),
  ),
  achievements: z.array(
    z.strictObject({
      key: z.string(),
      title: z.string(),
      summary: z.string().optional(),
      body: z.string().optional(),
      happenedAt: isoDate,
      impact: z.number().int().min(1).max(10).optional(),
      projects: z.array(z.string()).default([]),
      repos: z.array(z.string()).default([]),
      source: z.enum(['manual', 'paste', 'github-pr', 'screenshot', 'mcp']),
      sourceAgent: z.string().optional(),
      evidence: z.array(EvidenceSpec).default([]),
    }),
  ),
});
export type ExampleDataset = z.infer<typeof ExampleDatasetSchema>;

let cached: ExampleDataset | null = null;

/** The shipped dataset, checked. A missing or broken one is a bug in the package: it throws. */
export function loadDataset(dir = EXAMPLE_DIR): ExampleDataset {
  if (dir === EXAMPLE_DIR && cached) return cached;
  const d = ExampleDatasetSchema.parse(JSON.parse(fs.readFileSync(path.join(dir, 'example.json'), 'utf8')));
  if (dir === EXAMPLE_DIR) cached = d;
  return d;
}

const DAY = 86_400_000;
const toTime = (d: string) => Date.parse(`${d}T00:00:00Z`);
const toIso = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Whole weeks to add to the dataset's dates so its anchor falls in the 7 days up to `asOf` (never after it). */
export function weekShift(anchor: string, asOf: string): number {
  return Math.floor((toTime(asOf) - toTime(anchor)) / (7 * DAY)) * 7;
}
export const shiftDate = (d: string, days: number) => toIso(toTime(d) + days * DAY);

export function counts(store: Store): ExampleCounts {
  return {
    achievements: store.all('achievement').filter((a) => a.example).length,
    projects: store.all('project').filter((p) => p.example).length,
    companies: store.all('company').filter((c) => c.example).length,
    repos: store.all('repo').filter((r) => r.example).length,
  };
}

export function status(store: Store): ExampleStatus {
  const c = counts(store);
  return { present: Object.values(c).some((n) => n > 0), counts: c };
}

/** The add or remove running for a store: a second add waits for it, a remove meanwhile is refused. */
const busy = new WeakMap<Store, { kind: 'add' | 'remove'; done: Promise<unknown> }>();

/**
 * Add the example data (what isn't there yet). `asOf` (YYYY-MM-DD) is "today" for placing the dates; it defaults to
 * the store's today. Returns how many of each were created.
 */
export function addExample(store: Store, services: Services, opts: { asOf?: string; dir?: string } = {}): Promise<ExampleCounts> {
  const running = busy.get(store);
  if (running?.kind === 'remove') return Promise.reject(new ConflictError('the example data is being removed; try again in a moment'));
  if (running) return running.done.then(() => addExample(store, services, opts));
  const done = add(store, services, opts).finally(() => busy.delete(store));
  busy.set(store, { kind: 'add', done });
  return done;
}

async function add(store: Store, services: Services, opts: { asOf?: string; dir?: string }): Promise<ExampleCounts> {
  const dir = opts.dir ?? EXAMPLE_DIR;
  const d = loadDataset(dir);
  const shift = weekShift(d.anchor, opts.asOf ?? today(store));
  const at = (s: string) => shiftDate(s, shift);
  const made: ExampleCounts = { achievements: 0, projects: 0, companies: 0, repos: 0 };

  // example entries already here, by name (projects, companies) or remote (repos): left as they are
  const companyIds = new Map<string, string>();
  for (const c of d.companies) {
    const have = store.all('company').find((x) => x.example && x.name === c.name);
    if (have) companyIds.set(c.key, have.id);
    else {
      companyIds.set(c.key, services.companies.create({ name: c.name, role: c.role, start: at(c.start), end: c.end ? at(c.end) : null, example: true }).id);
      made.companies++;
    }
  }
  const repoIds = new Map<string, string>();
  for (const r of d.repos) {
    const have = store.all('repo').find((x) => x.example && x.remoteUrl === r.remoteUrl);
    if (have) repoIds.set(r.key, have.id);
    else {
      // tracked: false, so GitHub's "where to look" (prefilled from tracked repos, D57) never suggests a made-up repo
      const { repo, created } = services.repos.create({ remoteUrl: r.remoteUrl, tracked: false, example: true });
      repoIds.set(r.key, repo.id);
      if (created) made.repos++;
    }
  }
  const projectIds = new Map<string, string>();
  for (const p of d.projects) {
    const have = store.all('project').find((x) => x.example && x.name === p.name);
    if (have) projectIds.set(p.key, have.id);
    else {
      const project = services.projects.create({
        name: p.name,
        description: p.description,
        color: p.color,
        start: at(p.start),
        end: p.end ? at(p.end) : null,
        status: p.status ?? (p.end ? 'done' : 'active'),
        companyId: p.company ? (companyIds.get(p.company) ?? null) : null,
        repoIds: p.repos.map((k) => repoIds.get(k)).filter((x): x is string => !!x),
        example: true,
      });
      projectIds.set(p.key, project.id);
      made.projects++;
    }
  }

  // each evidence file once (content-addressed: the same bytes are one blob however often they're used)
  const blobs = new Map<string, Pick<Evidence, 'kind' | 'blob'>>();
  const fileEvidence = async (file: string, title?: string) => {
    let e = blobs.get(file);
    if (!e) {
      const i = await services.evidence.ingestBytes(fs.readFileSync(path.join(dir, file)), { originalName: path.basename(file) });
      e = { kind: i.kind, blob: i.sha256 };
      blobs.set(file, e);
    }
    return { ...e, ...(title ? { title } : {}) };
  };

  // oldest first, so the ids (time-ordered) follow the story
  for (const a of [...d.achievements].sort((x, y) => x.happenedAt.localeCompare(y.happenedAt) || x.key.localeCompare(y.key))) {
    const key = EXAMPLE_KEY_PREFIX + a.key;
    if (store.achievementIdByKey(key)) continue; // already here (or one of yours carries the key: left alone)
    const evidence = [];
    for (const e of a.evidence) {
      if (e.kind === 'file') evidence.push(await fileEvidence(e.file, e.title));
      else if (e.kind === 'github_pr')
        evidence.push({
          kind: 'github_pr' as const,
          externalKey: `github_pr:${e.repo.toLowerCase()}#${e.number}`,
          url: `https://github.com/${e.repo}/pull/${e.number}`,
          title: e.title,
          meta: { ...(e.mergedAt ? { mergedAt: at(e.mergedAt) } : {}), ...(e.additions !== undefined ? { additions: e.additions, deletions: e.deletions ?? 0 } : {}) },
        });
      else if (e.kind === 'url') evidence.push({ kind: 'url' as const, url: e.url, ...(e.title ? { title: e.title } : {}) });
      else evidence.push({ kind: 'quote' as const, quote: { text: e.text, ...(e.from ? { from: e.from } : {}), ...(e.where ? { where: e.where } : {}) } });
    }
    const r = services.achievements.create({
      title: a.title,
      summary: a.summary,
      body: a.body,
      happenedAt: at(a.happenedAt),
      ...(a.impact ? { impact: a.impact, impactSource: 'user' as const } : {}),
      projects: a.projects.map((k) => projectIds.get(k)).filter((x): x is string => !!x),
      repos: a.repos.map((k) => repoIds.get(k)).filter((x): x is string => !!x),
      evidence,
      source: a.source,
      sourceAgent: a.sourceAgent,
      externalKey: key,
      example: true,
    });
    if (r.created) made.achievements++;
  }
  return made;
}

/**
 * Remove every entry marked `example: true` (and only those). Returns how many of each were removed, and the files
 * that couldn't be (broken by hand, or from a newer BragDoc): they're left as they are, and say why in Problems.
 */
export function removeExample(store: Store, services: Services): ExampleCounts & { skipped: string[] } {
  if (busy.has(store)) throw new ConflictError('the example data is still being added; try again in a moment');
  const gone: ExampleCounts & { skipped: string[] } = { achievements: 0, projects: 0, companies: 0, repos: 0, skipped: [] };
  const each = <T extends { id: string; example?: boolean }>(kind: 'achievement' | 'project' | 'repo' | 'company', items: T[], fn: (id: string) => unknown, n: keyof ExampleCounts) => {
    for (const x of items.filter((i) => i.example)) {
      try {
        fn(x.id);
        gone[n]++;
      } catch (e) {
        if (!(e instanceof ConflictError || e instanceof NotFoundError || e instanceof ValidationError)) throw e;
        gone.skipped.push(store.entry(kind, x.id)?.file ?? `${kind} ${x.id}`);
      }
    }
  };
  // achievements first, so detaching the projects below has only your own files left to edit
  each('achievement', store.all('achievement'), (id) => services.achievements.remove(id), 'achievements');
  each('project', store.all('project'), (id) => services.projects.removeAndDetach(id), 'projects');
  each('repo', store.all('repo'), (id) => services.repos.removeAndDetach(id), 'repos');
  each('company', store.all('company'), (id) => services.companies.removeAndDetach(id), 'companies');
  return gone;
}
