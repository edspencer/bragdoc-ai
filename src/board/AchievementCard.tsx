// One achievement on the board: tape in its first project's colour, the first picture as a photo print, the date in
// handwriting, impact, title, summary (or the start of the body), the rest of the evidence, then project pills, repo
// tags and where it came from. Adapted from the Scrapbook prototype's Board.tsx Card.
import { AlertTriangle, Archive, Pencil } from 'lucide-react';
import type { ProjectEntry as Project, RepoEntry as Repo } from '../../shared/api.ts';
import type { AchievementItem } from '../api/client.ts';
import { Card, EvidenceBit, Hand, ImpactBadge, ProjectPill, ProvenanceBadge, RepoTag, type Provenance } from '../kit/index.ts';
import { fmt } from '../lib/dates.ts';
import { toView } from './evidence.ts';

/** The tape when it has no project. */
export const NO_PROJECT_TAPE = '#b9ad99';

/** The provenance badge an achievement's `source` earns: nothing for what you added yourself. */
export function provenanceOf(source: AchievementItem['source']): Provenance {
  switch (source) {
    case 'github-pr':
      return 'github';
    case 'screenshot':
      return 'screenshot';
    case 'mcp':
      return 'mcp';
    case 'import':
      return 'import';
    default:
      return 'manual';
  }
}

export function AchievementCard({
  a,
  projects,
  repos,
  fresh,
  onEdit,
}: {
  a: AchievementItem;
  projects: ReadonlyMap<string, Project>;
  repos: ReadonlyMap<string, Repo>;
  fresh?: boolean;
  onEdit: (a: AchievementItem) => void;
}) {
  const first = a.projects.map((id) => projects.get(id)).find(Boolean);
  const imgIndex = a.evidence.findIndex((e) => e.kind === 'image' && e.blob);
  const rest = a.evidence.filter((_, i) => i !== imgIndex);
  const blurb = a.summary || a.body.trim();
  const editable = !a.broken && !a.readOnly;
  return (
    <Card tape={first?.color ?? NO_PROJECT_TAPE} fresh={fresh} data-testid="achievement-card" data-id={a.id} aria-labelledby={`t-${a.id}`} className="group">
      {imgIndex >= 0 && (
        <div className="mb-4 mt-1">
          <EvidenceBit e={toView(a.evidence[imgIndex], a.files)} id={a.id} />
        </div>
      )}
      <div className="flex items-center gap-2">
        <Hand className="text-[19px] leading-none text-muted">
          {fmt.dowShort(a.happenedAt)} {fmt.short(a.happenedAt)}
          {a.endedAt && a.endedAt !== a.happenedAt && ` – ${fmt.short(a.endedAt)}`}
        </Hand>
        {fresh && <span className="rounded-full bg-accent px-2 py-0.5 text-[10.5px] font-bold text-accent-ink">new</span>}
        {a.archived && (
          <span className="inline-flex items-center gap-1 rounded-full bg-sunk px-2 py-0.5 text-[10.5px] font-bold text-muted">
            <Archive aria-hidden className="size-3" /> archived
          </span>
        )}
        <span className="ml-auto flex items-center gap-1.5">
          {a.impact !== undefined && <ImpactBadge n={a.impact} />}
          <button
            type="button"
            onClick={() => onEdit(a)}
            aria-label={`Edit “${a.title}”`}
            title={editable ? 'Edit' : 'This file has a problem: fix it by hand first'}
            data-testid="edit"
            className="rounded-full p-1 text-faint transition hover:bg-sunk hover:text-ink focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
          >
            <Pencil aria-hidden className="size-3.5" />
          </button>
        </span>
      </div>
      <h3 id={`t-${a.id}`} className="m-0 mt-1.5 font-grotesk text-[19px] font-bold leading-[1.2] tracking-[-0.01em] [overflow-wrap:anywhere]">
        <button type="button" onClick={() => onEdit(a)} className="text-left [overflow-wrap:anywhere] hover:underline hover:decoration-line hover:decoration-2 hover:underline-offset-4">
          {a.title}
        </button>
      </h3>
      {blurb && <p className="m-0 mt-1.5 line-clamp-4 whitespace-pre-line text-[13.5px] leading-relaxed text-muted [overflow-wrap:anywhere]">{blurb}</p>}
      {(a.broken || a.readOnly) && (
        <p className="m-0 mt-2 flex items-start gap-1.5 text-[12px] font-semibold text-warn" data-testid="card-problem">
          <AlertTriangle aria-hidden className="mt-px size-3.5 shrink-0" />
          {a.readOnly ? 'Written by a newer BragDoc: shown, but not changed here.' : 'Its file has a problem, so this is how it last was. Fix the file to edit it.'}
        </p>
      )}
      {rest.length > 0 && (
        <div className="mt-3.5 space-y-2.5">
          {rest.map((e, i) => (
            <EvidenceBit key={e.id ?? i} e={toView(e, a.files)} id={a.id + i} />
          ))}
        </div>
      )}
      {(a.projects.length > 0 || a.repos.length > 0 || provenanceOf(a.source) !== 'manual') && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {a.projects.map((id) => {
            const p = projects.get(id);
            return <ProjectPill key={id} name={p?.name ?? 'Missing project'} color={p?.color ?? '#5f6b7a'} />;
          })}
          {a.repos.map((id) => (
            <RepoTag key={id} repo={repos.get(id)?.name ?? 'missing repo'} />
          ))}
          <ProvenanceBadge source={provenanceOf(a.source)} agent={a.sourceAgent} />
        </div>
      )}
    </Card>
  );
}
