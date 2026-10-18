// Found (SPEC R7): what the sources spotted, waiting for a yes or no. A filter row by source, the candidates newest
// first, Keep · Merge into… · Dismiss with Undo, and the two empty states. Live: a check that finds something, an agent's
// suggestion, or a decision in another tab shows up here by itself (the `found` and `sources` events). With the judge
// on (v0.2), Judge now asks it about what's waiting; its verdicts arrive on the cards as they're written. Once there
// are verdicts the list is grouped (SPEC R21): "Looks like a win" (surest first), then not judged yet, then "Probably
// not", collapsed, with an explicit "Dismiss these N" (one request; Undo brings them all back). The judge never
// dismisses anything itself. Without a verdict (AI never on: the default) it's v0.1's list exactly. Adapted from the
// Scrapbook prototype's Found.tsx.
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import type { AiJudgeStatus, FoundSourceName, ProjectEntry, RepoEntry } from '../../shared/api.ts';
import type { FoundCandidate } from '../../shared/schema/index.ts';
import { dismissFoundMany, isApiError, runJudge, undoFoundMany } from '../api/client.ts';
import { queryKeys, useFound, useJudgeStatus, useProjects, useRepos, useSources } from '../api/queries.ts';
import { EmptyFound } from '../found/EmptyFound.tsx';
import { FoundCard, PROVENANCE_OF } from '../found/FoundCard.tsx';
import { useDecide } from '../found/decide.ts';
import { groupFound, scheduleLine } from '../found/judge.ts';
import { Btn, FilterChip, PageTitle, PROVENANCE, useToast } from '../kit/index.ts';
import { LoadError } from '../settings/common.tsx';

export const Route = createFileRoute('/found')({ component: Found });

const SOURCES: FoundSourceName[] = ['github', 'screenshots', 'mcp'];

function Found() {
  const [filter, setFilter] = useState<FoundSourceName | undefined>(undefined);
  const found = useFound(filter);
  const sources = useSources();
  const projects = useProjects();
  const repos = useRepos();
  const decide = useDecide();
  const judge = useJudgeStatus();
  const judgeOn = !!judge.data?.ready;
  // a verdict from before: only once we know the judge can't run now (not while its status loads)
  const judgedEarlier = judge.data && !judge.data.ready ? (judge.data.reason === 'ai_off' ? 'the judge is off now' : 'the judge can’t run now') : null;
  const projectMap = useMemo(() => new Map((projects.data?.projects ?? []).map((p) => [p.id, p])), [projects.data]);
  const repoMap = useMemo(() => new Map((repos.data?.repos ?? []).map((r) => [r.id, r])), [repos.data]);
  const counts = found.data?.counts;
  const items = found.data?.items ?? [];
  const label = (s: FoundSourceName) => PROVENANCE[PROVENANCE_OF[s]].short;

  return (
    <div data-testid="found-page">
      <PageTitle
        hand={counts?.all ? `${counts.all} waiting` : undefined}
        sub="Things your sources spotted by themselves. Nothing goes on your board until you say so."
        right={
          <div className="flex flex-wrap items-center gap-3">
            {judgeOn && <JudgeNow status={judge.data!} />}
            <Link to="/settings/$tab" params={{ tab: 'sources' }} className="text-[13px] font-semibold text-muted underline decoration-dotted underline-offset-2 hover:text-ink">
              Manage sources
            </Link>
          </div>
        }
      >
        Found
      </PageTitle>

      {judgeOn && judge.data?.schedule && <JudgeLine status={judge.data} />}

      {!!counts?.all && (
        <div className="mt-7 flex flex-wrap items-center gap-2" role="group" aria-label="Show" data-testid="found-filters">
          <FilterChip on={!filter} onClick={() => setFilter(undefined)} label="Everything" count={counts.all} />
          {SOURCES.filter((s) => counts[s] || filter === s).map((s) => (
            <FilterChip key={s} on={filter === s} onClick={() => setFilter(s)} label={label(s)} count={counts[s]} color={PROVENANCE[PROVENANCE_OF[s]].bg} />
          ))}
        </div>
      )}

      {found.isError ? (
        <div className="mt-8">
          <LoadError error={found.error} what="Found" retry={() => void found.refetch()} />
        </div>
      ) : found.isPending ? (
        <div className="mt-10 text-[14px] text-faint">Loading…</div>
      ) : items.length === 0 ? (
        <EmptyFound sources={sources.data} filtered={filter && counts?.all ? label(filter) : undefined} judge={judgeOn ? judge.data! : null} />
      ) : (
        <FoundList
          items={items}
          projects={projectMap}
          repos={repoMap}
          decide={decide}
          judgedEarlier={judgedEarlier}
          judge={judge.data && judgeOn ? judge.data : null}
        />
      )}
    </div>
  );
}

type Decider = ReturnType<typeof useDecide>;

/**
 * The candidates: v0.1's list until any has a verdict, then the three groups. "Probably not" stays collapsed until you
 * open it, and stays in Found until you dismiss it: there's no timer and no rule that empties it (SPEC R21).
 */
function FoundList({ items, projects, repos, decide, judgedEarlier, judge }: { items: FoundCandidate[]; projects: ReadonlyMap<string, ProjectEntry>; repos: ReadonlyMap<string, RepoEntry>; decide: Decider; judgedEarlier: string | null; judge: AiJudgeStatus | null }) {
  const g = useMemo(() => groupFound(items), [items]);
  const [openNo, setOpenNo] = useState(false);
  const again = useJudgeAgain();
  const running = !!judge?.running;
  const kindOn = (c: FoundCandidate) => !!judge && ((c.source === 'screenshots' && judge.kinds.screenshots) || (c.source === 'github' && judge.kinds.github));
  const card = (c: FoundCandidate) => (
    <FoundCard
      key={c.id}
      c={c}
      projects={projects}
      repos={repos}
      busy={decide.isPending && decide.variables?.c.id === c.id}
      onDecide={(d) => decide.mutate({ c, d })}
      judgedEarlier={judgedEarlier}
      judge={kindOn(c) ? { again: () => again.mutate(c.id), busy: running || again.isPending } : null}
    />
  );
  if (!g.grouped)
    return (
      <div className="mt-8 gap-8 lg:columns-2" data-testid="found-list">
        {items.map(card)}
      </div>
    );
  return (
    <div className="mt-8 space-y-10" data-testid="found-list" data-grouped="true">
      {g.wins.length > 0 && (
        <section data-testid="found-group-wins" aria-label="Looks like a win">
          <GroupTitle title="Looks like a win" count={g.wins.length} sub="The judge thinks these are worth keeping, surest first. Nothing is kept until you press Keep." />
          <div className="mt-4 gap-8 lg:columns-2">{g.wins.map(card)}</div>
        </section>
      )}
      {g.unjudged.length > 0 && (
        <section data-testid="found-group-unjudged" aria-label="Not judged yet">
          <GroupTitle title="Not judged yet" count={g.unjudged.length} sub={judge ? undefined : 'The judge isn’t on, so these wait for you as they are.'} />
          <div className="mt-4 gap-8 lg:columns-2">{g.unjudged.map(card)}</div>
        </section>
      )}
      {g.probablyNot.length > 0 && (
        <section data-testid="found-group-no" aria-label="Probably not">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setOpenNo((x) => !x)} aria-expanded={openNo} className="flex items-baseline gap-2 text-left" data-testid="found-group-no-toggle">
              <span className="font-grotesk text-[20px] font-bold">Probably not</span>
              <span className="rounded-full bg-sunk px-2 text-[13px] font-semibold text-muted" data-testid="found-group-no-count">
                {g.probablyNot.length}
              </span>
              <span className="text-[13px] font-semibold text-muted underline decoration-dotted underline-offset-2">{openNo ? 'Hide' : 'Show'}</span>
            </button>
            <DismissThese items={g.probablyNot} />
          </div>
          <p className="m-0 mt-1 text-[13px] text-muted">The judge doesn’t think these are wins. They stay here until you decide: it never dismisses anything.</p>
          {openNo && <div className="mt-4 gap-8 lg:columns-2">{g.probablyNot.map(card)}</div>}
        </section>
      )}
    </div>
  );
}

function GroupTitle({ title, count, sub }: { title: string; count: number; sub?: string | undefined }) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <h2 className="m-0 font-grotesk text-[20px] font-bold">{title}</h2>
        <span className="rounded-full bg-sunk px-2 text-[13px] font-semibold text-muted">{count}</span>
      </div>
      {sub && <p className="m-0 mt-1 text-[13px] text-muted">{sub}</p>}
    </div>
  );
}

/** "Dismiss these N": every candidate in Probably not, in one request, with one Undo for them all. */
function DismissThese({ items }: { items: FoundCandidate[] }) {
  const qc = useQueryClient();
  const toast = useToast();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['found'] });
    void qc.invalidateQueries({ queryKey: queryKeys.judgeStatus });
  };
  const undo = useMutation({
    mutationFn: undoFoundMany,
    onSuccess: (r) => toast({ msg: r.skipped.length ? `Put ${r.done.length} back in Found; ${r.skipped.length} couldn’t be: ${r.skipped[0]!.message}` : `Put ${r.done.length} back in Found.` }),
    onError: (e) => toast({ msg: isApiError(e) ? e.message : 'Couldn’t undo that. Is BragDoc still running?', tone: 'bad' }),
    onSettled: refresh,
  });
  const go = useMutation({
    mutationFn: () => dismissFoundMany(items.map((c) => c.id)),
    onSuccess: (r) => {
      const n = r.done.length;
      toast({ msg: `Dismissed ${n === 1 ? 'one' : n}. They won’t come back.${r.skipped.length ? ` ${r.skipped.length} had been decided already.` : ''}`, ...(n ? { undo: () => undo.mutate(r.done) } : {}) });
    },
    onError: (e) => toast({ msg: isApiError(e) ? e.message : 'Couldn’t dismiss those. Is BragDoc still running?', tone: 'bad' }),
    onSettled: refresh,
  });
  return (
    <Btn size="sm" kind="ghost" onClick={() => go.mutate()} disabled={go.isPending || !items.length} data-testid="found-dismiss-these">
      Dismiss these {items.length}
    </Btn>
  );
}

/** Judge again: one candidate, verdict or not (after you've changed your instructions, say). */
function useJudgeAgain() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => runJudge([id]),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.judgeStatus }),
    onError: (e) => toast({ msg: `The judge couldn’t start: ${(e as Error).message}`, tone: 'bad' }),
  });
}

/** One line about when the judge runs by itself (and why it isn't now), under the title. */
function JudgeLine({ status }: { status: AiJudgeStatus }) {
  const line = scheduleLine(status.schedule!);
  if (!line) return null;
  return (
    <p className="m-0 mt-3 text-[13px] text-muted" data-testid="found-judge-line">
      <span className="mr-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-faint">The judge</span>
      {line}{' '}
      <Link to="/settings/$tab" params={{ tab: 'ai' }} className="font-semibold underline decoration-dotted underline-offset-2 hover:text-ink">
        Change
      </Link>
    </p>
  );
}

/** Judge now: ask the judge about what's waiting. While it runs, how far it's got. */
function JudgeNow({ status }: { status: NonNullable<ReturnType<typeof useJudgeStatus>['data']> }) {
  const qc = useQueryClient();
  const toast = useToast();
  const run = useMutation({
    mutationFn: () => runJudge(),
    onSuccess: (r) => {
      if (!r.queued) toast({ msg: 'Nothing is waiting for the judge.' });
      void qc.invalidateQueries({ queryKey: queryKeys.judgeStatus });
    },
    onError: (e) => toast({ msg: `The judge couldn’t start: ${(e as Error).message}`, tone: 'bad' }),
  });
  if (status.running?.total)
    return (
      <span className="text-[13px] font-semibold text-muted" data-testid="judge-progress" role="status">
        Judging {Math.min(status.running.done + 1, status.running.total)} of {status.running.total}…
      </span>
    );
  return (
    <Btn kind="paper" size="sm" onClick={() => run.mutate()} disabled={run.isPending || !status.waiting} data-testid="judge-now" title={status.waiting ? `Ask the judge about ${Math.min(status.waiting, status.maxPerRun)} waiting` : 'Everything waiting has been judged'}>
      Judge now{status.waiting ? ` (${Math.min(status.waiting, status.maxPerRun)})` : ''}
    </Btn>
  );
}
