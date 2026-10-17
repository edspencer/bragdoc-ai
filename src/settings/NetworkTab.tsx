// Settings → Network activity (SPEC R4, R13): the proof of "nothing leaves your machine". The egress module's log as a
// till receipt, newest first and a page at a time, live as requests happen; the allow-list as stamps; and a button
// that asks for a forbidden request so you can watch it be refused. Adapted from the prototype's Network (Settings.tsx):
// its receipt and stamps, without its Slack and AI lines.
import { Fragment, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import type { GuardCheckResponse, NetworkLogEntry } from '../../shared/api.ts';
import { checkEgressGuard } from '../api/client.ts';
import { useMeta, useNetworkLog } from '../api/queries.ts';
import { Btn, Kicker, Receipt, SectionTitle, Stamp, Sticky, formatBytes } from '../kit/index.ts';
import { LoadError, Loading } from './common.tsx';

/** The loopback names egress always allows (server/egress.ts): shown as one stamp, "this computer". */
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Purposes people should be able to read without knowing the code. Anything else is shown as it is. */
const PURPOSE: Record<string, string> = {
  'settings.guard-check': 'Guard check from Settings: refused on purpose',
};

const hostname = (host: string) => (host.startsWith('[') ? host.slice(0, host.indexOf(']') + 1) : host.replace(/:\d+$/, ''));
const isLocal = (e: NetworkLogEntry) => e.via === 'fetch' && LOOPBACK.has(hostname(e.host));

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const safeDate = (s: string) => {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

export function NetworkTab() {
  return (
    <div className="space-y-6" data-testid="settings-network">
      <SectionTitle sub="Every request BragDoc makes to another computer, as it happens. Anything not on the allow-list is refused in code before it’s sent, and a test fails the build if any code tries to go around that.">
        Network activity
      </SectionTitle>
      <AllowList />
      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_280px]">
        <NetworkReceipt />
        <WhereItGoes />
      </div>
    </div>
  );
}

function AllowList() {
  const meta = useMeta();
  if (meta.isPending) return <Loading what="the allow-list" />;
  if (meta.isError) return <LoadError error={meta.error} what="the allow-list" retry={() => void meta.refetch()} testId="allowlist-error" />;
  const remote = meta.data.egressAllowList.filter((h) => !LOOPBACK.has(h));
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2" data-testid="allowlist">
      <Kicker className="mr-1">Allowed right now</Kicker>
      <Stamp color="var(--muted)" rotate={-2}>
        <span title={[...LOOPBACK].join(', ')}>this computer</span>
      </Stamp>
      {remote.map((h, i) => (
        <Stamp key={h} color="var(--good)" rotate={[2, -1.5, 1][i % 3]}>
          <span className="font-mono normal-case">{h}</span>
        </Stamp>
      ))}
      {remote.length === 0 && <span className="text-[13px] text-muted">Nothing else. Connecting GitHub with a token adds api.github.com.</span>}
    </div>
  );
}

function NetworkReceipt() {
  const log = useNetworkLog();
  const entries = log.data?.pages.flatMap((p) => p.entries) ?? [];
  const total = log.data?.pages.at(-1)?.total ?? 0;
  return (
    <Receipt className="w-full max-w-[720px] px-4 shadow-[var(--print-shadow)] sm:rotate-[0.3deg] sm:px-7">
      <div data-testid="network-receipt">
        <div className="text-center text-[13px] font-bold tracking-[0.2em]">BRAGDOC · OUTBOUND</div>
        <div className="text-center text-[11px] opacity-60">{log.isSuccess && total > 0 ? `${total.toLocaleString()} on record · newest first` : 'newest first'}</div>
        <Rule />
        {log.isPending && <div className="py-6 text-center opacity-60">Reading the log…</div>}
        {log.isError && (
          <div className="py-6 text-center" role="alert" data-testid="network-error">
            <div className="font-bold">Couldn’t read the network log.</div>
            <div className="opacity-70">{log.error instanceof Error ? log.error.message : String(log.error)}</div>
            <button type="button" className="mt-2 underline" onClick={() => void log.refetch()}>
              Try again
            </button>
          </div>
        )}
        {log.isSuccess && entries.length === 0 && (
          <div className="py-8 text-center" data-testid="network-empty">
            <div className="font-bold">No requests on record.</div>
            <div className="opacity-70">Nothing has left this computer.</div>
          </div>
        )}
        {entries.map((e, i) => {
          const d = safeDate(e.at);
          const prev = i > 0 ? safeDate(entries[i - 1]!.at) : null;
          const newDay = d && (!prev || prev.toDateString() !== d.toDateString());
          return (
            <Fragment key={`${e.at}-${i}`}>
              {newDay && <div className="pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.14em] opacity-50 first:pt-0">{dayFmt.format(d)}</div>}
              <Line e={e} time={d ? timeFmt.format(d) : '—'} />
            </Fragment>
          );
        })}
        {log.hasNextPage && (
          <div className="pt-3 text-center">
            <button
              type="button"
              data-testid="network-more"
              disabled={log.isFetchingNextPage}
              onClick={() => void log.fetchNextPage()}
              className="rounded-md border border-dashed border-current/40 px-3 py-1 font-bold hover:bg-black/5 disabled:opacity-50"
            >
              {log.isFetchingNextPage ? 'Loading…' : `Show older (${(total - entries.length).toLocaleString()} more)`}
            </button>
          </div>
        )}
        <Rule />
        <div className="flex justify-between font-bold" data-testid="network-makers">
          <span>TO BRAGDOC’S MAKERS</span>
          <span>0 B</span>
        </div>
        <div className="flex justify-between opacity-70">
          <span>Telemetry · update checks</span>
          <span>none</span>
        </div>
      </div>
    </Receipt>
  );
}

const Rule = () => <div className="my-3 border-t border-dashed border-current opacity-30" />;

function Line({ e, time }: { e: NetworkLogEntry; time: string }) {
  const refused = e.outcome === 'denied';
  const failed = e.outcome === 'error';
  // the receipt is light paper in both themes, so its colours are fixed ones that read on it
  const tone = refused || failed ? 'text-[#b42318]' : '';
  return (
    <div
      className={`grid grid-cols-[48px_minmax(0,1fr)_auto] gap-x-3 border-b border-dashed border-current/20 py-2 last:border-b-0 ${tone}`}
      data-testid="network-line"
      data-outcome={e.outcome}
    >
      <span className="opacity-60">{time}</span>
      <span className="min-w-0">
        <span className="font-bold">{e.method}</span> <span className="break-all">{e.host}</span>
        {isLocal(e) && <Tag className="bg-[#2fb37e]/20 text-[#1f6b48]">LOCAL</Tag>}
        {e.via === 'gh' && <Tag className="bg-black/10">VIA GH CLI</Tag>}
        {refused && <Tag className="bg-[#b42318]/15 text-[#b42318]">REFUSED · NOT SENT</Tag>}
        {failed && <Tag className="bg-[#b42318]/15 text-[#b42318]">FAILED</Tag>}
        <span className="block truncate opacity-60" title={e.path}>
          {e.path}
        </span>
        <span className="block font-sans text-[12px] opacity-80">{PURPOSE[e.purpose] ?? e.purpose}</span>
        {e.error && <span className="block break-words font-sans text-[12px]">{e.error}</span>}
      </span>
      <span className="text-right">
        {e.status ?? '—'}
        <span className="block opacity-60">{e.bytes == null ? '' : formatBytes(e.bytes)}</span>
      </span>
    </div>
  );
}

const Tag = ({ children, className }: { children: string; className: string }) => <span className={`ml-1.5 whitespace-nowrap rounded px-1 text-[10px] font-bold ${className}`}>{children}</span>;

function WhereItGoes() {
  const check = useMutation({ mutationFn: checkEgressGuard });
  const r: GuardCheckResponse | undefined = check.data;
  return (
    <div className="space-y-5">
      <Sticky rotate={1.2} className="p-4 text-[13px] leading-relaxed">
        <div className="font-grotesk text-[15px] font-extrabold">Where your data goes</div>
        <ul className="m-0 mt-2 list-disc space-y-1.5 pl-4">
          <li>Nothing goes to BragDoc’s makers. There’s no telemetry, no update check, and no server of ours to send anything to.</li>
          <li>
            GitHub through the <span className="font-mono text-[12px]">gh</span> CLI: gh makes those requests itself. BragDoc logs each time it runs gh, marked “via gh CLI”, but can’t see
            inside them.
          </li>
          <li>There’s no AI in this version, so no model is ever contacted.</li>
        </ul>
      </Sticky>
      <div className="rounded-2xl bg-surface/70 p-4 text-[13px] leading-relaxed ring-1 ring-line" data-testid="guard-check">
        <div className="font-bold">Don’t take our word for it</div>
        <div className="mt-1 text-muted">Ask BragDoc to send a request somewhere it isn’t allowed to. It should refuse, and the refusal shows up on the receipt.</div>
        <Btn size="sm" className="mt-3" onClick={() => check.mutate()} disabled={check.isPending} data-testid="guard-check-run">
          <ShieldCheck className="size-3.5" aria-hidden /> {check.isPending ? 'Trying…' : 'Test the guard'}
        </Btn>
        <div aria-live="polite" className="mt-2">
          {r?.refused && (
            <div className="text-good" data-testid="guard-check-ok">
              Refused, and nothing was sent. It’s on the receipt.
            </div>
          )}
          {r && !r.refused && (
            <div className="font-bold text-bad" data-testid="guard-check-broken">
              {r.message} Please report this.
            </div>
          )}
          {check.isError && <div className="text-bad">{check.error instanceof Error ? check.error.message : 'The check didn’t run.'}</div>}
        </div>
      </div>
    </div>
  );
}
