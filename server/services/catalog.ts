// Projects, companies and repos (SPEC R6): CRUD, plus linking repos to projects. A project's file holds its links
// (`repoIds`); removing anything moves its file to backups/removed/ and leaves references to it alone, so restoring it
// brings everything back as it was (meanwhile they're listed as dangling-reference Problems). `removeAndDetach` is what
// the UI's delete does instead: it also takes the id off every file that refers to it, and says which, so
// `restoreAndReattach` can undo both (D39).
import {
  CompanyCreateSchema,
  CompanyUpdateSchema,
  PROJECT_SWATCHES,
  ProjectCreateSchema,
  ProjectUpdateSchema,
  RepoCreateSchema,
  RepoUpdateSchema,
  type Achievement,
  type Company,
  type Project,
  type Repo,
} from '../../shared/schema/index.js';
import { ulid } from '../../shared/ulid.js';
import { ConflictError, NotFoundError, ValidationError, etagMatches, type Store, type WriteOptions } from '../store/index.js';
import { defined, nowIso, requireIds, today, validate } from './util.js';

type IfMatch = Pick<WriteOptions, 'ifMatch'>;

/**
 * The files a delete took a reference out of, by kind (ids), so an undo can put it back. A file that couldn't be
 * edited (broken by hand, or from a newer BragDoc) is left as it was and keeps a dangling reference: a Problem, not a
 * failed delete.
 */
export interface Detached {
  achievements: string[];
  projects: string[];
}

type RefKind = 'project' | 'company' | 'repo';

/** Take `id` off every achievement (and, for companies and repos, every project) that refers to it. */
function detach(store: Store, kind: RefKind, id: string): Detached {
  const out: Detached = { achievements: [], projects: [] };
  const tryWrite = (fn: () => unknown, ok: () => void) => {
    try {
      fn();
      ok();
    } catch {
      /* broken or read-only: it keeps the dangling reference (see Detached) */
    }
  };
  const achievementIds =
    kind === 'project'
      ? [...store.achievementIdsIn('project', id)]
      : kind === 'repo'
        ? [...store.achievementIdsIn('repo', id)]
        : store.all('achievement').filter((a) => a.companyId === id).map((a) => a.id);
  for (const aid of achievementIds) {
    const patch = (cur: Achievement) =>
      kind === 'project' ? { projects: cur.projects.filter((p) => p !== id) } : kind === 'repo' ? { repos: cur.repos.filter((r) => r !== id) } : { companyId: null };
    tryWrite(
      () => store.write('achievement', aid, (cur) => (cur ? { patch: { ...patch(cur), updatedAt: nowIso(store) } } : null), { mustExist: true }),
      () => out.achievements.push(aid),
    );
  }
  if (kind !== 'project') {
    const projectIds = store.all('project').filter((p) => (kind === 'company' ? p.companyId === id : p.repoIds.includes(id))).map((p) => p.id);
    for (const pid of projectIds)
      tryWrite(
        () => store.write('project', pid, (cur) => (cur ? { patch: kind === 'company' ? { companyId: null } : { repoIds: cur.repoIds.filter((r) => r !== id) } } : null), { mustExist: true }),
        () => out.projects.push(pid),
      );
  }
  return out;
}

/** Put `id` back on the files `detach` took it off (those that still exist; nothing is added twice). */
function reattach(store: Store, kind: RefKind, id: string, d: Partial<Detached>): void {
  const quietly = (fn: () => unknown) => {
    try {
      fn();
    } catch {
      /* gone or broken since: nothing to put back */
    }
  };
  for (const aid of d.achievements ?? [])
    quietly(() =>
      store.write(
        'achievement',
        aid,
        (cur) => {
          if (!cur) return null;
          if (kind === 'project') return cur.projects.includes(id) ? null : { patch: { projects: [...cur.projects, id], updatedAt: nowIso(store) } };
          if (kind === 'repo') return cur.repos.includes(id) ? null : { patch: { repos: [...cur.repos, id], updatedAt: nowIso(store) } };
          return cur.companyId ? null : { patch: { companyId: id, updatedAt: nowIso(store) } };
        },
        { mustExist: true },
      ),
    );
  if (kind === 'project') return;
  for (const pid of d.projects ?? [])
    quietly(() =>
      store.write(
        'project',
        pid,
        (cur) => {
          if (!cur) return null;
          if (kind === 'company') return cur.companyId ? null : { patch: { companyId: id } };
          return cur.repoIds.includes(id) ? null : { patch: { repoIds: [...cur.repoIds, id] } };
        },
        { mustExist: true },
      ),
    );
}

/** Check a delete's If-Match before anything is detached, so a stale delete changes nothing. */
function precheck(store: Store, kind: RefKind, id: string, opts: IfMatch): void {
  const e = store.entry(kind, id);
  if (!e?.etag) throw new NotFoundError(`there's no ${kind} ${id}`);
  if (opts.ifMatch && !etagMatches(opts.ifMatch, e.etag)) throw new ConflictError(`${e.file} has changed since you read it; read it again`, e.etag);
}

/** A project can't end before it starts (a file edited by hand still can: the Gantt copes). */
function checkDates(start: string, end: string | null | undefined): void {
  if (end && end < start) throw new ValidationError(`end: it ends (${end}) before it starts (${start})`, [{ key: 'end', message: 'before the start' }]);
}

export class ProjectService {
  constructor(private store: Store) {}

  get(id: string): Project {
    const p = this.store.get('project', id);
    if (!p) throw new NotFoundError(`there's no project ${id}`);
    return p;
  }

  /** Every project, by start date (newest first), then name. */
  list(): Project[] {
    return this.store.all('project').sort((a, b) => (a.start < b.start ? 1 : a.start > b.start ? -1 : a.name.localeCompare(b.name)));
  }

  create(input: unknown): Project {
    const v = validate(ProjectCreateSchema, input);
    requireIds(this.store, 'company', [v.companyId], 'companyId');
    requireIds(this.store, 'repo', v.repoIds ?? [], 'repoIds');
    const id = ulid(this.store.now().getTime());
    checkDates(v.start ?? today(this.store), v.end);
    const color = v.color ?? PROJECT_SWATCHES[this.store.all('project').length % PROJECT_SWATCHES.length];
    return this.store.write('project', id, () => ({ patch: defined({ id, ...v, color, start: v.start ?? today(this.store), repoIds: v.repoIds ?? [] }) }), { createOnly: true });
  }

  update(id: string, input: unknown, opts: IfMatch = {}): Project {
    const v = validate(ProjectUpdateSchema, input);
    requireIds(this.store, 'company', [v.companyId], 'companyId');
    requireIds(this.store, 'repo', v.repoIds ?? [], 'repoIds');
    return this.store.write(
      'project',
      id,
      (cur) => {
        if (cur && (v.start !== undefined || v.end !== undefined)) checkDates(v.start ?? cur.start, v.end === undefined ? cur.end : v.end);
        return { patch: defined(v) };
      },
      { ...opts, mustExist: true },
    );
  }

  linkRepo(projectId: string, repoId: string): Project {
    requireIds(this.store, 'repo', [repoId], 'repoId');
    return this.store.write('project', projectId, (cur) => (cur!.repoIds.includes(repoId) ? null : { patch: { repoIds: [...cur!.repoIds, repoId] } }), { mustExist: true });
  }

  unlinkRepo(projectId: string, repoId: string): Project {
    return this.store.write('project', projectId, (cur) => (cur!.repoIds.includes(repoId) ? { patch: { repoIds: cur!.repoIds.filter((r) => r !== repoId) } } : null), {
      mustExist: true,
    });
  }

  /** Projects a repo is linked to (for suggesting projects from a PR's repo). */
  forRepo(repoId: string): Project[] {
    return this.store.all('project').filter((p) => p.repoIds.includes(repoId));
  }

  remove(id: string, opts: IfMatch = {}): { removedTo: string } {
    return { removedTo: this.store.remove('project', id, opts) };
  }

  restore(id: string): Project {
    return this.store.restore('project', id);
  }

  /** Delete from the UI: move the file aside and take the project off everything that refers to it (D39). */
  removeAndDetach(id: string, opts: IfMatch = {}): { removedTo: string; detached: Detached } {
    precheck(this.store, 'project', id, opts);
    const removedTo = this.store.remove('project', id, opts);
    return { removedTo, detached: detach(this.store, 'project', id) };
  }

  /** Undo removeAndDetach: bring the file back, then the references. */
  restoreAndReattach(id: string, detached: Partial<Detached> = {}): Project {
    const v = this.store.restore('project', id);
    reattach(this.store, 'project', id, detached);
    return v;
  }
}

export class CompanyService {
  constructor(private store: Store) {}

  get(id: string): Company {
    const c = this.store.get('company', id);
    if (!c) throw new NotFoundError(`there's no company ${id}`);
    return c;
  }

  list(): Company[] {
    return this.store.all('company').sort((a, b) => ((a.start ?? '') < (b.start ?? '') ? 1 : (a.start ?? '') > (b.start ?? '') ? -1 : a.name.localeCompare(b.name)));
  }

  create(input: unknown): Company {
    const v = validate(CompanyCreateSchema, input);
    const id = ulid(this.store.now().getTime());
    return this.store.write('company', id, () => ({ patch: defined({ id, ...v }) }), { createOnly: true });
  }

  update(id: string, input: unknown, opts: IfMatch = {}): Company {
    const v = validate(CompanyUpdateSchema, input);
    return this.store.write('company', id, () => ({ patch: defined(v) }), { ...opts, mustExist: true });
  }

  remove(id: string, opts: IfMatch = {}): { removedTo: string } {
    return { removedTo: this.store.remove('company', id, opts) };
  }

  restore(id: string): Company {
    return this.store.restore('company', id);
  }

  /** Delete from the UI: move the file aside and take the company off everything that refers to it (D39). */
  removeAndDetach(id: string, opts: IfMatch = {}): { removedTo: string; detached: Detached } {
    precheck(this.store, 'company', id, opts);
    const removedTo = this.store.remove('company', id, opts);
    return { removedTo, detached: detach(this.store, 'company', id) };
  }

  /** Undo removeAndDetach: bring the file back, then the references. */
  restoreAndReattach(id: string, detached: Partial<Detached> = {}): Company {
    const v = this.store.restore('company', id);
    reattach(this.store, 'company', id, detached);
    return v;
  }
}

/**
 * A remote URL in one spelling, so the same repo isn't added twice: `git@github.com:o/r.git`, `ssh://git@github.com/o/r`
 * and `https://github.com/o/r/` are all `https://github.com/o/r`. Null if it isn't a URL we understand.
 */
export function normalizeRemote(url: string): { url: string; host: string; path: string } | null {
  const s = url.trim();
  const scp = /^(?:[\w.-]+@)?([\w.-]+):(?!\/\/)(.+)$/.exec(s);
  let host: string;
  let p: string;
  if (scp && !/^[a-z]+:\/\//i.test(s)) [host, p] = [scp[1], scp[2]];
  else {
    try {
      const u = new URL(s);
      if (!['http:', 'https:', 'ssh:', 'git:'].includes(u.protocol)) return null;
      [host, p] = [u.hostname, u.pathname];
    } catch {
      return null;
    }
  }
  p = p.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\.git$/, '');
  if (!host || !p) return null;
  host = host.toLowerCase();
  return { url: `https://${host}/${p}`, host, path: p };
}

export class RepoService {
  constructor(private store: Store) {}

  get(id: string): Repo {
    const r = this.store.get('repo', id);
    if (!r) throw new NotFoundError(`there's no repo ${id}`);
    return r;
  }

  list(): Repo[] {
    return this.store.all('repo').sort((a, b) => a.name.localeCompare(b.name));
  }

  /** The repo with this local path or remote (in any spelling), if there is one. */
  find(by: { localPath?: string; remoteUrl?: string }): Repo | undefined {
    const remote = by.remoteUrl ? normalizeRemote(by.remoteUrl)?.url : undefined;
    return this.store.all('repo').find((r) => (by.localPath && r.localPath === by.localPath) || (remote && r.remoteUrl && normalizeRemote(r.remoteUrl)?.url === remote));
  }

  /** Add a repo, or return the one already there with the same path or remote (`created: false`). */
  create(input: unknown): { repo: Repo; created: boolean } {
    const v = validate(RepoCreateSchema, input);
    const existing = this.find(v);
    if (existing) return { repo: existing, created: false };
    const remote = v.remoteUrl ? normalizeRemote(v.remoteUrl) : null;
    const name = v.name ?? remote?.path ?? v.localPath!.replace(/[\\/]+$/, '').split(/[\\/]/).pop()!;
    const id = ulid(this.store.now().getTime());
    const repo = this.store.write(
      'repo',
      id,
      () => ({ patch: defined({ id, name, localPath: v.localPath, remoteUrl: remote?.url ?? v.remoteUrl, host: remote?.host ?? 'local', tracked: v.tracked ?? true, example: v.example }) }),
      { createOnly: true },
    );
    return { repo, created: true };
  }

  update(id: string, input: unknown, opts: IfMatch = {}): Repo {
    const v = validate(RepoUpdateSchema, input);
    const remote = v.remoteUrl ? normalizeRemote(v.remoteUrl) : null;
    const patch = defined({ ...v, ...(v.remoteUrl ? { remoteUrl: remote?.url ?? v.remoteUrl, host: remote?.host ?? 'local' } : {}), ...(v.remoteUrl === null ? { host: 'local' } : {}) });
    return this.store.write('repo', id, () => ({ patch }), { ...opts, mustExist: true });
  }

  remove(id: string, opts: IfMatch = {}): { removedTo: string } {
    return { removedTo: this.store.remove('repo', id, opts) };
  }

  restore(id: string): Repo {
    return this.store.restore('repo', id);
  }

  /** Delete from the UI: move the file aside and take the repo off everything that refers to it (D39). */
  removeAndDetach(id: string, opts: IfMatch = {}): { removedTo: string; detached: Detached } {
    precheck(this.store, 'repo', id, opts);
    const removedTo = this.store.remove('repo', id, opts);
    return { removedTo, detached: detach(this.store, 'repo', id) };
  }

  /** Undo removeAndDetach: bring the file back, then the references. */
  restoreAndReattach(id: string, detached: Partial<Detached> = {}): Repo {
    const v = this.store.restore('repo', id);
    reattach(this.store, 'repo', id, detached);
    return v;
  }
}

