// Found (SPEC R7): candidates sources spotted, kept, merged into an achievement, or dismissed, each undoable. Adding is
// idempotent on externalKey: a key already in Found (pending, kept or dismissed) or on the board is never added again,
// which is how a dismissed PR stays dismissed. Candidates' files (a screenshot's path) are copied into evidence/ only
// when you keep or merge them.
import {
  FoundAddSchema,
  FoundKeepSchema,
  type AchievementSource,
  type Evidence,
  type FoundCandidate,
  type FoundSource,
} from '../../shared/schema/index.js';
import { ulid } from '../../shared/ulid.js';
import { ConflictError, NotFoundError, type Store } from '../store/index.js';
import type { AchievementService } from './achievements.js';
import { ATTACHABLE, type EvidenceService } from './evidence.js';
import { defined, nowIso, today, validate, withEvidenceIds } from './util.js';

const SOURCE_FOR: Record<FoundSource, AchievementSource> = { github: 'github-pr', screenshots: 'screenshot', mcp: 'mcp' };

export interface AddResult {
  /** The new candidate, or the one already in Found with this key (null if the key is on the board). */
  candidate: FoundCandidate | null;
  created: boolean;
  /** Why nothing was added. */
  reason?: 'exists' | 'dismissed' | 'on-board';
  /** For `on-board`: the achievement that has the key. */
  achievementId?: string;
}

export interface DecideResult {
  candidate: FoundCandidate;
  achievementId: string;
  /** Files the candidate pointed at that are gone, so weren't attached. */
  missingFiles: string[];
}

export class FoundService {
  constructor(
    private store: Store,
    private achievements: AchievementService,
    private evidence: EvidenceService,
  ) {}

  get(id: string): FoundCandidate {
    const f = this.store.get('found', id);
    if (!f) throw new NotFoundError(`there's nothing in Found with id ${id}`);
    return f;
  }

  /** Candidates, newest first: pending only by default. */
  list(filter: { status?: FoundCandidate['status'] | 'all'; source?: FoundSource } = {}): FoundCandidate[] {
    const status = filter.status ?? 'pending';
    return this.store
      .all('found')
      .filter((f) => (status === 'all' || f.status === status) && (!filter.source || f.source === filter.source))
      .sort((a, b) => (a.foundAt < b.foundAt ? 1 : a.foundAt > b.foundAt ? -1 : a.id < b.id ? 1 : -1));
  }

  pendingCount(): number {
    return this.store.all('found').filter((f) => f.status === 'pending').length;
  }

  add(input: unknown): AddResult {
    const v = validate(FoundAddSchema, input);
    const keys = [v.externalKey, ...(v.evidence ?? []).map((e) => e.externalKey)].filter((k): k is string => !!k);
    for (const k of keys) {
      const fid = this.store.foundIdByKey(k);
      if (fid) {
        // a candidate whose file is broken still holds its key (it may be a dismissed one)
        const f = this.store.get('found', fid) ?? null;
        return { candidate: f, created: false, reason: f?.status === 'dismissed' ? 'dismissed' : 'exists' };
      }
      const aid = this.store.achievementIdByKey(k);
      if (aid) return { candidate: null, created: false, reason: 'on-board', achievementId: aid };
    }
    const { quote, evidence, ...rest } = v;
    const id = ulid(this.store.now().getTime());
    const allEvidence = [...(evidence ?? []), ...(quote ? [{ kind: 'quote' as const, quote }] : [])];
    const candidate = this.store.write(
      'found',
      id,
      () => ({
        patch: defined({ id, status: 'pending', ...rest, happenedAt: v.happenedAt ?? today(this.store), evidence: withEvidenceIds(this.store, allEvidence), foundAt: nowIso(this.store) }),
      }),
      { createOnly: true },
    );
    return { candidate, created: true };
  }

  /** The candidate, if it's pending and its file can be written (checked first, so a decision never half-happens). */
  private pending(id: string): FoundCandidate {
    const f = this.get(id);
    if (f.status !== 'pending') throw new ConflictError(`that one was already ${f.status}; undo it first`);
    this.writable(id);
    return f;
  }

  private writable(id: string): void {
    const e = this.store.entry('found', id)!;
    if (e.readOnly || e.problems.some((p) => p.severity === 'error' && p.code !== 'dangling'))
      throw new ConflictError(`${e.file} has a problem (${e.problems[0]?.message}); fix it by hand first`);
  }

  /** Copy the candidate's files into evidence/, as Evidence items. */
  private async ingestFiles(f: FoundCandidate): Promise<{ evidence: Evidence[]; missing: string[] }> {
    const evidence: Evidence[] = [];
    const missing: string[] = [];
    for (const file of f.files) {
      try {
        // a screenshots candidate brings images, an agent's the types agents may attach (D42), checked again now: the
        // file may have changed since it was sent
        const i = await this.evidence.ingestPath(file.path, f.source === 'screenshots' ? { only: ['image'] } : f.source === 'mcp' ? { accept: ATTACHABLE } : {});
        evidence.push(this.evidence.toEvidence(i, file.title));
      } catch {
        missing.push(file.path);
      }
    }
    return { evidence, missing };
  }

  /** Keep: make an achievement from it (with its evidence and suggested projects, unless `input` says otherwise). */
  async keep(id: string, input: unknown = {}): Promise<DecideResult> {
    const o = validate(FoundKeepSchema, input);
    const f = this.pending(id);
    // its key is on the board already (added some other way since): keeping it means merging into that one, so that
    // undo never removes an achievement this candidate didn't make
    const onBoard = f.externalKey ? this.store.achievementIdByKey(f.externalKey) : undefined;
    if (onBoard && this.store.get('achievement', onBoard)) return this.merge(id, onBoard);
    const files = await this.ingestFiles(f);
    this.pending(id); // still pending after the await
    const { achievement } = this.achievements.create(
      defined({
        title: o.title ?? f.title,
        summary: o.summary ?? f.summary,
        body: o.body ?? f.body,
        happenedAt: o.happenedAt ?? f.happenedAt,
        impact: o.impact ?? f.impact,
        projects: (o.projects ?? f.suggestedProjects).filter((p) => this.store.get('project', p)),
        repos: (o.repos ?? f.suggestedRepos).filter((r) => this.store.get('repo', r)),
        evidence: [...f.evidence, ...files.evidence],
        source: SOURCE_FOR[f.source],
        sourceAgent: f.sourceAgent,
        externalKey: f.externalKey,
      }),
    );
    const candidate = this.decide(id, { action: 'keep', at: nowIso(this.store), achievementId: achievement.id });
    return { candidate, achievementId: achievement.id, missingFiles: files.missing };
  }

  /** Merge into an existing achievement: attach the candidate's evidence to it. */
  async merge(id: string, achievementId: string): Promise<DecideResult> {
    const f = this.pending(id);
    this.achievements.get(achievementId);
    const files = await this.ingestFiles(f);
    this.pending(id);
    const { added } = this.achievements.addEvidence(achievementId, [...f.evidence, ...files.evidence]);
    const candidate = this.decide(id, { action: 'merge', at: nowIso(this.store), achievementId, evidenceIds: added });
    return { candidate, achievementId, missingFiles: files.missing };
  }

  dismiss(id: string): FoundCandidate {
    this.pending(id);
    return this.decide(id, { action: 'dismiss', at: nowIso(this.store) });
  }

  /**
   * Undo the decision: a dismissed one comes back; a kept one's achievement is removed (to backups/removed/, so it can
   * still be restored); a merge takes exactly the evidence it added off the achievement again.
   */
  undo(id: string): FoundCandidate {
    const f = this.get(id);
    const d = f.decision;
    if (f.status === 'pending' || !d) throw new ConflictError('there is nothing to undo: it is still pending');
    this.writable(id);
    if (d.action === 'keep' && d.achievementId && this.store.get('achievement', d.achievementId)) this.achievements.remove(d.achievementId);
    if (d.action === 'merge' && d.achievementId && d.evidenceIds?.length && this.store.get('achievement', d.achievementId))
      this.achievements.removeEvidence(d.achievementId, d.evidenceIds);
    return this.store.write('found', id, () => ({ patch: { status: 'pending', decision: null } }), { mustExist: true });
  }

  private decide(id: string, decision: NonNullable<FoundCandidate['decision']>): FoundCandidate {
    const status = decision.action === 'dismiss' ? 'dismissed' : 'kept';
    return this.store.write('found', id, () => ({ patch: { status, decision: defined(decision) } }), { mustExist: true });
  }
}
