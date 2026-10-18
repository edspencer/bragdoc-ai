// The store: the one module that reads and writes the data home's files (D5; SPEC R2), and the in-memory index over
// them. The services (server/services/) call it for every operation, from HTTP and MCP alike; nothing else writes
// those files. Adapted from Hallway's server/store/index.ts.
//
// - Reads: the boot scan loads every file. Each is validated (Zod, shared/schema/); one that fails keeps its last good
//   value (if it had one) and gains a Problem. Nothing crashes, and a broken file is never rewritten.
// - A file from a newer BragDoc (a higher `schemaVersion`) is a Problem and read-only: shown if it still validates,
//   never written (D23, Paddock's schema-version pattern).
// - Writes are synchronous and edit the file as it is on disk *now* (not the in-memory copy, which may lag a hand edit
//   the watcher hasn't reported yet), as a YAML Document, so comments, key order and unknown keys survive. They're
//   validated before they touch the disk, then written atomically (safefs.ts). Being synchronous, two writes can't
//   interleave: concurrent requests simply apply one after the other.
// - Every change, ours or someone else's (the watcher calls reloadPath), updates the index at once and is announced
//   once to subscribers. Our own writes don't echo: the watcher's re-read finds the bytes we already hold.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { z } from 'zod';
import {
  AchievementFrontMatterSchema,
  CompanySchema,
  EvidenceSidecarSchema,
  FoundCandidateSchema,
  ProfileSchema,
  ProjectSchema,
  RepoSchema,
  SCHEMA_VERSIONS,
  type Achievement,
  type ChangeEntity,
  type Company,
  type EvidenceSidecar,
  type FoundCandidate,
  type Problem,
  type Profile,
  type Project,
  type Repo,
  type StoreChange,
} from '../../shared/schema/index.js';
import { ULID_RE } from '../../shared/ulid.js';
import { ConflictError, NotFoundError, ReadOnlyError, ValidationError } from './errors.js';
import { classify, relPathFor, SCAN_ROOTS, type EntityKind } from './files.js';
import { atomicWrite, ExistsError, findRemoved, moveToRemoved, renameNoClobber } from './safefs.js';
import { SearchIndex } from './search.js';
import { joinFrontMatter, locate, mergePatch, newDocument, parse, readYaml, splitFrontMatter, stringify, type Parsed } from './yamldoc.js';

export * from './errors.js';
export type { EntityKind } from './files.js';

/** What each kind of file holds in memory. */
export interface EntityTypes {
  profile: Profile;
  company: Company;
  project: Project;
  repo: Repo;
  achievement: Achievement;
  evidence: EvidenceSidecar;
  found: FoundCandidate;
}

const SCHEMAS: Record<EntityKind, z.ZodType> = {
  profile: ProfileSchema,
  company: CompanySchema,
  project: ProjectSchema,
  repo: RepoSchema,
  achievement: AchievementFrontMatterSchema,
  evidence: EvidenceSidecarSchema,
  found: FoundCandidateSchema,
};

/** The key a file's own id is under (checked against its file name). */
const ID_KEY: Partial<Record<EntityKind, string>> = { company: 'id', project: 'id', repo: 'id', achievement: 'id', found: 'id', evidence: 'sha256' };

export interface Entry<T> {
  kind: EntityKind;
  id: string;
  /** Relative to the data home, with `/`. */
  file: string;
  /** The bytes last read; null if there's no file. */
  raw: string | null;
  /** `"<hash>"` of `raw`, for If-Match; null if there's no file. */
  etag: string | null;
  /** The last good value: kept while the file is broken. */
  value: T | null;
  /** The file's own problems as of the last read (dangling references are computed separately). */
  problems: Problem[];
  /** From a newer BragDoc: never written. */
  readOnly: boolean;
  /** The externalKeys and legacyId this file claims (`ext:…`, `legacy:…`), even while it's broken (D24). */
  keys: string[];
}

/** What a write does: a merge patch onto the file (null removes a key) and, for achievements, a new body. */
export interface Edit {
  patch: Record<string, unknown>;
  body?: string;
}

export interface WriteOptions {
  /** Fail (ConflictError) unless the file's ETag matches. */
  ifMatch?: string | null;
  /** Fail (ConflictError) if the file exists. */
  createOnly?: boolean;
  /** Fail (NotFoundError) if it doesn't. */
  mustExist?: boolean;
  /** A comment block for the top of a new file. */
  header?: string;
}

export interface StoreOptions {
  now?: () => Date;
}

export const etagOf = (raw: string) => `"${crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16)}"`;
const normEtag = (t: string) => t.trim().replace(/^W\//, '').replace(/^"(.*)"$/, '$1');
export const etagMatches = (ifMatch: string, etag: string | null) => etag !== null && (ifMatch.trim() === '*' || ifMatch.split(',').some((t) => normEtag(t) === normEtag(etag)));

function readRaw(file: string): string | null {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'EISDIR' || code === 'ENOTDIR') return null;
    throw e;
  }
}

/** The version a file declares: absent → 1; unreadable → null (treated as from the future). Paddock's readSchemaVersion. */
function readSchemaVersion(raw: unknown): number | null {
  if (raw === undefined || raw === null) return 1;
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw.trim()) : NaN;
  return Number.isInteger(n) && n >= 1 ? n : null;
}

const toRel = (p: string) => p.split(path.sep).join('/');
const addToSet = (m: Map<string, Set<string>>, k: string, v: string) => (m.get(k) ?? m.set(k, new Set()).get(k)!).add(v);
const delFromSet = (m: Map<string, Set<string>>, k: string, v: string) => {
  const s = m.get(k);
  if (s && s.delete(v) && !s.size) m.delete(k);
};

const first = (s: Set<string> | undefined) => (s ? s.values().next().value : undefined);

/** The keys a file claims, from its value or (while it's broken) whatever of it parsed: strings only. */
function keysOf(kind: EntityKind, v: unknown): string[] {
  if (kind !== 'achievement' && kind !== 'found') return [];
  const o = (v ?? {}) as Record<string, unknown>;
  const str = (x: unknown) => (typeof x === 'string' && x ? x : null);
  const ev = Array.isArray(o.evidence) ? o.evidence : [];
  const keys = [str(o.externalKey), ...ev.map((e) => str((e as Record<string, unknown> | null)?.externalKey))].filter((k): k is string => !!k).map((k) => `ext:${k}`);
  const legacy = kind === 'achievement' ? str(o.legacyId) : null;
  return [...new Set([...keys, ...(legacy ? [`legacy:${legacy}`] : [])])];
}

/** The keys in a file that doesn't even parse: its `externalKey:` and `legacyId:` lines, best effort. */
function scanKeys(kind: EntityKind, raw: string): string[] {
  if (kind !== 'achievement' && kind !== 'found') return [];
  const out: string[] = [];
  // a YAML comment starts at a `#` after whitespace, so `owner/repo#12` is all value
  for (const m of raw.matchAll(/^[\s-]*(externalKey|legacyId):[ \t]+(.+?)(?:[ \t]+#.*)?[ \t]*$/gm)) {
    const v = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (m[1] === 'externalKey') out.push(`ext:${v}`);
    else if (kind === 'achievement') out.push(`legacy:${v}`);
  }
  return [...new Set(out)];
}

/** Ids as file names: a ULID, a sha256 for evidence, `profile` for the profile. Anything else is no such entity. */
function validId(kind: EntityKind, id: string): boolean {
  return kind === 'profile' ? id === 'profile' : kind === 'evidence' ? /^[0-9a-f]{64}$/.test(id) : ULID_RE.test(id);
}

type Listener = (c: StoreChange) => void;

export class Store {
  private entries: { [K in EntityKind]: Map<string, Entry<EntityTypes[K]>> } = {
    profile: new Map(),
    company: new Map(),
    project: new Map(),
    repo: new Map(),
    achievement: new Map(),
    evidence: new Map(),
    found: new Map(),
  };
  /** Misnamed files, by relative path. */
  private stray = new Map<string, Problem>();
  private listeners = new Set<Listener>();
  /** The clock (a fake one in tests). */
  readonly now: () => Date;

  // secondary indexes, over good values only
  /** `ext:<externalKey>` / `legacy:<legacyId>` → the ids of the files that claim it (a hand copy makes two). */
  private keyIndex = { achievement: new Map<string, Set<string>>(), found: new Map<string, Set<string>>() };
  private byProject = new Map<string, Set<string>>();
  private byRepo = new Map<string, Set<string>>();
  private byMonth = new Map<string, Set<string>>();
  private byBlob = new Map<string, Set<string>>();
  private readonly searchIndex = new SearchIndex();

  constructor(
    readonly home: string,
    opts: StoreOptions = {},
  ) {
    this.now = opts.now ?? (() => new Date());
  }

  // -------------------------------------------------------------------------------------------------------------
  // Reading
  // -------------------------------------------------------------------------------------------------------------

  /** The boot scan: read every file in the data home. A missing data home is an empty store. */
  load(): this {
    this.reloadOne('profile', 'profile');
    for (const { dir, depth } of SCAN_ROOTS) this.scanDir(dir, depth);
    return this;
  }

  private scanDir(relDir: string, depth: number): StoreChange[] {
    const out: StoreChange[] = [];
    let ents: fs.Dirent[];
    try {
      ents = fs.readdirSync(path.join(this.home, relDir), { withFileTypes: true });
    } catch {
      return out;
    }
    for (const e of ents) {
      const rel = `${relDir}/${e.name}`;
      if (e.isDirectory()) {
        if (depth > 1 && !e.name.startsWith('.')) out.push(...this.scanDir(rel, depth - 1));
        continue;
      }
      if (!e.isFile()) continue;
      out.push(...this.reloadRel(rel));
    }
    return out;
  }

  /** Re-read the file at `rel`, whatever it is. Returns the changes (also announced). */
  private reloadRel(rel: string): StoreChange[] {
    const c = classify(rel);
    if (!c) return [];
    if ('stray' in c) {
      if (fs.existsSync(path.join(this.home, rel))) this.stray.set(rel, { severity: 'warning', code: 'stray', file: rel, message: c.stray });
      else this.stray.delete(rel);
      return [];
    }
    const change = this.reloadOne(c.kind, c.id, rel);
    return change ? [change] : [];
  }

  /** Re-read one entity's file (at `rel`, else where it's expected). Returns the change, or null if nothing changed. */
  private reloadOne<K extends EntityKind>(kind: K, id: string, rel?: string): StoreChange | null {
    const map = this.entries[kind] as Map<string, Entry<EntityTypes[K]>>;
    const known = map.get(id);
    let file = rel ?? known?.file ?? relPathFor(kind, id);
    // a second copy of an achievement in another month's folder: the file we know about is still the one that counts
    if (known && known.file !== file && known.raw !== null && readRaw(path.join(this.home, known.file)) !== null) return null;
    let raw = readRaw(path.join(this.home, file));
    // the achievement file we knew has gone: maybe it was moved (by hand, or a checkout) to another month's folder
    if (raw === null && kind === 'achievement' && known) {
      const moved = this.findAchievementFile(id);
      if (moved) [file, raw] = [moved, readRaw(path.join(this.home, moved))];
    }
    if (known && raw === known.raw) {
      if (raw !== null) known.file = file; // the same bytes under a new name: nothing to announce
      return null;
    }
    const e: Entry<EntityTypes[K]> = known ?? { kind, id, file, raw: null, etag: null, value: null, problems: [], readOnly: false, keys: [] };
    if (raw === null) {
      if (!known) return null;
      this.unindex(kind, e.value);
      this.setKeys(e, []);
      map.delete(id);
      if (kind === 'evidence') this.reindexBlob(id);
      return this.announce(kind, id, 'remove');
    }
    const r = this.check(kind, id, file, raw);
    Object.assign(e, { file, raw, etag: etagOf(raw), problems: r.problems, readOnly: r.readOnly });
    map.set(id, e); // before indexing: a sidecar's re-index looks itself up
    if (r.value !== null) {
      this.unindex(kind, e.value);
      e.value = r.value as EntityTypes[K];
      this.index(kind, e.value);
    }
    // a broken file still claims its keys, so a dismissed PR can't come back while its file is broken (D24)
    const from = r.value ?? e.value ?? r.obj;
    this.setKeys(e, from ? keysOf(kind, from) : scanKeys(kind, raw));
    return this.announce(kind, id, 'upsert', r.value === null);
  }

  /** Where an achievement's file is, wherever it was moved within achievements/YYYY/MM/; null if nowhere. */
  private findAchievementFile(id: string): string | null {
    const root = path.join(this.home, 'achievements');
    for (const y of safeList(root)) for (const m of safeList(path.join(root, y))) if (fs.existsSync(path.join(root, y, m, `${id}.md`))) return `achievements/${y}/${m}/${id}.md`;
    return null;
  }

  private setKeys(e: Entry<unknown>, keys: string[]): void {
    const idx = e.kind === 'achievement' || e.kind === 'found' ? this.keyIndex[e.kind] : null;
    if (!idx) return;
    for (const k of e.keys) delFromSet(idx, k, e.id);
    for (const k of keys) addToSet(idx, k, e.id);
    e.keys = keys;
  }

  /**
   * Parse and validate a file's text. `value` is null when the file is broken (a syntax error, a schema error, or a
   * future version that doesn't validate any more).
   */
  private check(kind: EntityKind, id: string, file: string, raw: string): { value: unknown; problems: Problem[]; readOnly: boolean; obj?: Record<string, unknown> } {
    const problem = (code: Problem['code'], message: string, at?: { line: number; col: number }, key?: string): Problem => ({
      severity: 'error',
      code,
      file,
      ...(at ? { line: at.line, col: at.col } : {}),
      ...(key ? { key } : {}),
      message,
    });
    let yaml = raw;
    let body = '';
    let lineOffset = 0;
    if (kind === 'achievement') {
      const fm = splitFrontMatter(raw);
      if (!fm) return { value: null, readOnly: false, problems: [problem('syntax', 'no front-matter: an achievement file starts with a `---` line, its YAML keys, and another `---` line', { line: 1, col: 1 })] };
      ({ yaml, body } = fm);
      lineOffset = fm.yamlLine - 1;
    }
    const at = (p: { line: number; col: number } | undefined) => (p ? { line: p.line + lineOffset, col: p.col } : undefined);
    const read = readYaml(yaml);
    if (read.error) {
      const pos = read.error.line ? { line: read.error.line, col: read.error.col ?? 1 } : undefined;
      return { value: null, readOnly: false, problems: [problem('syntax', `YAML syntax error: ${read.error.message}`, at(pos))] };
    }
    // the Document parse (slower) only when there's something to point at
    let parsed: Parsed | undefined;
    const where = (key: (string | number)[]) => at(locate((parsed ??= parse(yaml)), key));
    let js = read.value;
    if (js === null || js === undefined) js = {};
    if (typeof js !== 'object' || Array.isArray(js)) return { value: null, readOnly: false, problems: [problem('invalid', 'the file must be a mapping (key: value lines) at the top level')] };
    const obj = { ...(js as Record<string, unknown>) };
    const problems: Problem[] = [];
    const version = readSchemaVersion(obj.schemaVersion);
    const supported = SCHEMA_VERSIONS[kind];
    const readOnly = version === null || version > supported;
    if (readOnly) {
      problems.push(
        problem(
          'future-version',
          version === null
            ? `its schemaVersion (${JSON.stringify(obj.schemaVersion)}) isn't a version number, so BragDoc won't change it; fix it by hand`
            : `it's version ${version} of the ${kind} format, from a newer BragDoc (this one understands up to ${supported}). It's shown read-only and never rewritten here; upgrade BragDoc to edit it`,
          where(['schemaVersion']),
          'schemaVersion',
        ),
      );
      if (version !== null) obj.schemaVersion = supported; // validate the rest against the shape we know
      else delete obj.schemaVersion;
    }
    const idKey = ID_KEY[kind];
    if (idKey) {
      if (obj[idKey] === undefined) obj[idKey] = id; // a hand-written file may leave its id to its name
      else if (obj[idKey] !== id) problems.push(problem('invalid', `${idKey} "${String(obj[idKey])}" doesn't match the file name (${id})`, where([idKey]), idKey));
    }
    const r = SCHEMAS[kind].safeParse(obj);
    if (!r.success) {
      for (const i of r.error.issues) {
        const key = i.path.map(String);
        problems.push(problem('invalid', key.length ? `${key.join('.')}: ${i.message}` : i.message, where(i.path as (string | number)[]), key.join('.') || undefined));
      }
    }
    const broken = problems.some((p) => p.code !== 'future-version');
    if (broken || !r.success) return { value: null, readOnly, problems, obj };
    const value = kind === 'achievement' ? { ...(r.data as object), body } : r.data;
    if (readOnly) (value as { schemaVersion: unknown }).schemaVersion = version;
    return { value, readOnly, problems };
  }

  /** An entity's value, if its file exists and has ever been valid. */
  get<K extends EntityKind>(kind: K, id: string): EntityTypes[K] | undefined {
    return (this.entries[kind].get(id)?.value ?? undefined) as EntityTypes[K] | undefined;
  }

  /** An entity's entry (file, ETag, problems), valid or not. */
  entry<K extends EntityKind>(kind: K, id: string): Entry<EntityTypes[K]> | undefined {
    return this.entries[kind].get(id) as Entry<EntityTypes[K]> | undefined;
  }

  /** Every good value of a kind (in no particular order). */
  all<K extends EntityKind>(kind: K): EntityTypes[K][] {
    const out: EntityTypes[K][] = [];
    for (const e of this.entries[kind].values()) if (e.value) out.push(e.value as EntityTypes[K]);
    return out;
  }

  profile(): Profile | null {
    return this.get('profile', 'profile') ?? null;
  }

  /** The achievement with this externalKey, its own or one of its evidence's. */
  achievementIdByKey(key: string): string | undefined {
    return first(this.keyIndex.achievement.get(`ext:${key}`));
  }
  achievementIdByLegacyId(legacyId: string): string | undefined {
    return first(this.keyIndex.achievement.get(`legacy:${legacyId}`));
  }
  /** Companies and projects by their hosted-app id (the importer's; a scan, as there are only ever a few). */
  idsByLegacyId(kind: 'company' | 'project'): Map<string, string> {
    const out = new Map<string, string>();
    for (const v of this.all(kind)) if (v.legacyId && !out.has(v.legacyId)) out.set(v.legacyId, v.id);
    return out;
  }
  foundIdByKey(key: string): string | undefined {
    return first(this.keyIndex.found.get(`ext:${key}`));
  }
  /** Achievement ids in a project / touching a repo / that happened in a month (`YYYY-MM`) / carrying a blob. */
  achievementIdsIn(by: 'project' | 'repo' | 'month' | 'blob', key: string): ReadonlySet<string> {
    const m = by === 'project' ? this.byProject : by === 'repo' ? this.byRepo : by === 'month' ? this.byMonth : this.byBlob;
    return m.get(key) ?? new Set();
  }
  /** Months (`YYYY-MM`) with achievements, and how many. */
  months(): Map<string, number> {
    return new Map([...this.byMonth].map(([k, s]) => [k, s.size]));
  }
  /** Full-text search over achievements: ids, best first. */
  search(q: string): { id: string; score: number }[] {
    return this.searchIndex.search(q);
  }

  /**
   * Every problem in the data home, errors first: each file's own, misnamed files, and dangling references (one
   * Problem per missing target, naming the first file that refers to it).
   */
  problems(): Problem[] {
    const out: Problem[] = [];
    for (const map of Object.values(this.entries)) for (const e of map.values()) out.push(...e.problems);
    out.push(...this.stray.values());
    const missing = new Map<string, { file: string; n: number; message: string }>();
    const ref = (file: string, what: string, id: string | null | undefined, exists: (id: string) => boolean) => {
      if (!id || exists(id)) return;
      const k = `${what}:${id}`;
      const m = missing.get(k);
      if (m) m.n++;
      else missing.set(k, { file, n: 1, message: `refers to ${what} ${id}, which doesn't exist` });
    };
    const has = (kind: EntityKind) => (id: string) => this.entries[kind].get(id)?.value != null;
    for (const e of this.entries.achievement.values()) {
      const a = e.value as Achievement | null;
      if (!a) continue;
      for (const p of a.projects) ref(e.file, 'project', p, has('project'));
      for (const r of a.repos) ref(e.file, 'repo', r, has('repo'));
      ref(e.file, 'company', a.companyId, has('company'));
      for (const ev of a.evidence) ref(e.file, 'the stored file', ev.blob, (sha) => this.entries.evidence.has(sha));
    }
    for (const e of this.entries.project.values()) {
      const p = e.value as Project | null;
      if (!p) continue;
      ref(e.file, 'company', p.companyId, has('company'));
      for (const r of p.repoIds) ref(e.file, 'repo', r, has('repo'));
    }
    for (const m of missing.values())
      out.push({ severity: 'warning', code: 'dangling', file: m.file, message: m.n > 1 ? `${m.message} (and so do ${m.n - 1} more references)` : m.message });
    return [...out.filter((p) => p.severity === 'error'), ...out.filter((p) => p.severity !== 'error')];
  }

  stats(): Record<EntityKind, number> & { problems: number; searchable: number } {
    const counts = Object.fromEntries(Object.entries(this.entries).map(([k, m]) => [k, m.size])) as Record<EntityKind, number>;
    return { ...counts, problems: this.problems().length, searchable: this.searchIndex.size };
  }

  // -------------------------------------------------------------------------------------------------------------
  // Secondary indexes
  // -------------------------------------------------------------------------------------------------------------

  private index(kind: EntityKind, value: unknown): void {
    if (kind === 'achievement') {
      const a = value as Achievement;
      for (const ev of a.evidence) if (ev.blob) addToSet(this.byBlob, ev.blob, a.id);
      for (const p of a.projects) addToSet(this.byProject, p, a.id);
      for (const r of a.repos) addToSet(this.byRepo, r, a.id);
      addToSet(this.byMonth, a.happenedAt.slice(0, 7), a.id);
      this.searchIndex.put(a, (sha) => this.get('evidence', sha));
    } else if (kind === 'evidence') {
      this.reindexBlob((value as EvidenceSidecar).sha256);
    }
  }

  /** A sidecar changed or went: its OCR text is searchable through the achievements that carry it. */
  private reindexBlob(sha: string): void {
    for (const id of this.achievementIdsIn('blob', sha)) {
      const a = this.get('achievement', id);
      if (a) this.searchIndex.put(a, (s) => this.get('evidence', s));
    }
  }

  private unindex(kind: EntityKind, value: unknown): void {
    if (!value) return;
    if (kind === 'achievement') {
      const a = value as Achievement;
      for (const ev of a.evidence) if (ev.blob) delFromSet(this.byBlob, ev.blob, a.id);
      for (const p of a.projects) delFromSet(this.byProject, p, a.id);
      for (const r of a.repos) delFromSet(this.byRepo, r, a.id);
      delFromSet(this.byMonth, a.happenedAt.slice(0, 7), a.id);
      this.searchIndex.remove(a.id);
    }
  }

  // -------------------------------------------------------------------------------------------------------------
  // Changes
  // -------------------------------------------------------------------------------------------------------------

  /** Hear about every change (ours and on disk). Returns an unsubscribe function. */
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private announce(kind: EntityKind, id: string, op: StoreChange['op'], problem = false): StoreChange {
    const c: StoreChange = { entity: kind as ChangeEntity, id, op, ...(problem ? { problem: true } : {}) };
    for (const l of this.listeners) {
      try {
        l(c);
      } catch {
        /* a broken listener mustn't break a write */
      }
    }
    return c;
  }

  /**
   * Something changed on disk at `abs` (the watcher). Re-read what's there: one file, or everything under a directory
   * that appeared or went (`dir`). Returns the changes, already announced; none for our own writes.
   */
  reloadPath(abs: string, { dir = false }: { dir?: boolean } = {}): StoreChange[] {
    const rel = toRel(path.relative(this.home, abs));
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return [];
    if (!dir) return this.reloadRel(rel);
    // a directory: re-read what we know under it (it may be gone), then pick up anything new in it
    const out: StoreChange[] = [];
    for (const map of Object.values(this.entries))
      for (const e of [...map.values()]) if (e.file.startsWith(rel + '/')) out.push(...this.reloadRel(e.file));
    for (const s of [...this.stray.keys()]) if (s.startsWith(rel + '/')) this.reloadRel(s);
    const root = SCAN_ROOTS.find((r) => rel === r.dir || rel.startsWith(r.dir + '/'));
    if (root && fs.existsSync(abs)) out.push(...this.scanDir(rel, root.depth - (rel.split('/').length - 1)));
    return out;
  }

  // -------------------------------------------------------------------------------------------------------------
  // Writing
  // -------------------------------------------------------------------------------------------------------------

  /**
   * The one write path. Reads the file as it is on disk, refuses if it's broken or from a newer BragDoc, hands its
   * current value to `edit`, applies the returned patch as a YAML merge patch (and the new body, for achievements),
   * validates the result, and writes it atomically. Returning null from `edit` writes nothing. Returns the new value.
   */
  write<K extends EntityKind>(kind: K, id: string, edit: (current: EntityTypes[K] | null) => Edit | null, opts: WriteOptions = {}): EntityTypes[K] {
    if (!validId(kind, id)) throw new NotFoundError(`there's no ${kind} ${JSON.stringify(id)}`);
    const known = this.entries[kind].get(id);
    const file = known?.file ?? relPathFor(kind, id);
    const abs = path.join(this.home, file);
    const raw = readRaw(abs);
    const exists = raw !== null;
    const etag = exists ? etagOf(raw) : null;
    if (opts.mustExist && !exists) throw new NotFoundError(`there's no ${kind} ${id}`);
    if (opts.createOnly && exists) throw new ConflictError(`${file} already exists`, etag);
    if (opts.ifMatch && !etagMatches(opts.ifMatch, etag)) throw new ConflictError(etag ? `${file} has changed since you read it; read it again` : `${file} doesn't exist`, etag);
    let current: EntityTypes[K] | null = null;
    let body = '';
    let yamlText = '';
    if (exists) {
      const r = this.check(kind, id, file, raw);
      if (r.readOnly) throw new ReadOnlyError(`${file} was written by a newer BragDoc, so this one won't change it. Upgrade BragDoc to edit it.`, etag);
      if (r.value === null)
        throw new ConflictError(`${file} has a problem (${r.problems[0]?.message ?? 'it is invalid'}), so BragDoc won't overwrite it. Fix the file by hand first.`, etag);
      current = r.value as EntityTypes[K];
      if (kind === 'achievement') ({ yaml: yamlText, body } = splitFrontMatter(raw)!);
      else yamlText = raw;
    }
    const change = edit(current);
    if (!change) return current as EntityTypes[K];
    const parsed = exists ? parse(yamlText) : null;
    if (parsed?.error) throw new ConflictError(`${file} can't be edited safely (${parsed.error.message}); fix it by hand`, etag);
    const doc = parsed ? parsed.doc : newDocument(opts.header);
    try {
      // a new file states its version; an existing one keeps whatever it says (absent reads as 1)
      mergePatch(doc, exists ? change.patch : { schemaVersion: SCHEMA_VERSIONS[kind], ...change.patch });
    } catch (err) {
      throw new ConflictError(`can't edit ${file}: ${(err as Error).message}. Fix the file by hand.`, etag);
    }
    const yamlOut = stringify(doc);
    const text = kind === 'achievement' ? joinFrontMatter(yamlOut, change.body ?? body) : yamlOut;
    const checked = this.check(kind, id, file, text);
    if (checked.value === null)
      throw new ValidationError(
        `that would make ${file} invalid: ${checked.problems.map((p) => p.message).join('; ')}`,
        checked.problems.map((p) => ({ key: p.key ?? '', message: p.message })),
      );
    if (text !== raw) {
      try {
        atomicWrite(abs, text, { createOnly: !exists });
      } catch (err) {
        if (err instanceof ExistsError) throw new ConflictError(`${file} appeared while saving; read it again`);
        throw err;
      }
    }
    this.reloadOne(kind, id, file);
    return this.get(kind, id)!;
  }

  /** Move an entity's file into backups/removed/ (never deleted). Returns where it went, relative to the data home. */
  remove(kind: EntityKind, id: string, opts: Pick<WriteOptions, 'ifMatch'> = {}): string {
    // the id becomes a path: only ever a real id, so nothing outside the entity's own file can be moved
    if (!validId(kind, id)) throw new NotFoundError(`there's no ${kind} ${JSON.stringify(id)}`);
    const e = this.entries[kind].get(id);
    const file = e?.file ?? relPathFor(kind, id);
    const abs = path.join(this.home, file);
    const raw = readRaw(abs);
    if (raw === null) throw new NotFoundError(`there's no ${kind} ${id}`);
    if (opts.ifMatch && !etagMatches(opts.ifMatch, etagOf(raw))) throw new ConflictError(`${file} has changed since you read it; read it again`, etagOf(raw));
    const dest = moveToRemoved(this.home, abs, this.now().toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/:/g, '-'));
    this.reloadOne(kind, id, file);
    return toRel(path.relative(this.home, dest));
  }

  // -------------------------------------------------------------------------------------------------------------
  // imports/: what the importer carries over that has no home of its own (SPEC R12)
  // -------------------------------------------------------------------------------------------------------------

  /**
   * Write one markdown file under `imports/` (a hosted export's documents and reviews): front-matter plus a body,
   * create-only and read-only (0444), never indexed or rewritten. `rel` is relative to the data home, under imports/.
   */
  writeImportFile(rel: string, frontMatter: Record<string, unknown> | null, body: string, header?: string): void {
    const parts = rel.split('/');
    // built from a timestamp and a slug by the importer; checked anyway, since it becomes a path
    if (parts[0] !== 'imports' || parts.length < 2 || parts.some((p) => !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(p) || p.includes('..')))
      throw new Error(`not a path under imports/: ${rel}`);
    let text = body;
    if (frontMatter) {
      const doc = newDocument(header);
      mergePatch(doc, frontMatter);
      text = joinFrontMatter(stringify(doc), body);
    }
    try {
      atomicWrite(path.join(this.home, ...parts), text, { createOnly: true, mode: 0o444 });
    } catch (err) {
      if (err instanceof ExistsError) throw new ConflictError(`${rel} already exists`);
      throw err;
    }
  }

  /** Whether `imports/<name>` exists (the importer picks a fresh one for each import). */
  importsDirExists(name: string): boolean {
    return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name) && fs.existsSync(path.join(this.home, 'imports', name));
  }

  /** Every `legacyId:` in imports/**\/*.md front-matter, with the file it's in (what earlier imports carried over). */
  importedLegacyIds(): Map<string, string> {
    const out = new Map<string, string>();
    const walk = (rel: string, depth: number) => {
      let ents: fs.Dirent[];
      try {
        ents = fs.readdirSync(path.join(this.home, rel), { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of ents) {
        if (e.name.startsWith('.')) continue;
        const r = `${rel}/${e.name}`;
        if (e.isDirectory() && depth > 0) walk(r, depth - 1);
        else if (e.isFile() && e.name.endsWith('.md')) {
          const fm = splitFrontMatter(readRaw(path.join(this.home, r)) ?? '');
          const v = fm ? readYaml(fm.yaml).value : null;
          const id = v && typeof v === 'object' ? (v as Record<string, unknown>).legacyId : undefined;
          if (typeof id === 'string' && id && !out.has(id)) out.set(id, r);
        }
      }
    };
    walk('imports', 2);
    return out;
  }

  /** Bring back the newest removed copy of an entity. ConflictError if its file has been recreated meanwhile. */
  restore<K extends EntityKind>(kind: K, id: string): EntityTypes[K] {
    if (!validId(kind, id)) throw new NotFoundError(`there's no ${kind} ${JSON.stringify(id)}`);
    const found = findRemoved(
      this.home,
      kind === 'achievement'
        ? (dir) => {
            // back to whichever month's folder it was removed from
            const root = path.join(dir, 'achievements');
            for (const y of safeList(root)) for (const m of safeList(path.join(root, y))) if (fs.existsSync(path.join(root, y, m, `${id}.md`))) return `achievements/${y}/${m}/${id}.md`;
            return null;
          }
        : relPathFor(kind, id),
    );
    if (!found) throw new NotFoundError(`there's no removed ${kind} ${id} to restore`);
    const { from, rel: file } = found;
    const abs = path.join(this.home, file);
    if (this.entries[kind].has(id)) throw new ConflictError(`${this.entries[kind].get(id)!.file} exists again, so it can't be restored over`);
    try {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      renameNoClobber(from, abs);
    } catch (err) {
      if (err instanceof ExistsError) throw new ConflictError(`${file} exists again, so it can't be restored over`);
      throw err;
    }
    this.reloadOne(kind, id, file);
    const v = this.get(kind, id);
    if (!v) throw new ConflictError(`${file} was restored, but it has a problem; fix it by hand`);
    return v;
  }
}

function safeList(d: string): string[] {
  try {
    return fs.readdirSync(d).filter((n) => /^\d+$/.test(n));
  } catch {
    return [];
  }
}

/** Open the data home: a Store with everything loaded. */
export function openStore(home: string, opts: StoreOptions = {}): Store {
  return new Store(home, opts).load();
}
