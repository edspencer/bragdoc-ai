// AI activity (SPEC R20, R26): every run a model was asked for, from PR22's log (GET /api/ai/activity), as a receipt
// like Network activity's (adapted from NetworkTab.tsx). One line per run: when, what for, which model and where it
// went, how long, and how it ended. Never content: the log holds none. Live: each new line refreshes it.
import { Fragment, useState } from 'react';
import type { AiActivityEntry } from '../../../shared/api.ts';
import { useAiActivity } from '../../api/queries.ts';
import { Receipt } from '../../kit/index.ts';
import { countsLine, errorWords } from '../../found/judge.ts';
import { seconds } from './words.ts';

/** What started a run, when it wasn't you pressing a button (PR25: the judge's schedule). */
const TRIGGER: Record<string, string> = { arrival: 'as they arrived', schedule: 'on schedule', eval: 'an eval', cli: 'the CLI' };

const FEATURE: Record<string, string> = {
  judge: 'the judge',
  tidy: 'Tidy this up',
  draft: 'Draft with AI',
  test: 'Test connection',
  detect: 'looking for a model runner',
  pull: 'a model download',
};

const WHERE: Record<string, { label: string; className: string }> = {
  'this-computer': { label: 'THIS COMPUTER', className: 'bg-[#2fb37e]/20 text-[#1f6b48]' },
  'your-network': { label: 'YOUR NETWORK', className: 'bg-[#3b6cf6]/15 text-[#2648a8]' },
  internet: { label: 'INTERNET', className: 'bg-[#e9961a]/20 text-[#8a5200]' },
};

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const PAGE = 20;

export function AiActivity() {
  const [limit, setLimit] = useState(PAGE);
  const log = useAiActivity(limit);
  const entries = log.data?.entries ?? [];
  const total = log.data?.total ?? 0;
  return (
    <Receipt className="w-full max-w-[720px] px-4 shadow-[var(--print-shadow)] sm:px-7">
      <div data-testid="ai-activity">
        <div className="text-center text-[13px] font-bold tracking-[0.2em]">BRAGDOC · AI ACTIVITY</div>
        <div className="text-center text-[11px] opacity-60">{total > 0 ? `${total.toLocaleString()} on record · newest first` : 'newest first'}</div>
        <div className="my-3 border-t border-dashed border-current opacity-30" />
        {log.isPending && <div className="py-6 text-center opacity-60">Reading the log…</div>}
        {log.isError && (
          <div className="py-6 text-center" role="alert">
            <div className="font-bold">Couldn’t read the AI activity log.</div>
            <button type="button" className="mt-2 underline" onClick={() => void log.refetch()}>
              Try again
            </button>
          </div>
        )}
        {log.isSuccess && entries.length === 0 && (
          <div className="py-8 text-center" data-testid="ai-activity-empty">
            <div className="font-bold">Nothing has asked a model anything.</div>
            <div className="opacity-70">Each test, and each run of a feature, will be a line here.</div>
          </div>
        )}
        {entries.map((e, i) => {
          const d = new Date(e.startedAt);
          const prev = i > 0 ? new Date(entries[i - 1]!.startedAt) : null;
          const newDay = !Number.isNaN(d.getTime()) && (!prev || prev.toDateString() !== d.toDateString());
          return (
            <Fragment key={e.id}>
              {newDay && <div className="pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.14em] opacity-50 first:pt-0">{dayFmt.format(d)}</div>}
              <Line e={e} time={Number.isNaN(d.getTime()) ? '—' : timeFmt.format(d)} />
            </Fragment>
          );
        })}
        {total > entries.length && (
          <div className="pt-3 text-center">
            <button type="button" onClick={() => setLimit((n) => n + PAGE)} disabled={log.isFetching} className="rounded-md border border-dashed border-current/40 px-3 py-1 font-bold hover:bg-black/5 disabled:opacity-50">
              Show older ({(total - entries.length).toLocaleString()} more)
            </button>
          </div>
        )}
      </div>
    </Receipt>
  );
}

function Line({ e, time }: { e: AiActivityEntry; time: string }) {
  const bad = e.outcome !== 'ok';
  const w = e.where ? WHERE[e.where] : null;
  return (
    <div className={`grid grid-cols-[48px_minmax(0,1fr)_auto] gap-x-3 border-b border-dashed border-current/20 py-2 last:border-b-0 ${bad ? 'text-[#b42318]' : ''}`} data-testid="ai-activity-line" data-outcome={e.outcome}>
      <span className="opacity-60">{time}</span>
      <span className="min-w-0">
        <span className="font-bold">{FEATURE[e.feature] ?? e.feature}</span>
        {TRIGGER[e.trigger] && <span className="opacity-70"> · {TRIGGER[e.trigger]}</span>}
        {w && <span className={`ml-1.5 whitespace-nowrap rounded px-1 text-[10px] font-bold ${w.className}`}>{w.label}</span>}
        {e.model && <span className="block truncate opacity-70">{e.model}{e.connection ? ` · ${e.connection}` : ''}</span>}
        {e.feature === 'judge' && Object.keys(e.counts).length > 0 && <span className="block opacity-70" data-testid="ai-activity-counts">{countsLine(e.counts)}</span>}
        {bad && <span className="block font-sans text-[12px]">{e.outcome === 'cancelled' ? (e.error && e.error !== 'cancelled' ? errorWords(e.error) : 'cancelled') : `failed${e.error ? `: ${errorWords(e.error)}` : ''}`}</span>}
      </span>
      <span className="text-right">
        {seconds(e.ms)}
        {e.items > 1 && <span className="block opacity-60">{e.items} items</span>}
      </span>
    </div>
  );
}
