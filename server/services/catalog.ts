// Projects, companies and repos (SPEC R6): CRUD, plus linking repos to projects. A project's file holds its links
// (`repoIds`); removing anything moves its file to backups/removed/ and leaves references to it alone, so restoring it
// brings everything back as it was (meanwhile they're listed as dangling-reference Problems).
import {
  CompanyCreateSchema,
  CompanyUpdateSchema,
  PROJECT_SWATCHES,
  ProjectCreateSchema,
  ProjectUpdateSchema,
  RepoCreateSchema,
  RepoUpdateSchema,
  type Company,
  type Project,
  type Repo,
} from '../../shared/schema/index.js';
import { ulid } from '../../shared/ulid.js';
import { NotFoundError, type Store, type WriteOptions } from '../store/index.js';
import { defined, requireIds, today, validate } from './util.js';

type IfMatch = Pick<WriteOptions, 'ifMatch'>;

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
    const color = v.color ?? PROJECT_SWATCHES[this.store.all('project').length % PROJECT_SWATCHES.length];
    return this.store.write('project', id, () => ({ patch: defined({ id, ...v, color, start: v.start ?? today(this.store), repoIds: v.repoIds ?? [] }) }), { createOnly: true });
  }

  update(id: string, input: unknown, opts: IfMatch = {}): Project {
    const v = validate(ProjectUpdateSchema, input);
    requireIds(this.store, 'company', [v.companyId], 'companyId');
    requireIds(this.store, 'repo', v.repoIds ?? [], 'repoIds');
    return this.store.write('project', id, () => ({ patch: defined(v) }), { ...opts, mustExist: true });
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
}

