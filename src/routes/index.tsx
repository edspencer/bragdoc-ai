// The board (SPEC R5): the composer, the "N waiting in Found" strip, a Problems banner when files in the data home are
// broken, search, then your achievements grouped by week in a masonry, newest first, older weeks paged in as you
// scroll. Everything refreshes live when files change on disk (the store's changes arrive over SSE, D48).
// Adapted from the Scrapbook prototype's Board.tsx.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { AlertTriangle, ArrowRight, ImageIcon, PenLine, Search, X } from 'lucide-react';
import type { AchievementCreate } from '../../shared/schema/index.ts';
import {
  NETWORK_ERROR,
  archiveAchievement,
  createAchievement,
  getAchievement,
  getAchievements,
  isApiError,
  removeAchievement,
  restoreAchievement,
  type AchievementFilters,
  type AchievementItem,
} from '../api/client.ts';
import { queryKeys, useAchievements, useFoundCount, useProblems, useProjects, useRepos, useSources } from '../api/queries.ts';
import { AchievementCard } from '../board/AchievementCard.tsx';
import { DropTray } from '../board/DropTray.tsx';
import { EditDrawer } from '../board/EditDrawer.tsx';
import { fallbackTitle, linkEvidence, pasteKeys, useComposer } from '../board/composer.ts';
import { Btn, FilterChip, GithubMark, Masonry, Tape, WeekHeader, inputCls, useToast } from '../kit/index.ts';
import { groupByWeek, todayIso } from '../lib/dates.ts';
import { ExampleBanner, useAddExample } from '../onboarding/ExampleData.tsx';

interface BoardSearch {
  q?: string;
  archived?: 'only';
}

export const Route = createFileRoute('/')({
  component: Board,
  validateSearch: (s: Record<string, unknown>): BoardSearch => ({
    ...(typeof s.q === 'string' && s.q.trim() ? { q: s.q.slice(0, 200) } : {}),
    ...(s.archived === 'only' ? { archived: 'only' as const } : {}),
  }),
});

/** How long a just-pinned card keeps its "new" ring. */
const FRESH_MS = 6000;

function Board() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: '/' });
  const toast = useToast();
  const qc = useQueryClient();
  const notify = useCallback((msg: string, tone: 'ink' | 'bad' = 'ink') => toast({ msg, tone }), [toast]);
  const c = useComposer({ notify });
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  savingRef.current = saving;
  const [fresh, setFresh] = useState<string | null>(null);
  const [editing, setEditing] = useState<AchievementItem | null>(null);
  const [dragging, setDragging] = useState(false);
  const [q, setQ] = useState(search.q ?? '');

  const filters: AchievementFilters = useMemo(() => ({ ...(search.q ? { q: search.q } : {}), ...(search.archived ? { archived: search.archived } : {}) }), [search.q, search.archived]);
  const list = useAchievements(filters);
  const projects = useProjects();
  const repos = useRepos();
  const problems = useProblems();
  const found = useFoundCount();
  const projectList = useMemo(() => projects.data?.projects ?? [], [projects.data]);
  const repoList = useMemo(() => repos.data?.repos ?? [], [repos.data]);
  const projectMap = useMemo(() => new Map(projectList.map((p) => [p.id, p])), [projectList]);
  const repoMap = useMemo(() => new Map(repoList.map((r) => [r.id, r])), [repoList]);
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data]);
  const weeks = useMemo(() => groupByWeek(items.map((a) => ({ date: a.happenedAt, a }))), [items]);
  const total = list.data?.pages[0]?.total;
  const today = todayIso();

  // the search box: typed → the URL (?q=), debounced, so a search is a link and Back works
  useEffect(() => setQ(search.q ?? ''), [search.q]);
  useEffect(() => {
    const t = setTimeout(() => {
      const next = q.trim() || undefined;
      if (next !== search.q) void navigate({ search: (s: BoardSearch) => ({ ...s, q: next }), replace: true });
    }, 250);
    return () => clearTimeout(t);
  }, [q, search.q, navigate]);

  // paste anywhere on the page (except text into another field), and drop files anywhere
  const takePaste = c.takePaste;
  const takeDrop = c.takeDrop;
  useEffect(() => {
    const drawerOpen = () => !!document.querySelector('dialog[open]');
    const onPaste = (e: ClipboardEvent) => {
      if (!e.clipboardData || drawerOpen() || savingRef.current) return;
      const t = e.target as HTMLElement | null;
      const inField = t?.closest?.('input, textarea, [contenteditable="true"]');
      const inComposer = t?.closest?.('[data-testid="composer"]');
      // in another field (the search box), text is just text; files are still evidence
      if (inField && !inComposer && !e.clipboardData.files.length) return;
      if (takePaste(e.clipboardData)) e.preventDefault();
    };
    let depth = 0;
    const carries = (e: DragEvent) => !!e.dataTransfer && [...e.dataTransfer.types].some((t) => t === 'Files' || t === 'text/uri-list');
    const onEnter = (e: DragEvent) => {
      if (!carries(e) || drawerOpen()) return;
      depth++;
      setDragging(true);
    };
    const onLeave = () => {
      depth = Math.max(0, depth - 1);
      if (!depth) setDragging(false);
    };
    // a file dropped anywhere is never opened by the browser in place of the app (over the lightbox too); the
    // drawer takes its own drops, and while a pin is saving drops are ignored rather than lost by its reset
    const onOver = (e: DragEvent) => {
      if (carries(e)) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      depth = 0;
      setDragging(false);
      if (!e.dataTransfer || !carries(e)) return;
      if (e.defaultPrevented) return; // the drawer took it
      e.preventDefault();
      if (drawerOpen() || savingRef.current) return;
      takeDrop(e.dataTransfer);
    };
    document.addEventListener('paste', onPaste);
    document.addEventListener('dragenter', onEnter);
    document.addEventListener('dragleave', onLeave);
    document.addEventListener('dragover', onOver);
    document.addEventListener('drop', onDrop);
    return () => {
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('dragenter', onEnter);
      document.removeEventListener('dragleave', onLeave);
      document.removeEventListener('dragover', onOver);
      document.removeEventListener('drop', onDrop);
    };
  }, [takePaste, takeDrop]);

  useEffect(() => {
    if (!fresh) return;
    const t = setTimeout(() => setFresh(null), FRESH_MS);
    return () => clearTimeout(t);
  }, [fresh]);

  const refresh = useCallback(() => void qc.invalidateQueries({ queryKey: ['achievements'] }), [qc]);

  const pin = async () => {
    const [first, ...rest] = c.text.trim().split('\n');
    const evidence = [
      ...c.pending.flatMap((p) => (p.kind === 'file' ? (p.evidence ? [p.evidence] : []) : [linkEvidence(p.preview)])),
      ...c.stickies.map(({ text, from, where }) => ({ kind: 'quote' as const, quote: { text, ...(from ? { from } : {}), ...(where ? { where } : {}) } })),
    ];
    const input: AchievementCreate = {
      title: first?.trim() || fallbackTitle(c.pending) || 'Untitled',
      ...(rest.join('\n').trim() ? { body: rest.join('\n').trim() } : {}),
      happenedAt: c.date,
      ...(c.impact ? { impact: c.impact, impactSource: 'user' as const } : {}),
      projects: c.projects.filter((id) => projectMap.has(id)),
      repos: c.repos.filter((id) => repoMap.has(id)),
      evidence: evidence as AchievementCreate['evidence'],
      source: evidence.length ? 'paste' : 'manual',
    };
    setSaving(true);
    try {
      const r = await createAchievement(input);
      setFresh(r.achievement.id);
      refresh();
      if (r.created) {
        c.reset();
        toast({ msg: 'Pinned to your board.' });
      } else {
        // something in it (a PR) is already on the board, so nothing new was pinned: keep what was typed and added
        toast({ msg: `Something in this is already on your board, as “${r.achievement.title}”. Nothing new was pinned; take that out to pin the rest.`, tone: 'bad' });
      }
    } catch (e) {
      toast({ msg: isApiError(e, NETWORK_ERROR) ? "Couldn't pin it: BragDoc isn't answering. It's all still here; try again." : isApiError(e) ? `Couldn't pin it: ${e.message}` : "Couldn't pin it.", tone: 'bad' });
    } finally {
      setSaving(false);
    }
  };

  const archive = async (a: AchievementItem) => {
    const to = !a.archived;
    try {
      await archiveAchievement(a.id, to);
      setEditing(null);
      refresh();
      toast({
        msg: to ? 'Archived: it’s off the board, not gone.' : 'Back on the board.',
        undo: () =>
          void archiveAchievement(a.id, !to)
            .then(refresh)
            .catch(() => toast({ msg: "Couldn't undo that.", tone: 'bad' })),
      });
    } catch (e) {
      toast({ msg: isApiError(e) ? e.message : "Couldn't archive it.", tone: 'bad' });
    }
  };

  const remove = async (a: AchievementItem) => {
    try {
      await removeAchievement(a.id, a.etag);
      setEditing(null);
      refresh();
      toast({
        msg: 'Removed. (It’s kept in backups/removed/.)',
        undo: () =>
          void restoreAchievement(a.id)
            .then(() => (refresh(), toast({ msg: 'Put back.' })))
            .catch((e) => toast({ msg: isApiError(e) ? `Couldn't put it back: ${e.message}` : "Couldn't put it back.", tone: 'bad' })),
      });
    } catch (e) {
      toast({
        msg: isApiError(e, NETWORK_ERROR)
          ? "Couldn't remove it: BragDoc isn't answering."
          : isApiError(e, 'conflict')
            ? 'It changed on disk since you opened it, so it wasn’t removed. Have a look at the new version first.'
            : isApiError(e)
              ? e.message
              : "Couldn't remove it.",
        tone: 'bad',
      });
      if (isApiError(e, 'conflict')) refresh();
    }
  };

  // older weeks load as the bottom comes into view (and with the button, for keyboards and slow scrollers)
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = list;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver((es) => es.some((x) => x.isIntersecting) && !isFetchingNextPage && void fetchNextPage(), { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const filtering = !!(search.q || search.archived);
  const errorCount = problems.data?.filter((p) => p.severity === 'error').length ?? 0;

  return (
    <div data-testid="board-page">
      <h1 className="sr-only">Board</h1>
      <DropTray c={c} dragging={dragging} projects={projectList} repos={repoList} onSubmit={() => void pin()} saving={saving} />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {!!found && (
          <Link
            to="/found"
            data-testid="found-strip"
            className="group sb-glass flex w-fit items-center gap-3 rounded-full py-1.5 pl-1.5 pr-4 text-[13.5px] font-semibold text-ink no-underline shadow-[0_6px_18px_-10px_rgba(0,0,0,.4)]"
          >
            <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-warn px-2 font-grotesk text-[13px] font-extrabold text-[#2a1a00]">{found}</span>
            {found === 1 ? 'thing found by your sources is waiting for a yes or no' : 'things found by your sources are waiting for a yes or no'}
            <ArrowRight aria-hidden className="size-4 text-muted transition group-hover:translate-x-0.5" />
          </Link>
        )}
        {(items.length > 0 || filtering) && (
          <div className="ml-auto flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <label className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
              <span className="sr-only">Search your board</span>
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setQ('')}
                placeholder="Search titles, notes, evidence…"
                data-testid="board-search"
                className={`${inputCls} sb-glass py-2 pl-9 text-[14px]`}
              />
            </label>
            <FilterChip on={!!search.archived} onClick={() => void navigate({ search: (s: BoardSearch) => ({ ...s, archived: s.archived ? undefined : 'only' }) })} label="Archived" />
          </div>
        )}
      </div>

      <ExampleBanner />

      {problems.data && problems.data.length > 0 && (
        <div className="sb-sticky relative mt-6 px-5 py-4" role="status" data-testid="problems-banner" style={{ transform: 'rotate(-0.3deg)' }}>
          <div className="flex items-start gap-2.5">
            <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0" />
            <div className="min-w-0">
              <div className="font-grotesk text-[16px] font-extrabold">
                {problems.data.length === 1 ? 'A file in your data folder has a problem.' : `${problems.data.length} things in your data folder need a look.`}
              </div>
              <p className="m-0 mt-1 text-[13.5px]">
                {errorCount ? 'A broken file shows as it last was (if it ever loaded), and BragDoc won’t overwrite it until it’s fixed. ' : ''}
                <Link to="/settings/$tab" params={{ tab: 'data' }} className="font-semibold underline decoration-dotted underline-offset-2">
                  See them all in Settings → Data
                </Link>
              </p>
              <ul className="m-0 mt-2 list-none space-y-0.5 p-0 font-mono text-[11.5px]">
                {problems.data.slice(0, 3).map((p, i) => (
                  <li key={i} className="[overflow-wrap:anywhere]">
                    {p.file}
                    {p.line ? `:${p.line}` : ''}: {p.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {list.isPending ? (
        <p className="mt-14 text-center font-hand text-[22px] text-muted">Unpinning the cards…</p>
      ) : list.isError ? (
        <div className="mt-14 text-center" role="alert" data-testid="board-error">
          <p className="m-0 font-grotesk text-[20px] font-bold">{isApiError(list.error, NETWORK_ERROR) ? 'BragDoc isn’t answering.' : 'The board didn’t load.'}</p>
          <p className="m-0 mt-1 text-[14px] text-muted">{isApiError(list.error, NETWORK_ERROR) ? 'Is it still running? Start it again, then try once more.' : list.error.message}</p>
          <Btn className="mt-4" onClick={() => void list.refetch()}>
            Try again
          </Btn>
        </div>
      ) : weeks.length === 0 ? (
        filtering ? (
          <div className="mt-14 text-center" data-testid="board-no-results">
            <p className="m-0 font-hand text-[26px] text-muted [overflow-wrap:anywhere]">{search.q ? `Nothing on your board matches “${search.q}”.` : 'Nothing is archived.'}</p>
            <Btn className="mt-4" onClick={() => (setQ(''), void navigate({ search: {} }))}>
              <X aria-hidden className="size-4" /> {search.q ? 'Clear the search' : 'Back to the board'}
            </Btn>
          </div>
        ) : (
          <EmptyBoard onArchived={() => void navigate({ search: { archived: 'only' } })} />
        )
      ) : (
        <>
          {filtering && (
            <p className="m-0 mt-8 text-[13.5px] text-muted [overflow-wrap:anywhere]" data-testid="board-count">
              {total} {total === 1 ? 'match' : 'matches'}
              {search.q ? ` for “${search.q}”` : ''}
              {search.archived ? ' in the archive' : ''}
            </p>
          )}
          {weeks.map((w, i) => (
            <section key={w.start} className="mt-12 sm:mt-14" data-testid="week">
              <WeekHeader week={w} index={i} today={today} />
              <Masonry>
                {w.items.map(({ a }) => (
                  <AchievementCard key={a.id} a={a} projects={projectMap} repos={repoMap} fresh={a.id === fresh} onEdit={setEditing} />
                ))}
              </Masonry>
            </section>
          ))}
          <div ref={sentinel} className="mt-6 flex justify-center">
            {hasNextPage ? (
              <Btn onClick={() => void fetchNextPage()} disabled={isFetchingNextPage} data-testid="older">
                {isFetchingNextPage ? 'Loading older weeks…' : 'Older weeks'}
              </Btn>
            ) : (
              items.length > 12 && <p className="m-0 font-hand text-[20px] text-faint">That’s everything.</p>
            )}
          </div>
        </>
      )}

      {editing && (
        <EditDrawer
          key={editing.id}
          a={editing}
          projects={projectList}
          repos={repoList}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
            toast({ msg: 'Saved.' });
          }}
          onArchive={(a) => void archive(a)}
          onRemove={(a) => void remove(a)}
          onReload={async () => {
            try {
              return await getAchievement(editing.id);
            } catch {
              return null;
            }
          }}
        />
      )}
    </div>
  );
}

/**
 * A brand-new board (SPEC R10): a taped card with three ways to start, what Found is keeping an eye on (or that every
 * source is off, and where to turn one on), and the example data. Adapted from the prototype's EmptyBoard.
 */
function EmptyBoard({ onArchived }: { onArchived: () => void }) {
  // an empty board may still have an archive: say so, or archiving the last card would strand it out of sight
  const archived = useQuery({ queryKey: queryKeys.achievements({ archived: 'only', weeks: 1 }), queryFn: ({ signal }) => getAchievements({ archived: 'only', weeks: 1 }, signal), select: (r) => r.total }).data;
  const sources = useSources().data;
  const example = useAddExample();
  const watching = [sources?.github.enabled && 'GitHub', sources?.screenshots.enabled && 'your screenshots folder'].filter((x): x is string => !!x);
  const ideas = [
    { icon: ImageIcon, tone: '#3b6cf6', title: 'Paste a screenshot of praise', line: `A thank-you message, a kind email, a chart that went the right way. ${pasteKeys()} anywhere on this page.` },
    { icon: GithubMark, tone: '#1d1a17', title: 'Paste a PR link', line: 'The one you were quietly proud of. It becomes a card with owner/repo#number.' },
    { icon: PenLine, tone: '#2fb37e', title: 'Write one line', line: '“Unblocked the release on Tuesday.” Small counts. Future-you will thank you.' },
  ];
  return (
    <section className="mt-14 pb-10" data-testid="board-empty">
      <div className="relative mx-auto max-w-3xl">
        <div className="sb-card relative rotate-[-0.8deg] rounded-2xl px-6 pb-7 pt-8 sm:px-10">
          <Tape color="#ef5a3c" className="-top-2.5 left-10 w-16" />
          <Tape color="#f5a524" className="-top-2.5 right-10 w-14 rotate-6" />
          <h2 className="m-0 font-grotesk text-[32px] font-extrabold leading-tight tracking-tight sm:text-[38px]">Your board is empty. For now.</h2>
          <p className="m-0 mt-2 max-w-xl text-[15.5px] leading-relaxed text-muted">This is where the good stuff goes. Pin a few things from this week and it starts to feel like yours.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {ideas.map((i, k) => (
              <div key={i.title} className="rounded-2xl border-[2.5px] border-dashed border-line p-4" style={{ transform: `rotate(${[-1, 0.8, -0.4][k]}deg)` }}>
                <span className="flex size-9 items-center justify-center rounded-full text-white dark:ring-1 dark:ring-white/10" style={{ background: i.tone }}>
                  <i.icon aria-hidden className="size-4" />
                </span>
                <div className="mt-3 font-grotesk text-[16px] font-bold leading-snug">{i.title}</div>
                <div className="mt-1 text-[13px] leading-relaxed text-muted">{i.line}</div>
              </div>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-3 border-t-2 border-dashed border-line pt-5 text-[13.5px]">
            <span className="min-w-0 flex-1 basis-64 text-muted" data-testid="board-empty-watching">
              {!sources ? null : watching.length ? (
                <>
                  Meanwhile, Found is keeping an eye on <b className="text-ink">{watching.join(' and ')}</b>, and your coding agent can suggest things over MCP.
                </>
              ) : (
                <>
                  Every source is off, so nothing turns up in Found by itself.{' '}
                  <Link to="/settings/$tab" params={{ tab: 'sources' }} className="font-semibold text-accent underline decoration-dotted underline-offset-2" data-testid="board-empty-sources">
                    Turn one on
                  </Link>
                </>
              )}
            </span>
            <button
              type="button"
              onClick={() => example.mutate()}
              disabled={example.isPending}
              className="ml-auto rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-muted ring-2 ring-line hover:text-ink disabled:opacity-60"
              data-testid="example-add"
            >
              {example.isPending ? 'Filling it…' : 'Fill it with example data'}
            </button>
          </div>
        </div>
        {!!archived && (
          <p className="m-0 mt-5 text-center text-[13.5px] text-muted">
            {archived === 1 ? 'One thing is archived.' : `${archived} things are archived.`}{' '}
            <button type="button" onClick={onArchived} className="font-semibold text-accent underline decoration-dotted underline-offset-2" data-testid="see-archived">
              See {archived === 1 ? 'it' : 'them'}
            </button>
          </p>
        )}
        <div className="absolute -bottom-10 right-4 rotate-[-3deg] font-hand text-[22px] text-accent sm:-right-10">↑ or drag files anywhere</div>
      </div>
    </section>
  );
}
