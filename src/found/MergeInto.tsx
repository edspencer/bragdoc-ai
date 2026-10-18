// "Merge into…": pick an achievement already on the board to attach a candidate's evidence to. Search runs over the
// board's index (GET /api/achievements?q=); with nothing typed it offers the most recent ones. Adapted from the
// Scrapbook prototype's MergeButton (Found.tsx), with a real search and its no-results state.
import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { getAchievements, type AchievementItem } from '../api/client.ts';
import { Btn, Kicker } from '../kit/index.ts';
import { fmt } from '../lib/dates.ts';

const SHOWN = 6;

export function MergeInto({ onPick, disabled }: { onPick: (a: AchievementItem) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const listId = useId();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 200);
    return () => clearTimeout(t);
  }, [q]);

  // close on Escape (focus back on the button) and on a click outside
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  const results = useQuery({
    queryKey: ['achievements', { q: debounced, weeks: debounced ? 104 : 8, mergePicker: true }],
    queryFn: ({ signal }) => getAchievements(debounced ? { q: debounced, weeks: 104 } : { weeks: 8 }, signal),
    enabled: open,
    select: (r) => r.items.slice(0, SHOWN),
    placeholderData: (prev) => prev,
  });
  const hits = results.data ?? [];

  return (
    <>
      <Btn ref={button} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={open ? listId : undefined} disabled={disabled} data-testid="found-merge">
        Merge into…
      </Btn>
      {open && (
        <div ref={box} id={listId} className="absolute bottom-12 left-0 z-20 w-[min(22rem,calc(100vw-4rem))] rounded-2xl bg-surface p-2 shadow-2xl ring-1 ring-line sm:left-20" data-testid="merge-picker">
          <label className="flex items-center gap-2 rounded-xl bg-sunk px-3 py-2 ring-2 ring-transparent focus-within:ring-accent/60">
            <Search className="size-4 text-faint" aria-hidden />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search your board…"
              aria-label="Search your board"
              className="w-full bg-transparent text-[13.5px] outline-none placeholder:text-faint focus-visible:outline-none"
              data-testid="merge-search"
            />
          </label>
          {!debounced && hits.length > 0 && <Kicker className="px-2.5 pb-1 pt-2.5">Recent</Kicker>}
          {results.isError && <div className="p-3 text-[13px] text-bad">Couldn’t search your board.</div>}
          {results.isSuccess && hits.length === 0 && (
            <div className="p-3 text-[13px] text-muted" data-testid="merge-empty">
              {debounced ? 'Nothing on your board matches that.' : 'Your board is empty, so there’s nothing to merge into. Keep it instead.'}
            </div>
          )}
          {results.isPending && <div className="p-3 text-[13px] text-faint">Looking…</div>}
          <ul className="m-0 list-none p-0">
            {hits.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onPick(a);
                  }}
                  className="block w-full rounded-xl p-2.5 text-left hover:bg-sunk focus-visible:bg-sunk"
                  data-testid="merge-option"
                >
                  <div className="text-[13.5px] font-semibold">{a.title}</div>
                  <div className="font-hand text-[16px] text-muted">
                    {fmt.short(a.happenedAt)} · {a.evidence.length} evidence
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
