// Folio (SPEC R9): review season in two minutes. Pick a window, narrow it by project, company and impact, untick what
// doesn't belong, and take the rest away as markdown (Export .md, Copy) or on paper (Print). Everything about the
// folio lives in the URL (?from&to&p&c&min&out&group&view), so a reload, Back or a bookmark brings the same one back.
// The folio is exactly what you picked, nothing added or rewritten (D8). With AI and its Draft feature on (v0.2, SPEC
// R24, D80–D81), Draft with AI beside Copy and Export writes a suggested review draft from the same picks, in a Draft
// panel beside the printout and the markdown; with Draft off there's no trace of it (SPEC R26).
// Adapted from the Scrapbook prototype's Folio.tsx (its AI draft rebuilt for v0.2).
import { useEffect, useMemo, useRef, useState } from 'react';
import { createFileRoute, Link, useBlocker, useNavigate } from '@tanstack/react-router';
import { Copy, Download, Printer, Sparkles } from 'lucide-react';
import { exportName, folioDoc, matching, pruneFilter, readSearch, toMarkdown, writeSearch, type FolioFilter, type FolioSearch } from '../../shared/folio.ts';
import { useAi, useFolio } from '../api/queries.ts';
import { Clipping } from '../folio/Clippings.tsx';
import { useDraft, useRecheck } from '../folio/draft.ts';
import { DraftPanel } from '../folio/DraftPanel.tsx';
import { Filters } from '../folio/Filters.tsx';
import { Sheet } from '../folio/Sheet.tsx';
import '../folio/folio.css';
import { copyText, download } from '../folio/take.ts';
import { Btn, FilterChip, Hand, LinkBtn, PageTitle, TextInput, useToast } from '../kit/index.ts';
import { fmt, todayIso } from '../lib/dates.ts';

type Search = FolioSearch & { view?: 'md' };

const KEYS = ['from', 'to', 'p', 'c', 'min', 'out', 'group'] as const;

export const Route = createFileRoute('/folio')({
  component: Folio,
  // only the keys Folio knows, as strings or numbers; readSearch() makes sense of them
  validateSearch: (s: Record<string, unknown>): Search => ({
    ...Object.fromEntries(KEYS.filter((k) => typeof s[k] === 'string' || typeof s[k] === 'number').map((k) => [k, s[k] as string | number])),
    ...(s.view === 'md' ? { view: 'md' as const } : {}),
  }),
});

/** How many clippings to draw before "Show all": past this, a list is for scrolling, not reading. */
const FIRST_PAGE = 300;

function Folio() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: '/folio' });
  const toast = useToast();
  const today = todayIso();
  const asked = useMemo(() => readSearch(search, today), [search, today]);
  const q = useFolio(asked.from, asked.to);
  // while a new window loads, the last one stays on screen, faded, so the page doesn't flash empty; but nothing is
  // claimed about it (no empty state) and nothing can be taken from it (the actions wait)
  const data = q.data;
  const loading = q.isPlaceholderData || (!data && q.isPending);
  // what the filter means given what exists now: a project or company deleted mid-session drops out of it
  const f = useMemo(() => (data ? pruneFilter(asked, data) : asked), [asked, data]);
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(copiedTimer.current), []);
  // a new window or filter starts with the first page of clippings again
  const scope = `${f.from}|${f.to}|${f.projects.join()}|${f.company ?? ''}|${f.minImpact}`;
  useEffect(() => setShowAll(false), [scope]);

  const set = (patch: Partial<FolioFilter>) => {
    const next = { ...f, ...patch };
    if (next.from > next.to) [next.from, next.to] = [next.to, next.from];
    // forget exclusions that fall outside a new window: they'd only lengthen the URL
    if (data && !q.isPlaceholderData && (patch.from || patch.to)) next.exclude = next.exclude.filter((id) => data.items.some((a) => a.id === id && a.happenedAt >= next.from && a.happenedAt <= next.to));
    void navigate({ search: { ...writeSearch(next), ...(search.view ? { view: search.view } : {}) }, replace: true, resetScroll: false });
  };
  const setView = (view?: 'md') => void navigate({ search: (s: Search) => ({ ...s, view }), replace: true, resetScroll: false });

  const inWindow = useMemo(() => (data ? data.items.filter((a) => a.happenedAt >= f.from && a.happenedAt <= f.to) : []), [data, f.from, f.to]);
  const list = useMemo(() => (data ? matching(data, f) : []), [data, f]);
  const out = useMemo(() => new Set(f.exclude), [f.exclude]);
  const picked = list.filter((a) => !out.has(a.id)).length;
  const doc = useMemo(() => (data ? folioDoc(data, f) : null), [data, f]);
  const md = useMemo(() => (doc ? toMarkdown(doc) : ''), [doc]);
  const projects = useMemo(() => new Map((data?.projects ?? []).map((p) => [p.id, p])), [data]);
  const filtered = f.projects.length > 0 || !!f.company || f.minImpact > 0;

  // Draft with AI: only while AI and Draft are both on (SPEC R26); on but not ready, disabled with the reason
  const ai = useAi().data;
  const draftOn = !!ai?.enabled && !!ai.features.draft.enabled;
  const ready = draftOn && !!ai?.readiness.draft.ready;
  const notReady = draftOn && !ready ? (ai?.readiness.draft.message ?? 'Draft isn’t ready.') : null;
  const { draft, start, cancel, edit, taken, discard, setCheck } = useDraft();
  useRecheck(draft, setCheck);
  const [purpose, setPurpose] = useState('');
  const [showDraft, setShowDraft] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const sameFolio = (a: FolioFilter, b: FolioFilter) => JSON.stringify(writeSearch(a)) === JSON.stringify(writeSearch(b));
  const changed = !!draft && !sameFolio(draft.folio, f);
  // a draft you haven't copied or exported took minutes to write: leaving (or reloading) asks first. Changing the
  // folio's own filters or view is a navigation too (they live in the URL), and keeps the draft: that never asks.
  const unsaved = !!draft?.text && !draft.taken;
  useBlocker({ shouldBlockFn: ({ next }) => unsaved && next.pathname !== '/folio' && !window.confirm('Leave Folio? Your draft isn’t saved anywhere: copy or export it first to keep it.'), enableBeforeUnload: () => unsaved });
  const doDraft = () => {
    if (unsaved && !window.confirm(`Draft again? This draft${draft?.edited ? ', with your edits,' : ''} will be replaced, and it isn’t saved anywhere.`)) return;
    void start(f, purpose);
    setShowDraft(true);
    requestAnimationFrame(() => panel.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  };
  const discardDraft = () => {
    if (draft?.edited && !draft.taken && !window.confirm('Discard your edited draft? It isn’t saved anywhere.')) return;
    discard();
    setShowDraft(false);
  };
  /** A [n] in the draft: scroll to its clipping and flash it. */
  const cite = (id: string) => {
    if (!list.some((a) => a.id === id)) return toast({ msg: 'That achievement isn’t in this folio’s list any more (the window or the filters changed).' });
    if (!shown.some((a) => a.id === id)) setShowAll(true);
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-clip-id="${CSS.escape(id)}"]`);
      if (!el) return;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.classList.remove('folio-clip-flash');
      void el.offsetWidth; // restart the animation
      el.classList.add('folio-clip-flash');
    });
  };

  const toggle = (id: string) => set({ exclude: out.has(id) ? f.exclude.filter((x) => x !== id) : [...f.exclude, id] });
  const tickAll = () => set({ exclude: f.exclude.filter((id) => !list.some((a) => a.id === id)) });
  const untickAll = () => set({ exclude: [...new Set([...f.exclude, ...list.map((a) => a.id)])] });

  async function copy() {
    if (await copyText(md)) {
      setCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 1500);
      toast({ msg: `Copied ${picked} ${picked === 1 ? 'achievement' : 'achievements'} as markdown.` });
    } else toast({ msg: 'Your browser wouldn’t let BragDoc copy. Use Export .md instead.', tone: 'bad' });
  }

  const shown = showAll ? list : list.slice(0, FIRST_PAGE);
  const nothing = !!data && !loading && list.length === 0;
  const canTake = picked > 0 && !loading;

  // Copy, Print, Export: beside the sheet on wide screens; on a phone also above the clippings, so they're not a
  // 300-card scroll away
  const actions = (
    <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      <Btn kind="paper" onClick={() => void copy()} disabled={!canTake} data-testid="folio-copy">
        <Copy aria-hidden className="size-4" /> {copied ? 'Copied' : 'Copy'}
      </Btn>
      <Btn kind="paper" onClick={() => window.print()} disabled={!canTake} data-testid="folio-print">
        <Printer aria-hidden className="size-4" /> Print
      </Btn>
      <Btn kind="go" onClick={() => download(exportName(f), md)} disabled={!canTake} className="ml-auto" data-testid="folio-export">
        <Download aria-hidden className="size-4" /> Export .md
      </Btn>
    </div>
    {draftOn && (
      <div className="flex flex-wrap items-center gap-2" data-testid="folio-drafter">
        <TextInput
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          maxLength={300}
          placeholder="What’s this for? e.g. my self-review"
          aria-label="What’s this draft for?"
          className="min-w-0 flex-1 basis-56 py-2 text-[14px]"
          data-testid="folio-draft-purpose"
        />
        <Btn
          kind="accent"
          onClick={doDraft}
          disabled={!canTake || !ready || draft?.phase === 'waiting' || draft?.phase === 'streaming'}
          title={!canTake ? 'Pick something first: there’s nothing to draft from.' : (notReady ?? undefined)}
          data-testid="folio-draft-button"
        >
          <Sparkles aria-hidden className="size-4" /> {draft ? 'Draft again' : 'Draft with AI'}
        </Btn>
        {notReady ? (
          <p className="m-0 w-full text-[12.5px] text-warn" role="status" data-testid="folio-draft-why">
            Draft with AI isn’t ready: {notReady}{' '}
            <Link to="/settings/$tab" params={{ tab: 'ai' }} className="font-semibold underline">
              Settings → AI
            </Link>
          </p>
        ) : !canTake && !loading ? (
          <p className="m-0 w-full text-[12.5px] text-muted" data-testid="folio-draft-why">
            Nothing is picked, so there’s nothing to draft from.
          </p>
        ) : null}
      </div>
    )}
    </div>
  );

  return (
    <div data-testid="folio-page">
      <PageTitle sub="Pick a stretch of time, choose the best bits, and take away a markdown document you can paste into a self-review.">Folio</PageTitle>

      <Filters f={f} set={set} data={data} inWindow={inWindow} today={today} />

      <div className="mt-6 lg:hidden">{actions}</div>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-grotesk text-[22px] font-extrabold" data-testid="folio-count">
              {loading ? 'Loading…' : data ? (list.length ? `${picked} of ${list.length} picked` : 'Nothing to pick') : 'Folio'}
            </span>
            {list.length > 0 && <Hand className="text-[19px] text-muted">untick anything that doesn’t belong</Hand>}
            {list.length > 1 && (
              <span className="ml-auto flex gap-1">
                <Btn kind="ghost" size="sm" onClick={tickAll} disabled={picked === list.length}>
                  Tick all
                </Btn>
                <Btn kind="ghost" size="sm" onClick={untickAll} disabled={picked === 0}>
                  Untick all
                </Btn>
              </span>
            )}
          </div>

          {q.isError && !data ? (
            <div className="mt-6 flex flex-wrap items-center gap-3 text-[14px] text-bad" role="alert" data-testid="folio-error">
              <span>Couldn’t load this window: {q.error.message}</span>
              <Btn kind="paper" size="sm" onClick={() => void q.refetch()}>
                Try again
              </Btn>
            </div>
          ) : nothing ? (
            <div className="mt-8" data-testid="folio-empty">
              <Hand className="text-[28px] text-muted">
                {inWindow.length === 0
                  ? `Nothing between ${fmt.long(f.from)} and ${fmt.long(f.to)}.`
                  : `${inWindow.length} in this window, but none ${inWindow.length === 1 ? 'matches' : 'match'} these filters.`}
              </Hand>
              <div className="mt-4 flex flex-wrap gap-2">
                {inWindow.length > 0 && filtered && (
                  <Btn kind="paper" onClick={() => set({ projects: [], company: undefined, minImpact: 0 })}>
                    Clear the filters
                  </Btn>
                )}
                {inWindow.length === 0 && (
                  <LinkBtn kind="paper" to="/">
                    Add something on the board
                  </LinkBtn>
                )}
              </div>
            </div>
          ) : (
            <>
              <ul className={`m-0 mt-4 list-none space-y-3 p-0 transition-opacity ${loading ? 'opacity-50' : ''}`} aria-busy={loading} data-testid="folio-clippings">
                {shown.map((a) => (
                  <Clipping key={a.id} a={a} on={!out.has(a.id)} projects={projects} toggle={toggle} />
                ))}
              </ul>
              {shown.length < list.length && (
                <Btn kind="paper" className="mt-4" onClick={() => setShowAll(true)}>
                  Show all {list.length}
                </Btn>
              )}
            </>
          )}
        </div>

        <div className="lg:sticky lg:top-6">
          <div className="hidden lg:block">{actions}</div>
          <div className="mt-4 flex gap-2" role="group" aria-label="Preview as">
            <FilterChip label="Printout" on={!(draft && showDraft) && search.view !== 'md'} onClick={() => (setShowDraft(false), setView(undefined))} />
            <FilterChip label="Markdown" on={!(draft && showDraft) && search.view === 'md'} onClick={() => (setShowDraft(false), setView('md'))} />
            {draft && <FilterChip label="Draft" on={showDraft} onClick={() => setShowDraft(true)} />}
          </div>

          <div ref={panel} className="scroll-mt-4">
            {draft && showDraft && (
              <DraftPanel
                d={draft}
                canDraft={ready && canTake}
                why={!draftOn ? 'AI is off now, so it can’t draft again.' : notReady}
                changed={changed}
                onEdit={edit}
                onCancel={cancel}
                onAgain={doDraft}
                onDiscard={discardDraft}
                onTaken={taken}
                onCite={cite}
              />
            )}
          </div>

          {doc && search.view === 'md' && !(draft && showDraft) && (
            <pre className="sb-card mt-4 max-h-[75vh] overflow-auto whitespace-pre-wrap break-words rounded-2xl p-5 font-mono text-[12.5px] leading-relaxed text-ink print:hidden" data-testid="folio-markdown">
              {md}
            </pre>
          )}
          {/* the printout is what Print prints, so it's there in the Markdown view too, for paper only */}
          {doc && (
            <div className={`transition-opacity ${loading ? 'opacity-50' : ''} ${search.view === 'md' || (draft && showDraft) ? 'hidden print:block' : ''}`}>
              <Sheet doc={doc} empty={nothing} />
            </div>
          )}
          <p className="mt-5 text-[12.5px] text-muted" data-testid="folio-promise">
            {draftOn ? 'The plain export (Copy, Print, Export .md) is exactly what you picked, nothing added or rewritten.' : 'Exactly what you picked, nothing added or rewritten.'} Pull requests and links stay links; files are named, never located, so the document is safe to send on.
          </p>
        </div>
      </div>
    </div>
  );
}
