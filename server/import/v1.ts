// The hosted-export importer (SPEC R12): `plan(store, export)` works out exactly what an import would do, writing
// nothing; `apply(store, services, plan)` does it, through the services like every other write (D24). The CLI
// (commands/import.ts) and POST /api/import/{plan,apply} (routes/import.ts) both call these.
//
// The mapping (D45):
//  - companies → companies; projects → projects, each project's `repoRemoteUrl` → a repo linked to it (one repo per
//    remote, however it's spelt, and an existing one is reused);
//  - achievements → achievements with `source: import`: `eventStart` (else `createdAt`) → `happenedAt`, `eventEnd` →
//    `endedAt`, `details` → the body, its one project → `projects: [id]`; the original source, `eventDuration` and
//    anything that had to be dropped or couldn't be resolved are kept under `meta.legacy`;
//  - documents and performance reviews → read-only markdown under `imports/<timestamp>/`;
//  - account ids, share links and AI search data are left behind, and the report says so, field by field.
// Everything imported keeps its hosted id as `legacyId`, so importing the same export again adds nothing.
import path from 'node:path';
import type { ImportCount, ImportDropped, ImportKind, ImportProblem, ImportReport } from '../../shared/api.js';
import { PROJECT_STATUSES, PROJECT_SWATCHES, type AchievementCreate, type CompanyCreate, type ProjectCreate } from '../../shared/schema/index.js';
import { normalizeRemote } from '../services/catalog.js';
import type { Services } from '../services/index.js';
import { today } from '../services/util.js';
import { fingerprint, listSnapshots, pruneSnapshots, snapshotName, takeSnapshot } from '../store/backups.js';
import type { Store } from '../store/index.js';
import {
  LISTS,
  readExport,
  type ExportAchievement,
  type ExportCompany,
  type ExportDocument,
  type ExportProject,
  type ExportReview,
  type ListName,
  type RawExport,
} from './v1-schema.js';

interface CompanyAction {
  legacyId: string;
  input: CompanyCreate;
  label: string;
}
interface RepoAction {
  key: string;
  input: { remoteUrl: string; name: string };
  label: string;
}
interface ProjectAction {
  legacyId: string;
  input: Omit<ProjectCreate, 'companyId' | 'repoIds'>;
  company?: string;
  repo?: string;
  label: string;
}
interface AchievementAction {
  legacyId: string;
  input: Omit<AchievementCreate, 'projects' | 'companyId'>;
  project?: string;
  company?: string;
  label: string;
}
interface FileAction {
  kind: 'documents' | 'reviews';
  legacyId: string;
  rel: string;
  frontMatter: Record<string, unknown>;
  body: string;
  label: string;
}

/** What an import would do: the report a dry run shows, and the writes that make it so. */
export interface Plan {
  report: ImportReport;
  companies: CompanyAction[];
  repos: RepoAction[];
  projects: ProjectAction[];
  achievements: AchievementAction[];
  files: FileAction[];
}

const KINDS: ImportKind[] = ['companies', 'projects', 'repos', 'achievements', 'documents', 'reviews'];
const KIND_OF: Record<ListName, ImportKind> = { companies: 'companies', projects: 'projects', achievements: 'achievements', documents: 'documents', performanceReviews: 'reviews' };

/** Why each field the hosted app exported has no place here. Fields not listed are carried over. */
const ACCOUNT_ID = 'your account id in the hosted app: it means nothing on your computer';
const DROPPED: Record<ListName, Record<string, string>> = {
  companies: { userId: ACCOUNT_ID, domain: "BragDoc's companies have no website field" },
  projects: { userId: ACCOUNT_ID, createdAt: "projects keep their start and end dates, not when they were added", updatedAt: 'projects don\'t record when they were last changed' },
  achievements: {
    userId: ACCOUNT_ID,
    userMessageId: "a link to a chat message in the hosted app, which the export doesn't include",
    embedding: "the hosted app's AI search data: BragDoc searches your words directly, with no AI",
    embeddingModel: "the hosted app's AI search data: BragDoc searches your words directly, with no AI",
    embeddingGeneratedAt: "the hosted app's AI search data: BragDoc searches your words directly, with no AI",
  },
  documents: { userId: ACCOUNT_ID, shareToken: 'a public share link on the hosted app: nothing is shared from your computer' },
  performanceReviews: { userId: ACCOUNT_ID },
};
/** The fields each list's mapping uses (the rest are DROPPED, or unknown to version 1.0). */
const USED: Record<ListName, string[]> = {
  companies: ['id', 'name', 'role', 'startDate', 'endDate'],
  projects: ['id', 'companyId', 'name', 'description', 'status', 'color', 'startDate', 'endDate', 'repoRemoteUrl'],
  achievements: ['id', 'companyId', 'projectId', 'title', 'summary', 'details', 'eventStart', 'eventEnd', 'eventDuration', 'isArchived', 'source', 'impact', 'impactSource', 'impactUpdatedAt', 'createdAt', 'updatedAt'],
  documents: ['id', 'createdAt', 'updatedAt', 'title', 'content', 'companyId', 'type'],
  performanceReviews: ['id', 'name', 'startDate', 'endDate', 'instructions', 'documentId', 'createdAt', 'updatedAt'],
};

const HEADER = ' Carried over from the hosted BragDoc app by `bragdoc import`. Read-only: BragDoc never changes this file.';

/**
 * The calendar day (YYYY-MM-DD) of a time the export gave, in the user's time zone (the profile's, else this
 * machine's): the hosted app's date picker stored local midnight and showed dates in the browser's zone, so the UTC
 * day would put everyone east of Greenwich a day early (D45).
 */
function dayIn(timeZone: string | null | undefined): (s: string | null | undefined) => string | undefined {
  const opts = { year: 'numeric', month: '2-digit', day: '2-digit' } as const;
  let f: Intl.DateTimeFormat;
  try {
    f = new Intl.DateTimeFormat('en-CA', { ...opts, timeZone: timeZone ?? undefined });
  } catch {
    f = new Intl.DateTimeFormat('en-CA', opts); // not a zone this machine knows
  }
  return (s) => (s ? f.format(new Date(s)) : undefined);
}
const iso = (s: string | null | undefined) => (s ? new Date(s).toISOString() : undefined);
const clean = (s: string | null | undefined) => (s && s.trim() ? s : undefined);
const short = (s: string, n = 48) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
const shortId = (id: string) => (id.length > 12 ? id.slice(0, 8) + '…' : id);
const withNewline = (b: string) => (b && !b.endsWith('\n') ? b + '\n' : b);
/** A file-name-safe slug: `Q3 review (draft)` → `q3-review-draft`. */
const slug = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');

const STATUS: Record<string, (typeof PROJECT_STATUSES)[number]> = { active: 'active', completed: 'done', complete: 'done', done: 'done', archived: 'archived', paused: 'paused', 'on hold': 'paused', 'on-hold': 'paused' };

/** Read and plan in one go: text (or parsed JSON) → Plan. Throws ExportRefused for a file that can't be imported. */
export function planImport(store: Store, input: string | unknown): Plan {
  return plan(store, readExport(input));
}

/** Work out what importing `ex` would do. Writes nothing. */
export function plan(store: Store, ex: RawExport): Plan {
  const day = dayIn(store.profile()?.timezone);
  const counts = Object.fromEntries(KINDS.map((k) => [k, { add: 0, skip: 0, fail: 0 }])) as Record<ImportKind, ImportCount>;
  const problems: ImportProblem[] = [];
  const dropped = new Map<string, ImportDropped>();
  const drop = (field: string, why: string) => {
    const d = dropped.get(field);
    if (d) d.count++;
    else dropped.set(field, { field, count: 1, why });
  };
  for (const k of ex.unknownKeys) drop(k, 'not part of the version 1.0 export format, so BragDoc has nowhere to put it');

  /** Check each item on its own; a bad one is an error and is left out, the rest carry on. */
  function items<T>(name: ListName): { v: T; label: string }[] {
    const kind = KIND_OF[name];
    const { schema, noun } = LISTS[name];
    const seen = new Set<string>();
    const out: { v: T; label: string }[] = [];
    ex.lists[name].forEach((raw, i) => {
      const o = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
      const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : null;
      const named = [o.title, o.name].find((x): x is string => typeof x === 'string' && !!x.trim());
      const label = `${named ? `"${short(named.trim())}"` : `${noun} #${i + 1}`}${id ? ` (id ${shortId(id)})` : ''}`;
      const r = schema.safeParse(raw);
      if (!r.success) {
        counts[kind].fail++;
        const why = r.error.issues.map((is) => (is.path.length ? `${is.path.join('.')}: ${plainIssue(is.message)}` : plainIssue(is.message))).join('; ');
        problems.push({ level: 'error', kind, item: label, message: `not imported: ${typeof raw === 'object' && raw ? why : 'it isn\'t an object'}` });
        return;
      }
      const v = r.data as T & { id: string };
      if (seen.has(v.id)) {
        counts[kind].skip++;
        problems.push({ level: 'warning', kind, item: label, message: 'appears more than once in the export; only the first is imported' });
        return;
      }
      seen.add(v.id);
      for (const [k, val] of Object.entries(o)) {
        if (val === null || val === undefined || val === '' || (Array.isArray(val) && !val.length) || USED[name].includes(k)) continue;
        drop(k === 'userId' ? 'userId' : `${name}[].${k}`, DROPPED[name][k] ?? 'not part of the version 1.0 export format, so BragDoc has nowhere to put it');
      }
      out.push({ v, label });
    });
    return out;
  }
  if (ex.userId) drop('userId', ACCOUNT_ID); // the envelope's own, counted with the items'

  const companies = items<ExportCompany>('companies');
  const projects = items<ExportProject>('projects');
  const achievements = items<ExportAchievement>('achievements');
  const documents = items<ExportDocument>('documents');
  const reviews = items<ExportReview>('performanceReviews');
  const warn = (kind: ImportKind, item: string, message: string) => problems.push({ level: 'warning', kind, item, message });

  // ---- companies
  const existingCompanies = store.idsByLegacyId('company');
  const companyNames = new Map<string, string>(); // legacy id → name, for documents
  for (const c of store.all('company')) if (c.legacyId) companyNames.set(c.legacyId, c.name);
  const companyActions: CompanyAction[] = [];
  for (const { v: c, label } of companies) {
    companyNames.set(c.id, c.name.trim() || 'Unnamed company');
    if (existingCompanies.has(c.id)) {
      counts.companies.skip++;
      continue;
    }
    const name = c.name.trim() || 'Unnamed company';
    if (!c.name.trim()) warn('companies', label, `has no name; imported as "${name}"`);
    companyActions.push({ legacyId: c.id, label, input: stripUndefined({ name, role: clean(c.role), start: day(c.startDate), end: day(c.endDate) ?? null, legacyId: c.id }) });
    counts.companies.add++;
  }
  const knownCompany = (id: string | null | undefined) => !!id && (existingCompanies.has(id) || companyActions.some((a) => a.legacyId === id));

  // ---- projects, and their repos
  const existingProjects = store.idsByLegacyId('project');
  const projectCompany = new Map<string, string | null>(); // legacy project id → its legacy company id
  const repoActions: RepoAction[] = [];
  const repoKeys = new Set<string>();
  const projectActions: ProjectAction[] = [];
  let swatch = store.all('project').length;
  for (const { v: p, label } of projects) {
    projectCompany.set(p.id, p.companyId ?? null);
    const remote = clean(p.repoRemoteUrl)?.trim();
    const norm = remote ? normalizeRemote(remote) : null;
    const repo = remote ? (norm?.url ?? remote) : undefined;
    const repoHere = (key: string) => store.all('repo').some((r) => r.remoteUrl && (normalizeRemote(r.remoteUrl)?.url ?? r.remoteUrl) === key);
    if (existingProjects.has(p.id)) {
      counts.projects.skip++;
      // its repo came across with it the first time: counted as already here, if it still is
      if (repo && !repoKeys.has(repo) && repoHere(repo)) {
        repoKeys.add(repo);
        counts.repos.skip++;
      }
      continue;
    }
    const name = p.name.trim() || 'Unnamed project';
    if (!p.name.trim()) warn('projects', label, `has no name; imported as "${name}"`);
    let color = clean(p.color)?.trim();
    if (color && /^#[0-9a-f]{3}$/i.test(color)) color = '#' + [...color.slice(1)].map((ch) => ch + ch).join('');
    if (!color || !/^#[0-9a-f]{6}$/i.test(color)) {
      const given = PROJECT_SWATCHES[swatch % PROJECT_SWATCHES.length];
      if (color) warn('projects', label, `its colour ${JSON.stringify(color)} isn't one BragDoc can use (#rrggbb); it gets ${given} instead`);
      color = given;
    }
    swatch++;
    let status = STATUS[(p.status ?? '').trim().toLowerCase()];
    if (!status) {
      status = p.endDate ? 'done' : 'active';
      if (clean(p.status)) warn('projects', label, `its status ${JSON.stringify(p.status)} isn't one BragDoc has; it's "${status}"`);
    }
    let start = day(p.startDate) ?? day(p.createdAt);
    if (!start) {
      start = today(store);
      warn('projects', label, `has no start date; it starts today (${start})`);
    }
    let company: string | undefined;
    if (p.companyId) {
      if (knownCompany(p.companyId)) company = p.companyId;
      else warn('projects', label, `its company (id ${shortId(p.companyId)}) isn't in the export; imported without a company`);
    }
    if (remote && repo) {
      if (!norm) warn('repos', label, `its repository ${JSON.stringify(remote)} isn't a git remote URL BragDoc recognises; it's added as given`);
      if (!repoKeys.has(repo)) {
        repoKeys.add(repo);
        // a repo already here (added by hand, or by an earlier import) is linked, not added again
        if (repoHere(repo)) counts.repos.skip++;
        else {
          repoActions.push({ key: repo, label: repo, input: { remoteUrl: remote, name: norm?.path ?? remote } });
          counts.repos.add++;
        }
      }
    }
    projectActions.push({
      legacyId: p.id,
      label,
      company,
      repo,
      input: stripUndefined({ name, description: clean(p.description), color, start, end: day(p.endDate) ?? null, status, legacyId: p.id }),
    });
    counts.projects.add++;
  }
  const knownProject = (id: string) => existingProjects.has(id) || projectActions.some((a) => a.legacyId === id);

  // ---- achievements
  const achievementActions: AchievementAction[] = [];
  for (const { v: a, label } of achievements) {
    if (store.achievementIdByLegacyId(a.id)) {
      counts.achievements.skip++;
      continue;
    }
    const legacy: Record<string, unknown> = {};
    let title = a.title.trim();
    if (!title) {
      const from = [a.summary, a.details].map((s) => s?.trim().split('\n')[0]?.trim()).find(Boolean);
      title = from ? short(from, 100) : 'Untitled achievement';
      warn('achievements', label, `has no title; imported as "${title}"`);
    }
    let impact: number | undefined;
    if (a.impact !== null && a.impact !== undefined) {
      const r = Math.round(a.impact);
      if (r >= 1 && r <= 10) {
        impact = r;
        if (r !== a.impact) warn('achievements', label, `its impact ${a.impact} is rounded to ${r}`);
      } else {
        legacy.impact = a.impact;
        warn('achievements', label, `its impact ${a.impact} is off BragDoc's 1–10 scale; it's left out (and kept under meta.legacy)`);
      }
    }
    let project: string | undefined;
    if (a.projectId) {
      if (knownProject(a.projectId)) project = a.projectId;
      else {
        legacy.projectId = a.projectId;
        warn('achievements', label, `its project (id ${shortId(a.projectId)}) isn't in the export; imported without a project`);
      }
    }
    let company: string | undefined;
    if (a.companyId) {
      if (!knownCompany(a.companyId)) {
        legacy.companyId = a.companyId;
        warn('achievements', label, `its company (id ${shortId(a.companyId)}) isn't in the export; imported without a company`);
      } else if (!project || projectCompany.get(project) !== a.companyId) company = a.companyId; // not already implied by the project
    }
    Object.assign(legacy, stripUndefined({ source: clean(a.source), eventDuration: clean(a.eventDuration), impactSource: clean(a.impactSource), impactUpdatedAt: iso(a.impactUpdatedAt) }));
    const happenedAt = day(a.eventStart) ?? day(a.createdAt)!;
    achievementActions.push({
      legacyId: a.id,
      label,
      project,
      company,
      input: stripUndefined({
        title,
        summary: clean(a.summary)?.trim(),
        body: a.details ?? undefined,
        happenedAt,
        endedAt: day(a.eventEnd),
        impact,
        // an impact you set yourself stays yours; one the hosted app's AI suggested is marked as carried over (D45)
        impactSource: impact === undefined ? undefined : a.impactSource === 'user' ? ('user' as const) : ('import' as const),
        source: 'import' as const,
        legacyId: a.id,
        archived: a.isArchived ?? false,
        createdAt: iso(a.createdAt),
        updatedAt: iso(a.updatedAt ?? a.createdAt),
        meta: Object.keys(legacy).length ? { legacy } : undefined,
      }),
    });
    counts.achievements.add++;
  }

  // ---- documents and reviews → imports/<timestamp>/
  const already = store.importedLegacyIds();
  const stamp = freeStamp(store);
  const dir = `imports/${stamp}`;
  const files: FileAction[] = [];
  const used = new Set<string>();
  const fileName = (sub: string, date: string | undefined, name: string, fallback: string) => {
    const base = `${date ?? 'undated'}-${slug(name) || fallback}`;
    let rel = `${dir}/${sub}/${base}.md`;
    for (let n = 2; used.has(rel); n++) rel = `${dir}/${sub}/${base}-${n}.md`;
    used.add(rel);
    return rel;
  };
  const docPath = new Map<string, string>(); // legacy document id → its file (relative to the data home)
  for (const [id, rel] of already) docPath.set(id, rel);
  for (const { v: d, label } of documents) {
    if (already.has(d.id)) {
      counts.documents.skip++;
      continue;
    }
    const title = d.title?.trim() || 'Untitled document';
    const rel = fileName('documents', day(d.createdAt), title, 'document');
    docPath.set(d.id, rel);
    files.push({
      kind: 'documents',
      legacyId: d.id,
      rel,
      label,
      frontMatter: stripUndefined({
        title,
        type: clean(d.type),
        company: d.companyId ? (companyNames.get(d.companyId) ?? undefined) : undefined,
        companyLegacyId: d.companyId && !companyNames.has(d.companyId) ? d.companyId : undefined,
        legacyId: d.id,
        createdAt: iso(d.createdAt),
        updatedAt: iso(d.updatedAt),
      }),
      body: withNewline(d.content ?? ''),
    });
    counts.documents.add++;
  }
  for (const { v: r, label } of reviews) {
    if (already.has(r.id)) {
      counts.reviews.skip++;
      continue;
    }
    const name = r.name?.trim() || 'Performance review';
    const rel = fileName('reviews', day(r.startDate), name, 'review');
    const doc = r.documentId ? docPath.get(r.documentId) : undefined;
    files.push({
      kind: 'reviews',
      legacyId: r.id,
      rel,
      label,
      frontMatter: stripUndefined({
        name,
        startDate: day(r.startDate),
        endDate: day(r.endDate),
        // the review's document, relative to this file when it's in the same import
        document: doc ? path.posix.relative(path.posix.dirname(rel), doc) : undefined,
        documentLegacyId: r.documentId && !doc ? r.documentId : undefined,
        legacyId: r.id,
        createdAt: iso(r.createdAt),
        updatedAt: iso(r.updatedAt),
      }),
      body: withNewline(r.instructions ?? ''),
    });
    counts.reviews.add++;
  }

  const report: ImportReport = {
    dryRun: true,
    exportedAt: ex.exportedAt,
    counts,
    dropped: [...dropped.values()],
    problems: [...problems.filter((p) => p.level === 'error'), ...problems.filter((p) => p.level === 'warning')],
    importsDir: files.length ? dir : null,
    snapshot: null,
  };
  return { report, companies: companyActions, repos: repoActions, projects: projectActions, achievements: achievementActions, files };
}

/** `imports/<timestamp>` for this import: the time now, made unique if an import already used it. */
function freeStamp(store: Store): string {
  const base = snapshotName(store.now());
  const taken = new Set([...store.importedLegacyIds().values()].map((rel) => rel.split('/')[1]));
  let s = base;
  for (let n = 2; taken.has(s) || store.importsDirExists(s); n++) s = `${base}-${n}`;
  return s;
}

export interface ApplyOptions {
  /** Let other requests in every this many writes (the server keeps answering during a long import). */
  yieldEvery?: number;
  /** Take a snapshot of the data home first (default true). */
  snapshot?: boolean;
}

/**
 * Do what `p` says, in dependency order (companies, repos, projects, achievements, files), through the services.
 * Re-checks each `legacyId` as it goes, so a plan made a moment ago can't import anything twice. Returns the report
 * of what actually happened: an item whose write failed is an error in it, and the rest carry on.
 */
export async function apply(store: Store, services: Services, p: Plan, { yieldEvery = 200, snapshot = true }: ApplyOptions = {}): Promise<ImportReport> {
  const report: ImportReport = structuredClone(p.report);
  report.dryRun = false;
  const nothing = KINDS.every((k) => report.counts[k].add === 0);
  if (snapshot && !nothing) {
    // a copy of the data home as it was, before anything is added (backups/; the usual retention applies)
    report.snapshot = snapshotBefore(store);
  }
  const failed: ImportProblem[] = [];
  let n = 0;
  const step = async () => {
    if (++n % yieldEvery === 0) await new Promise((r) => setImmediate(r));
  };
  const attempt = (kind: ImportKind, label: string, fn: () => 'added' | 'skipped') => {
    try {
      if (fn() === 'skipped') {
        report.counts[kind].add--;
        report.counts[kind].skip++;
      }
    } catch (e) {
      report.counts[kind].add--;
      report.counts[kind].fail++;
      failed.push({ level: 'error', kind, item: label, message: `not imported: ${(e as Error).message}` });
    }
  };

  // something this item refers to failed above: it fails too, rather than come in without the link, so importing the
  // file again (once the cause is fixed) brings both, linked
  const missing = (what: string): never => {
    throw new Error(`its ${what} couldn't be imported (see above), so it wasn't either; import the file again once that's fixed`);
  };
  const companies = store.idsByLegacyId('company');
  for (const a of p.companies) {
    attempt('companies', a.label, () => {
      if (companies.has(a.legacyId)) return 'skipped';
      companies.set(a.legacyId, services.companies.create(a.input).id);
      return 'added';
    });
    await step();
  }
  const repos = new Map<string, string>();
  for (const r of store.all('repo')) if (r.remoteUrl) repos.set(normalizeRemote(r.remoteUrl)?.url ?? r.remoteUrl, r.id);
  for (const a of p.repos) {
    attempt('repos', a.label, () => {
      const { repo, created } = services.repos.create(a.input);
      repos.set(a.key, repo.id);
      return created ? 'added' : 'skipped';
    });
    await step();
  }
  const projects = store.idsByLegacyId('project');
  for (const a of p.projects) {
    attempt('projects', a.label, () => {
      if (projects.has(a.legacyId)) return 'skipped';
      const companyId = a.company ? (companies.get(a.company) ?? missing('company')) : null;
      const repoId = a.repo ? (repos.get(a.repo) ?? missing('repo')) : undefined;
      projects.set(a.legacyId, services.projects.create({ ...a.input, companyId, repoIds: repoId ? [repoId] : [] }).id);
      return 'added';
    });
    await step();
  }
  for (const a of p.achievements) {
    attempt('achievements', a.label, () => {
      const project = a.project ? (projects.get(a.project) ?? missing('project')) : undefined;
      const companyId = a.company ? (companies.get(a.company) ?? missing('company')) : undefined;
      // idempotent by legacyId inside the service too (an achievement imported meanwhile is returned, not duplicated)
      const { created } = services.achievements.create({ ...a.input, projects: project ? [project] : [], ...(companyId ? { companyId } : {}) });
      return created ? 'added' : 'skipped';
    });
    await step();
  }
  if (p.files.length) {
    const done = store.importedLegacyIds();
    for (const f of p.files) {
      attempt(f.kind, f.label, () => {
        if (done.has(f.legacyId)) return 'skipped';
        store.writeImportFile(f.rel, f.frontMatter, f.body, HEADER);
        return 'added';
      });
      await step();
    }
    if (report.counts.documents.add + report.counts.reviews.add > 0) {
      try {
        store.writeImportFile(`${report.importsDir}/README.md`, null, importsReadme(report, store.now()));
      } catch {
        /* a README that's already there (a second import in the same second) is fine */
      }
    } else report.importsDir = null;
  }
  report.problems = [...failed, ...report.problems.filter((x) => x.level === 'error'), ...report.problems.filter((x) => x.level === 'warning')];
  return report;
}

/**
 * A snapshot of the data home as it is now (backups/), for the report: a new one, or the newest when nothing has
 * changed since it, or null when the data home has nothing in it yet. If one can't be taken, the import doesn't start.
 */
function snapshotBefore(store: Store): string | null {
  const backups = path.join(store.home, 'backups');
  let name: string | null;
  try {
    name = takeSnapshot(store.home, store.now());
  } catch (e) {
    throw new SnapshotFailed(`BragDoc couldn't take a snapshot of your data before importing (${(e as Error).message}), so nothing was imported`);
  }
  if (name) {
    try {
      pruneSnapshots(store.home, store.now()); // the usual retention, as the server's hourly snapshot applies it
    } catch {
      /* pruning is housekeeping: never a reason to stop */
    }
    return `backups/${name}`;
  }
  if (!fingerprint(store.home)) return null; // nothing to copy
  const newest = listSnapshots(backups).at(-1);
  return newest && fingerprint(path.join(backups, newest)) === fingerprint(store.home) ? `backups/${newest}` : null;
}

/** The snapshot before an import failed: nothing was imported. */
export class SnapshotFailed extends Error {}

function importsReadme(r: ImportReport, now: Date): string {
  return `# Carried over from the hosted BragDoc app

These files came from an export of the hosted BragDoc app${r.exportedAt ? ` (exported ${r.exportedAt.slice(0, 10)})` : ''}, imported on
${now.toISOString().slice(0, 10)} with \`bragdoc import\`: ${r.counts.documents.add} document(s) in \`documents/\` and ${r.counts.reviews.add}
performance review(s) in \`reviews/\`. Each keeps its id from the hosted app as \`legacyId\`, so importing the same
export again doesn't copy them twice.

They're kept as they were, read-only. BragDoc doesn't show or change them; they're here for you (and your agents) to
read. Your achievements, projects and companies were imported into BragDoc itself.
`;
}

/** Zod's "Invalid input: expected string, received undefined" as people say it: "missing". */
function plainIssue(m: string): string {
  return m.replace(/^Invalid input: expected (\w+), received undefined$/, 'missing').replace(/^Invalid input: expected (\w+), received (\w+)$/, 'should be a $1, not a $2');
}

/** An object without its undefined members. */
function stripUndefined<T extends Record<string, unknown>>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}
