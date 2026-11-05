// From edspencer/cli-contract reference/health.ts @ 0.2; local changes: no default `fetch`, as in registry.ts: the
// caller passes egress.ts's loopback probe (D51).
//
// Asking `/api/health` (SPEC §8): once, until it answers, or until it answers with one version. The service commands
// wait on it before they claim success, and `update` waits for the target version (SPEC §5 step 12). It's an HTTP
// request to the URL a person would open, not a pid lookup: launchd and systemd both report a crash-looping job as
// running for most of each restart interval. Node built-ins only.

/** What `/api/health` said. */
export interface HealthAnswer {
  ok: boolean;
  /** The running server's version; absent from a tool that predates the contract. */
  version?: string;
}

/** The shape of `fetch` this needs. BragDoc passes egress.ts's (D9); there's no default. */
export type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

/** Rejects, so a caller that forgot to pass egress.ts's fetch finds out, rather than one going out around it. */
export const noFetch: Fetch = () => Promise.reject(new Error("no fetch was given: BragDoc's requests go through egress.ts"));

export interface HealthOptions {
  /** The server's base URL: `http://127.0.0.1:7233`. */
  url: string;
  fetch?: Fetch;
}

const healthUrl = (base: string) => new URL('/api/health', base).toString();

/** Asks once. Undefined means nothing answered (with a 2xx), which is an answer, not an error. */
export async function fetchHealth(o: HealthOptions & { timeoutMs?: number }): Promise<HealthAnswer | undefined> {
  try {
    const res = await (o.fetch ?? noFetch)(healthUrl(o.url), { signal: AbortSignal.timeout(o.timeoutMs ?? 2000) });
    if (!res.ok) return undefined;
    const body = (await res.json()) as { ok?: unknown; version?: unknown };
    return { ok: body.ok === true, ...(typeof body.version === 'string' ? { version: body.version } : {}) };
  } catch {
    return undefined;
  }
}

export interface WaitOptions extends HealthOptions {
  timeoutMs?: number;
  intervalMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * How long to wait before saying it didn't answer. Generous, because it's only spent when something is wrong, and
 * too short a wait says "didn't start" about a service that's only slow to boot.
 */
export const READY_TIMEOUT_MS = 20_000;

const defaults = (o: WaitOptions) => ({
  timeoutMs: o.timeoutMs ?? READY_TIMEOUT_MS,
  intervalMs: o.intervalMs ?? 250,
  now: o.now ?? (() => Date.now()),
  sleep: o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms))),
});

/** Polls until `/api/health` answers 2xx, or the time runs out. Each request has its own abort. */
export async function waitForReady(o: WaitOptions): Promise<'ready' | 'timeout'> {
  const { timeoutMs, intervalMs, now, sleep } = defaults(o);
  const deadline = now() + timeoutMs;
  for (;;) {
    const answer = await fetchHealth({ ...o, timeoutMs: Math.max(250, Math.min(2000, deadline - now())) });
    if (answer !== undefined) return 'ready';
    if (deadline - now() <= 0) return 'timeout';
    await sleep(intervalMs);
  }
}

/** What `waitForVersion` found (SPEC §5 step 12). */
export type HealthVerdict =
  | { state: 'ok'; version: string }
  /** Something answers, but as another version. */
  | { state: 'wrong-version'; version: string }
  | { state: 'no-answer' };

/**
 * Polls until `/api/health` reports exactly `version`. "It answers" isn't enough: the old server still shutting
 * down, another instance on the port, and a supervisor that brought the old unit back all answer, and those are the
 * failures a rollback is for. A wrong version and no answer are kept apart because they read differently in a report.
 */
export async function waitForVersion(o: WaitOptions & { version: string }): Promise<HealthVerdict> {
  const { timeoutMs, intervalMs, now, sleep } = defaults(o);
  const deadline = now() + timeoutMs;
  let last: string | undefined;
  for (;;) {
    const answer = await fetchHealth({ ...o, timeoutMs: Math.max(250, Math.min(2000, deadline - now())) });
    if (answer?.version !== undefined) {
      if (answer.version === o.version) return { state: 'ok', version: o.version };
      last = answer.version;
    }
    if (deadline - now() <= 0) return last !== undefined ? { state: 'wrong-version', version: last } : { state: 'no-answer' };
    await sleep(intervalMs);
  }
}
