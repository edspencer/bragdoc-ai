// Found's two empty states (SPEC R7, R10): "All caught up" with what's still watching, or "every source is off" with
// the way to Settings → Sources. Adapted from the Scrapbook prototype's EmptyFound, with v0.1's sources (no Slack).
import type { SourcesResponse } from '../../shared/api.ts';
import { Kicker, LinkBtn } from '../kit/index.ts';
import { fmt, todayIso } from '../lib/dates.ts';
import { clock } from './FoundCard.tsx';

/** One line about the GitHub source for "Still watching". */
export function githubLine(g: SourcesResponse['github']): string {
  if (g.running) return 'checking now…';
  const r = g.lastRun;
  // a time's calendar day here, not in UTC
  const when = (iso: string) => {
    const day = todayIso(new Date(iso));
    return `${day === todayIso() ? '' : `${fmt.short(day)} `}${clock(iso)}`;
  };
  if (g.retryAt) return `GitHub asked BragDoc to wait; it can check again after ${when(g.retryAt)}`;
  if (!r) return g.hourly ? 'checks every hour' : 'not checked yet: press Check now in Settings';
  if (r.error) return `the last check, at ${when(r.at)}, didn’t work: ${r.error.message}`;
  const what = r.added ? `${r.added} new` : 'nothing new merged';
  return `checked at ${when(r.at)}, ${what}${g.hourly ? '; checks every hour' : ''}`;
}

/** "40 looked at · 3 sent to Found" (SPEC R7's counters). */
export function screenshotCounts(s: SourcesResponse['screenshots']): string {
  const c = s.counts;
  return `${c.looked} looked at · ${c.sent} sent to Found${c.ignored ? ` · ${c.ignored} passed over` : ''}${c.failed ? ` · ${c.failed} unreadable` : ''}`;
}

/** One line about the screenshots folder for "Still watching" and its card. */
export function screenshotsLine(s: SourcesResponse['screenshots']): string {
  if (s.state === 'error') return s.error?.message ?? 'it can’t watch the folder';
  if (s.reading) return `reading ${s.reading}${s.queued ? ` (${s.queued} more waiting)` : ''}…`;
  const when = (iso: string) => {
    const day = todayIso(new Date(iso));
    return `${day === todayIso() ? 'today' : fmt.relative(day)}, ${clock(iso)}`;
  };
  return `watching ${s.folder}${s.lastMatch ? `; last sent to Found ${when(s.lastMatch.at)}` : ''}`;
}

export function EmptyFound({ sources, filtered }: { sources: SourcesResponse | undefined; filtered?: string }) {
  if (filtered)
    return (
      <div className="mx-auto mt-14 max-w-xl text-center" data-testid="found-empty-filter">
        <div className="font-hand text-[30px] leading-tight text-muted">Nothing from {filtered} is waiting.</div>
      </div>
    );
  const allOff = !!sources && !sources.github.enabled && !sources.screenshots.enabled;
  if (allOff)
    return (
      <div className="mx-auto mt-16 max-w-xl text-center" data-testid="found-empty-off">
        <div className="font-hand text-[34px] leading-tight text-muted">Found is quiet because every source is switched off.</div>
        <p className="mt-3 text-[14.5px] text-muted">
          That’s fine. You can still pin things to your board by hand, and your coding agent can still suggest things over MCP. If you want BragDoc to spot your merged pull requests, or praise you screenshot, turn on GitHub or the screenshots folder.
        </p>
        <LinkBtn to="/settings/$tab" params={{ tab: 'sources' }} kind="accent" className="mt-5" data-testid="found-choose-sources">
          Choose sources
        </LinkBtn>
      </div>
    );
  return (
    <div className="mx-auto mt-16 max-w-xl text-center" data-testid="found-empty-caught-up">
      <div className="font-hand text-[38px] leading-tight text-muted">All caught up. Go do something brilliant.</div>
      {sources && (
        <div className="sb-card relative mx-auto mt-8 w-fit max-w-full rotate-[0.8deg] rounded-2xl px-6 py-4 text-left">
          <Kicker>Still watching</Kicker>
          <ul className="m-0 mt-2 list-none space-y-1.5 p-0 text-[13.5px]">
            {sources.github.enabled && (
              <li data-testid="watching-github">
                <b>GitHub</b> <span className="text-muted">· {githubLine(sources.github)}</span>
              </li>
            )}
            {sources.screenshots.enabled && (
              <li data-testid="watching-screenshots">
                <b>Screenshots folder</b> <span className="text-muted">· {screenshotsLine(sources.screenshots)}</span>
              </li>
            )}
            <li>
              <b>Your coding agent</b> <span className="text-muted">· can suggest things over MCP</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
