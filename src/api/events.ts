// Live updates: the server's event stream (`GET /api/events`, SSE, PR2) turned into query invalidations. An event is
// a hint about what changed, never the data itself: the matching queries are refetched rather than patched from the
// payload. Events that arrive together are coalesced into one round of refetches, the stream reconnects with backoff,
// and every reconnect refreshes everything, since events may have been missed while it was down (the first
// connect doesn't: the page has just loaded its data). All of this is
// adapted from Hallway's src/live.ts.
//
// The wire format, which PR2's server/events.ts sends:
//   event: hello            on connect (data ignored)
//   event: change           data: a ServerEvent (shared/api.ts), {"type": "<resource>", ...}: something of that
//                           type changed
//   (comments)              keep-alive pings, which EventSource ignores by itself
//
// A `change` refreshes every query whose key starts with one of the resources in CHANGE_INVALIDATES[type]. An
// unknown type refreshes everything: slower, never stale. Feature PRs add their ServerEvent type to the map.
import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';

/** `change` type (ServerEvent['type']) → the first segments of the query keys it makes stale. */
export const CHANGE_INVALIDATES: Record<string, readonly string[]> = {
  // the GitHub source's options live in config.yaml, and Found's empty state says what's on
  config: ['meta', 'settings', 'sources'],
  // a source's status: a check started or finished, connected or disconnected (PR13)
  sources: ['sources'],
  'mcp-token': ['mcp-token'],
  network: ['network-log'],
  notices: ['meta'],
  // the store (PR7, D48): one type per kind of data file, plus the Problems list
  // projects too: their achievement counts and piles (PR8)
  // folio too: its clippings are achievements, with evidence names, projects' and companies' names and the profile's
  achievement: ['achievements', 'projects', 'folio'],
  // a sidecar: OCR text (searchable) and sizes shown on cards
  evidence: ['achievements', 'folio'],
  // a project's colour and name show on the Gantt, its summary, and the board's tape and pills
  project: ['projects', 'folio'],
  // a company's or repo's name shows in project summaries; deleting one detaches it from projects
  company: ['companies', 'projects', 'folio'],
  repo: ['repos', 'projects'],
  found: ['found'],
  profile: ['profile', 'folio'],
  problems: ['problems'],
};

/** What to refresh for one event: a list of key prefixes, or 'all'. Null: nothing (pings, unknown event types). */
export function invalidationsFor(type: string, data: string): readonly string[] | 'all' | null {
  if (type === 'hello') return 'all';
  if (type !== 'change') return null;
  let kind: unknown;
  try {
    kind = (JSON.parse(data) as { type?: unknown } | null)?.type;
  } catch {
    return 'all';
  }
  return (typeof kind === 'string' && Object.hasOwn(CHANGE_INVALIDATES, kind) && CHANGE_INVALIDATES[kind]) || 'all';
}

/** Turn a batch of invalidations into the fewest refetches: everything, or each prefix once. */
export function applyInvalidations(qc: QueryClient, batch: (readonly string[] | 'all')[]): void {
  if (batch.includes('all')) {
    void qc.invalidateQueries();
    return;
  }
  for (const prefix of new Set(batch.flat() as string[])) void qc.invalidateQueries({ queryKey: [prefix] });
}

/** An SSE message's data (typed loosely: this file also compiles under the server's no-DOM config, for its tests). */
const dataOf = (e: Event): string => String((e as unknown as { data?: unknown }).data ?? '');

const BACKOFF_MS = [500, 1000, 2000, 5000, 10_000, 30_000];
/** Events this close together are one batch. */
const COALESCE_MS = 50;

/**
 * Keep the page's queries fresh from the server's event stream. Mounted once, in the shell. `enabled: false` skips it
 * (an EventSource on a path that answers with JSON makes the browser log an error on every retry).
 */
export function useServerEvents({ enabled = true, url = '/api/events' }: { enabled?: boolean; url?: string } = {}): void {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    let es: EventSource | null = null;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    let batch: (readonly string[] | 'all')[] = [];
    let stopped = false;
    let connectedBefore = false;

    const queue = (inv: readonly string[] | 'all' | null) => {
      if (!inv) return;
      batch.push(inv);
      flushTimer ??= setTimeout(() => {
        flushTimer = null;
        const b = batch;
        batch = [];
        applyInvalidations(qc, b);
      }, COALESCE_MS);
    };

    const connect = () => {
      es = new EventSource(url);
      es.addEventListener('hello', (e) => {
        attempt = 0;
        if (connectedBefore) queue(invalidationsFor('hello', dataOf(e)));
        connectedBefore = true;
      });
      es.addEventListener('change', (e) => queue(invalidationsFor('change', dataOf(e))));
      es.onerror = () => {
        // EventSource retries a dropped stream by itself, but gives up for good on an HTTP error (readyState CLOSED):
        // take over then, with backoff.
        if (es?.readyState !== EventSource.CLOSED || stopped) return;
        es.close();
        retryTimer = setTimeout(connect, BACKOFF_MS[Math.min(attempt++, BACKOFF_MS.length - 1)]);
      };
    };
    connect();

    return () => {
      stopped = true;
      es?.close();
      if (retryTimer) clearTimeout(retryTimer);
      if (flushTimer) clearTimeout(flushTimer);
    };
  }, [enabled, url, qc]);
}
