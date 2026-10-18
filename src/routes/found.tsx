// Found (SPEC R7): what the sources spotted, waiting for a yes or no. A filter row by source, the candidates newest
// first, Keep · Merge into… · Dismiss with Undo, and the two empty states. Live: a check that finds something, an agent's
// suggestion, or a decision in another tab shows up here by itself (the `found` and `sources` events).
// Adapted from the Scrapbook prototype's Found.tsx.
import { useMemo, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import type { FoundSourceName } from '../../shared/api.ts';
import { useFound, useProjects, useRepos, useSources } from '../api/queries.ts';
import { EmptyFound } from '../found/EmptyFound.tsx';
import { FoundCard, PROVENANCE_OF } from '../found/FoundCard.tsx';
import { useDecide } from '../found/decide.ts';
import { FilterChip, PageTitle, PROVENANCE } from '../kit/index.ts';
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
          <Link to="/settings/$tab" params={{ tab: 'sources' }} className="text-[13px] font-semibold text-muted underline decoration-dotted underline-offset-2 hover:text-ink">
            Manage sources
          </Link>
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
            <FoundCard key={c.id} c={c} projects={projectMap} repos={repoMap} busy={decide.isPending && decide.variables?.c.id === c.id} onDecide={(d) => decide.mutate({ c, d })} />
          ))}
        </div>
      )}
    </div>
  );
}
