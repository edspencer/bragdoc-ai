// Folio (SPEC R9): review season in two minutes. Pick a window, narrow it by project, company and impact, untick what
// doesn't belong, and take the rest away as markdown (Export .md, Copy) or on paper (Print). Everything about the
// folio lives in the URL (?from&to&p&c&min&out&group&view), so a reload, Back or a bookmark brings the same one back.
// No AI: the folio is exactly what you picked, nothing added or rewritten (D8).
// Adapted from the Scrapbook prototype's Folio.tsx, with its AI draft removed.
import { useMemo, useRef, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Copy, Download, Printer } from 'lucide-react';
import { exportName, folioDoc, matching, readSearch, toMarkdown, writeSearch, type FolioFilter, type FolioSearch } from '../../shared/folio.ts';
import { useFolio } from '../api/queries.ts';
import { Clipping } from '../folio/Clippings.tsx';
import { Filters } from '../folio/Filters.tsx';
import { Sheet } from '../folio/Sheet.tsx';
import '../folio/folio.css';
import { Btn, FilterChip, Hand, LinkBtn, PageTitle, useToast } from '../kit/index.ts';
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

/** Copy text, with a fallback for browsers that refuse the async clipboard (an insecure origin, a denied permission). */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.className = 'fixed -left-[9999px] top-0';
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

/** Save text as a file: a download of a blob made here, so nothing goes back to the server. */
function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** How many clippings to draw before "Show all": past this, a list is for scrolling, not reading. */
const FIRST_PAGE = 300;

function Folio() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: '/folio' });
  const toast = useToast();
  const today = todayIso();
  const f = useMemo(() => readSearch(search, today), [search, today]);
  const q = useFolio(f.from, f.to);
  // while a new window loads, the last one stays up (filtered to the new dates below), so the page doesn't flash empty
  const data = q.data;
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const set = (patch: Partial<FolioFilter>) => {
    const next = { ...f, ...patch };
    if (next.from > next.to) [next.from, next.to] = [next.to, next.from];
    // forget exclusions that fall outside a new window: they'd only lengthen the URL
    if (data && (patch.from || patch.to)) next.exclude = next.exclude.filter((id) => data.items.some((a) => a.id === id && a.happenedAt >= next.from && a.happenedAt <= next.to));
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
  const nothing = !!data && list.length === 0;

  // Copy, Print, Export: beside the sheet on wide screens; on a phone also above the clippings, so they're not a
  // 300-card scroll away
  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <Btn kind="paper" onClick={() => void copy()} disabled={!picked} data-testid="folio-copy">
        <Copy aria-hidden className="size-4" /> {copied ? 'Copied' : 'Copy'}
      </Btn>
      <Btn kind="paper" onClick={() => window.print()} disabled={!picked} data-testid="folio-print">
        <Printer aria-hidden className="size-4" /> Print
      </Btn>
      <Btn kind="go" onClick={() => download(exportName(f), md)} disabled={!picked} className="ml-auto" data-testid="folio-export">
        <Download aria-hidden className="size-4" /> Export .md
      </Btn>
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
              {data ? (list.length ? `${picked} of ${list.length} picked` : 'Nothing to pick') : q.isError ? 'Folio' : 'Loading…'}
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
              <ul className="m-0 mt-4 list-none space-y-3 p-0" data-testid="folio-clippings">
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
            <FilterChip label="Printout" on={search.view !== 'md'} onClick={() => setView(undefined)} />
            <FilterChip label="Markdown" on={search.view === 'md'} onClick={() => setView('md')} />
          </div>

          {doc &&
            (search.view === 'md' ? (
              <pre className="sb-card mt-4 max-h-[75vh] overflow-auto whitespace-pre-wrap break-words rounded-2xl p-5 font-mono text-[12.5px] leading-relaxed text-ink" data-testid="folio-markdown">
                {md}
              </pre>
            ) : (
              <Sheet doc={doc} empty={nothing} />
            ))}
          <p className="mt-5 text-[12.5px] text-muted">Exactly what you picked, nothing added or rewritten. Pull requests and links stay links; files are named, never located, so the document is safe to send on.</p>
        </div>
      </div>
    </div>
  );
}
