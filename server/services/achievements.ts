// Achievements: create, update, archive, remove, restore, list and search (SPEC R5, R11). Every call validates its
// input, writes through the store (atomically, updating the index at once) and returns the result.
import { AchievementCreateSchema, AchievementListSchema, AchievementUpdateSchema, type Achievement, type Evidence } from '../../shared/schema/index.js';
import { ulid } from '../../shared/ulid.js';
import { NotFoundError, type Store, type WriteOptions } from '../store/index.js';
import { defined, nowIso, requireIds, today, validate, withEvidenceIds } from './util.js';

export interface ListResult {
  items: Achievement[];
  /** How many match, before limit and offset. */
  total: number;
}

const byDateDesc = (a: Achievement, b: Achievement) => (a.happenedAt < b.happenedAt ? 1 : a.happenedAt > b.happenedAt ? -1 : a.id < b.id ? 1 : a.id > b.id ? -1 : 0);

export class AchievementService {
  constructor(private store: Store) {}

  get(id: string): Achievement {
    const a = this.store.get('achievement', id);
    if (!a) throw new NotFoundError(`there's no achievement ${id}`);
    return a;
  }

  /**
   * Add an achievement. Idempotent: if one with the same `externalKey` (its own or one of its evidence's) or
   * `legacyId` exists, that one is returned with `created: false` and nothing is written.
   */
  create(input: unknown): { achievement: Achievement; created: boolean } {
    const v = validate(AchievementCreateSchema, input);
    const existing =
      (v.externalKey && this.store.achievementIdByKey(v.externalKey)) || (v.legacyId && this.store.achievementIdByLegacyId(v.legacyId)) || undefined;
    if (existing) return { achievement: this.get(existing), created: false };
    requireIds(this.store, 'project', v.projects ?? [], 'projects');
    requireIds(this.store, 'repo', v.repos ?? [], 'repos');
    requireIds(this.store, 'company', [v.companyId], 'companyId');
    const now = nowIso(this.store);
    // an imported achievement's id comes from its original time, so it files under the month it was made
    const id = ulid(v.createdAt ? Date.parse(v.createdAt) : this.store.now().getTime());
    const { body, evidence, ...rest } = v;
    const achievement = this.store.write(
      'achievement',
      id,
      () => ({
        patch: defined({
          id,
          ...rest,
          happenedAt: v.happenedAt ?? today(this.store),
          projects: v.projects ?? [],
          repos: v.repos ?? [],
          evidence: withEvidenceIds(this.store, evidence ?? []),
          source: v.source ?? 'manual',
          archived: v.archived ?? false,
          createdAt: v.createdAt ?? now,
          updatedAt: now,
        }),
        body: body ? (body.endsWith('\n') ? body : body + '\n') : '',
      }),
      { createOnly: true },
    );
    return { achievement, created: true };
  }

  /** Change some fields (`null` clears one). `evidence`, if given, is the whole new list. */
  update(id: string, input: unknown, opts: Pick<WriteOptions, 'ifMatch'> = {}): Achievement {
    const v = validate(AchievementUpdateSchema, input);
    if (v.projects) requireIds(this.store, 'project', v.projects, 'projects');
    if (v.repos) requireIds(this.store, 'repo', v.repos, 'repos');
    requireIds(this.store, 'company', [v.companyId], 'companyId');
    const { body, evidence, ...rest } = v;
    const ev = evidence ? withEvidenceIds(this.store, evidence) : undefined;
    return this.store.write(
      'achievement',
      id,
      () => ({ patch: defined({ ...rest, ...(ev ? { evidence: ev } : {}), updatedAt: nowIso(this.store) }), body }),
      { ...opts, mustExist: true },
    );
  }

  /** Add evidence to an achievement (skipping any with an externalKey or blob it already carries). Returns the ids added. */
  addEvidence(id: string, evidence: readonly Evidence[]): { achievement: Achievement; added: string[] } {
    let added: string[] = [];
    const achievement = this.store.write(
      'achievement',
      id,
      (cur) => {
        const fresh = evidence.filter(
          (e) => !cur!.evidence.some((x) => (e.externalKey && x.externalKey === e.externalKey) || (e.blob && x.blob === e.blob) || x.id === e.id),
        );
        added = fresh.map((e) => e.id);
        return fresh.length ? { patch: { evidence: [...cur!.evidence, ...fresh], updatedAt: nowIso(this.store) } } : null;
      },
      { mustExist: true },
    );
    return { achievement, added };
  }

  /** Take evidence off an achievement by id (the stored file stays in evidence/: other achievements may share it). */
  removeEvidence(id: string, evidenceIds: readonly string[]): Achievement {
    return this.store.write(
      'achievement',
      id,
      (cur) => {
        const left = cur!.evidence.filter((e) => !evidenceIds.includes(e.id));
        return left.length === cur!.evidence.length ? null : { patch: { evidence: left, updatedAt: nowIso(this.store) } };
      },
      { mustExist: true },
    );
  }

  archive(id: string, archived = true): Achievement {
    return this.store.write('achievement', id, (cur) => (cur!.archived === archived ? null : { patch: { archived, updatedAt: nowIso(this.store) } }), { mustExist: true });
  }

  /** Move its file into backups/removed/ (undo with restore). Returns where it went. */
  remove(id: string, opts: Pick<WriteOptions, 'ifMatch'> = {}): { removedTo: string } {
    return { removedTo: this.store.remove('achievement', id, opts) };
  }

  restore(id: string): Achievement {
    return this.store.restore('achievement', id);
  }

  /** The board's query: filters, then newest first (or best match first for a search). */
  list(input: unknown = {}): ListResult {
    const f = validate(AchievementListSchema, input);
    const scores = f.q ? new Map(this.store.search(f.q).map((r) => [r.id, r.score])) : null;
    let ids: Iterable<string> | null = scores ? scores.keys() : null;
    // start from the smallest index that applies
    if (f.projectId) ids = intersect(ids, this.store.achievementIdsIn('project', f.projectId));
    if (f.repoId) ids = intersect(ids, this.store.achievementIdsIn('repo', f.repoId));
    const pool = ids ? [...ids].map((id) => this.store.get('achievement', id)).filter((a): a is Achievement => !!a) : this.store.all('achievement');
    const archived = f.archived ?? 'exclude';
    const companyProjects = f.companyId ? new Set(this.store.all('project').filter((p) => p.companyId === f.companyId).map((p) => p.id)) : null;
    const items = pool.filter(
      (a) =>
        (archived === 'include' || (archived === 'only') === a.archived) &&
        (!f.from || a.happenedAt >= f.from) &&
        (!f.to || a.happenedAt <= f.to) &&
        (!f.source || a.source === f.source) &&
        (!f.minImpact || (a.impact ?? 0) >= f.minImpact) &&
        (!companyProjects || a.companyId === f.companyId || a.projects.some((p) => companyProjects.has(p))),
    );
    if (scores && f.sort !== 'date') items.sort((a, b) => scores.get(b.id)! - scores.get(a.id)! || byDateDesc(a, b));
    else items.sort(byDateDesc);
    const offset = f.offset ?? 0;
    return { items: items.slice(offset, offset + (f.limit ?? 100)), total: items.length };
  }

  /** Full-text search, best match first. */
  search(q: string, filters: Record<string, unknown> = {}): ListResult {
    return this.list({ ...filters, q });
  }
}

function intersect(a: Iterable<string> | null, b: ReadonlySet<string>): Iterable<string> {
  return a ? [...a].filter((x) => b.has(x)) : b;
}
