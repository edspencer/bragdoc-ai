// A project's pile, under the Gantt (SPEC R6): its name and dates, counts, company and repos, the tape colour (changed
// in place, live), and its achievements as taped cards. The cards are a simple read-only view: editing an achievement
// is the Board's job (PR7).
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Archive, ArchiveRestore, Pencil, Trash2 } from 'lucide-react';
import type { PileItem, ProjectEntry, ProjectsResponse, ProjectSummary } from '../../shared/api.ts';
import { PILE_LIMIT } from '../../shared/api.ts';
import { isApiError, updateProject } from '../api/client.ts';
import { queryKeys, useProjectSummary } from '../api/queries.ts';
import { Btn, Card, ColourPicker, Hand, ImpactBadge, Masonry, RepoTag, useToast } from '../kit/index.ts';
import { safeColour } from '../lib/colour.ts';
import { fmt } from '../lib/dates.ts';
import { durationLabel } from '../lib/gantt.ts';

const KIND_LABEL: Record<string, [string, string]> = {
  image: ['image', 'images'],
  pdf: ['PDF', 'PDFs'],
  file: ['file', 'files'],
  url: ['link', 'links'],
  github_pr: ['PR', 'PRs'],
  quote: ['quote', 'quotes'],
};
const plural = (n: number, [one, many]: [string, string]) => `${n} ${n === 1 ? one : many}`;

export function Pile({ project, today, onEdit, onDelete }: { project: ProjectEntry; today: string; onEdit: () => void; onDelete: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const summary = useProjectSummary(project.id);
  const s = summary.data;
  const [colour, setColour] = useState(safeColour(project.color));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<string | null>(null);

  // follow the project's colour when it changes elsewhere (another tab, a hand edit), unless a change is pending here
  useEffect(() => {
    if (!timer.current) setColour(safeColour(project.color));
  }, [project.color]);
  // leaving (another project, another page) with a colour still waiting to be saved: save it now
  useEffect(
    () => () => {
      if (!timer.current) return;
      clearTimeout(timer.current);
      timer.current = null;
      if (pending.current) save(pending.current);
    },
    // only on unmount (save() reads the latest project id, which a keyed Pile never changes)
    [],
  );

  function save(hex: string) {
    pending.current = null;
    // no If-Match: a colour is the whole edit, and the native picker sends a stream of them
    updateProject(project.id, { color: hex })
      .catch((e) => toast({ msg: isApiError(e) ? e.message : 'Couldn\'t save the colour.', tone: 'bad' }))
      .finally(() => void qc.invalidateQueries({ queryKey: queryKeys.projects }));
  }

  /** Paint the new colour at once everywhere on the page; save it once the native picker stops moving. */
  function pickColour(hex: string) {
    setColour(hex);
    qc.setQueryData<ProjectsResponse>(queryKeys.projects, (d) => d && { projects: d.projects.map((p) => (p.id === project.id ? { ...p, color: hex } : p)) });
    pending.current = hex;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      save(hex);
    }, 300);
  }

  async function setArchived(archived: boolean) {
    try {
      await updateProject(project.id, { status: archived ? 'archived' : 'active' }, project.etag);
      toast({
        msg: archived ? `Archived ${project.name}. It's hidden from pickers and the timeline.` : `${project.name} is back.`,
        undo: archived
          ? () =>
              void updateProject(project.id, { status: project.status })
                .then(() => qc.invalidateQueries({ queryKey: queryKeys.projects }))
                .catch(() => toast({ msg: 'Couldn\'t undo.', tone: 'bad' }))
          : undefined,
      });
      void qc.invalidateQueries({ queryKey: queryKeys.projects });
    } catch (e) {
      toast({ msg: isApiError(e, 'conflict') ? 'It changed somewhere else meanwhile; try again.' : isApiError(e) ? e.message : 'Couldn\'t change it.', tone: 'bad' });
      void qc.invalidateQueries({ queryKey: queryKeys.projects });
    }
  }

  const archived = project.status === 'archived';
  return (
    <section className="mt-12" data-testid="pile" aria-labelledby="pile-title">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <h2 id="pile-title" className="m-0 min-w-0 max-w-full font-grotesk text-[30px] font-extrabold leading-tight tracking-tight break-words sm:text-[38px]">
          <span aria-hidden className="mr-3 inline-block size-6 -translate-y-0.5 rotate-[-8deg] rounded-md align-middle ring-1 ring-black/10 dark:ring-white/20" style={{ background: colour }} />
          {project.name}
        </h2>
        <span className="font-hand text-[22px] leading-none text-muted" data-testid="pile-dates">
          {fmt.short(project.start)} {project.start.slice(0, 4) !== (project.end ?? today).slice(0, 4) ? project.start.slice(0, 4) : ''} → {project.end ? `${fmt.short(project.end)} ${project.end.slice(0, 4)}` : 'still going'} ·{' '}
          {durationLabel(project, today).replace(' · ongoing', '')}
        </span>
        {project.status !== 'active' && <span className="rounded-full bg-sunk px-2.5 py-0.5 text-[12px] font-bold uppercase tracking-wider text-faint">{project.status}</span>}
      </div>
      {project.description && <p className="m-0 mt-3 max-w-2xl whitespace-pre-line break-words text-[15px] leading-relaxed text-muted">{project.description}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-[12.5px] font-semibold">
        <span className="rounded-full bg-surface px-3 py-1 ring-1 ring-line" data-testid="pile-count">
          {s ? plural(s.achievements, ['achievement', 'achievements']) : '…'}
        </span>
        {s && s.evidence.total > 0 && (
          <span className="rounded-full bg-surface px-3 py-1 ring-1 ring-line" title={Object.entries(s.evidence.byKind).map(([k, n]) => plural(n, KIND_LABEL[k] ?? [k, k])).join(', ')}>
            {plural(s.evidence.total, ['bit of evidence', 'bits of evidence'])}
          </span>
        )}
        {s?.company && <span className="max-w-full truncate rounded-full bg-surface px-3 py-1 ring-1 ring-line">{s.company.name}</span>}
        {s?.repos.map((r) => (
          <RepoTag key={r.id} repo={r.name} />
        ))}
        <span className="ml-auto flex flex-wrap gap-2">
          <Btn size="sm" onClick={onEdit} data-testid="pile-edit">
            <Pencil aria-hidden className="size-3.5" /> Edit
          </Btn>
          <Btn size="sm" onClick={() => void setArchived(!archived)} data-testid="pile-archive">
            {archived ? <ArchiveRestore aria-hidden className="size-3.5" /> : <Archive aria-hidden className="size-3.5" />} {archived ? 'Unarchive' : 'Archive'}
          </Btn>
          <Btn size="sm" kind="danger" onClick={onDelete} data-testid="pile-delete">
            <Trash2 aria-hidden className="size-3.5" /> Delete
          </Btn>
        </span>
      </div>

      <div className="mt-5">
        <ColourPicker value={colour} onChange={pickColour} />
      </div>

      <PileCards summary={s} loading={summary.isPending} failed={summary.isError} colour={colour} name={project.name} />
    </section>
  );
}

function PileCards({ summary, loading, failed, colour, name }: { summary?: ProjectSummary; loading: boolean; failed: boolean; colour: string; name: string }) {
  if (failed)
    return (
      <p role="alert" className="mt-8 text-[14px] font-semibold text-bad">
        Couldn't load this project's achievements.
      </p>
    );
  if (loading || !summary) return <p className="mt-8 text-[14px] text-faint">Loading…</p>;
  if (summary.pile.length === 0)
    return (
      <Card tape={colour} as="div" className="mt-10 max-w-xl rotate-[-0.4deg] px-6 pb-5 pt-7" data-testid="pile-empty">
        <Hand className="text-[24px] text-accent">Nothing in this pile yet</Hand>
        <p className="m-0 mt-1 text-[14px] leading-relaxed text-muted">Achievements you tag with {name} on the board show up here.</p>
      </Card>
    );
  return (
    <>
      <Masonry className="mt-8">
        {summary.pile.map((a) => (
          <PileCard key={a.id} a={a} colour={colour} />
        ))}
      </Masonry>
      {summary.achievements > PILE_LIMIT && <p className="mt-4 text-[13px] text-faint">Showing the newest {PILE_LIMIT} of {summary.achievements}.</p>}
    </>
  );
}

function PileCard({ a, colour }: { a: PileItem; colour: string }) {
  const kinds = Object.entries(a.evidence);
  return (
    <Card tape={colour} tapeAt="left" tiltId={a.id} data-testid="pile-card">
      <div className="font-hand text-[18px] leading-none text-muted">{fmt.short(a.happenedAt)} {a.happenedAt.slice(0, 4)}</div>
      <div className="mt-1 break-words font-grotesk text-[16px] font-bold leading-snug">{a.title}</div>
      {a.summary && <p className="m-0 mt-1.5 break-words text-[13.5px] leading-relaxed text-muted line-clamp-4">{a.summary}</p>}
      {(kinds.length > 0 || a.impact) && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {kinds.map(([k, n]) => (
            <span key={k} className="rounded-md bg-sunk px-1.5 py-0.5 text-[11px] font-semibold text-muted">
              {plural(n, KIND_LABEL[k] ?? [k, k])}
            </span>
          ))}
          {a.impact !== undefined && (
            <span className="ml-auto">
              <ImpactBadge n={a.impact} />
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
