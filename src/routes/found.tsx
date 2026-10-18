// Found (SPEC R7): what the sources spotted, waiting for a yes or no. A filter row by source, the candidates newest
// first, Keep · Merge into… · Dismiss with Undo, and the two empty states. Live: a check that finds something, an agent's
// suggestion, or a decision in another tab shows up here by itself (the `found` and `sources` events). With the judge
// on (v0.2), Judge now asks it about what's waiting; its verdicts arrive on the cards as they're written. PR25 adds the
// grouping, the schedule and Judge again. Adapted from the Scrapbook prototype's Found.tsx.
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import type { FoundSourceName } from '../../shared/api.ts';
import { runJudge } from '../api/client.ts';
import { queryKeys, useFound, useJudgeStatus, useProjects, useRepos, useSources } from '../api/queries.ts';
import { EmptyFound } from '../found/EmptyFound.tsx';
import { FoundCard, PROVENANCE_OF } from '../found/FoundCard.tsx';
import { useDecide } from '../found/decide.ts';
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
        <EmptyFound sources={sources.data} filtered={filter && counts?.all ? label(filter) : undefined} />
      ) : (
        <div className="mt-8 gap-8 lg:columns-2" data-testid="found-list">
          {items.map((c) => (
            <FoundCard key={c.id} c={c} projects={projectMap} repos={repoMap} busy={decide.isPending && decide.variables?.c.id === c.id} onDecide={(d) => decide.mutate({ c, d })} judgedEarlier={judgedEarlier} />
          ))}
        </div>
      )}
    </div>
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
