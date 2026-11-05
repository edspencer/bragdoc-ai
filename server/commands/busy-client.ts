// From edspencer/cli-contract reference/busy-client.ts @ 0.2 (unchanged since 0.1); local changes: the instance is
// found through BragDoc's own runtime.json (server/runtime.ts readRuntimeAddress: the file also holds the MCP token,
// which isn't needed here) or a port the caller names, not a URL, and asked through egress.ts's probeLoopback
// (127.0.0.1 only, unlogged: D9, D51) rather than fetch (`get`, injectable, in place of `fetch`); the exit codes are
// args.ts's; the Output object is BragDoc's `out`/`err` pair (`io`), with `bragdoc: ` before an error; the name and the
// nouns are BragDoc's, so `busyMessage` and `describeCounts` take no name (D86).
//
// The CLI's side of the busy check (SPEC §4): find the running instance, ask its `/api/busy`, and map the answer to
// exit 0 (idle), 75 (busy) or 3 (nothing answers), with §4's messages. Used by `bragdoc busy`, and before
// `service stop`, `service restart` and `update`.
import { EXIT_BUSY, EXIT_NOT_RUNNING } from '../args.js';
import { probeLoopback } from '../egress.js';
import { readRuntimeAddress } from '../runtime.js';

/** What `/api/busy` answers (SPEC §4). Counts only, until §10's first question is settled. */
export interface BusyAnswer {
  busy: boolean;
  version?: string;
  counts?: Record<string, number>;
}

export type BusyResult =
  | { state: 'not-running' }
  | { state: 'idle' | 'busy'; url: string; answer: BusyAnswer }
  /** Something answered, but not with a busy answer: an older BragDoc without `/api/busy`, or another program. */
  | { state: 'unknown'; url: string; detail: string };

/** GET a path on 127.0.0.1:<port>; rejects when nothing answers. */
export type LoopbackGet = (port: number, pathname: string, timeoutMs: number) => Promise<Response>;

export interface FindOptions {
  /** The data home, holding `runtime.json`. */
  dataDir: string;
  /** Ask this port instead of the one in `runtime.json` (`--port`, or the service unit's). */
  port?: number;
  /** How long to wait for an answer. §4 asks for well under a second; this allows for a slow machine. */
  timeoutMs?: number;
  get?: LoopbackGet;
}

const urlOf = (port: number) => `http://localhost:${port}`;

/**
 * Asks the running instance whether it's busy. There's no fallback to the default port: an instance that's running
 * wrote `runtime.json`, and guessing a port would ask whatever else is listening there.
 */
export async function checkBusy(o: FindOptions): Promise<BusyResult> {
  let port = o.port;
  let url = port === undefined ? undefined : urlOf(port);
  if (port === undefined) {
    // runtime.json stays behind after a clean exit (its token outlives the server: runtime.ts); its pid says whether
    // the server it describes is still running
    const r = readRuntimeAddress(o.dataDir);
    if (!r?.running) return { state: 'not-running' };
    ({ port, url } = r);
  }
  const busyUrl = new URL('/api/busy', url).toString();
  let res: Response;
  try {
    res = await (o.get ?? probeLoopback)(port, '/api/busy', o.timeoutMs ?? 3000);
  } catch {
    // Refused, reset or timed out: nothing is answering, which §4 calls not running.
    return { state: 'not-running' };
  }
  if (!res.ok) return { state: 'unknown', url: busyUrl, detail: `HTTP ${res.status}` };
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { state: 'unknown', url: busyUrl, detail: "the answer isn't JSON" };
  }
  if (!isBusyAnswer(body)) return { state: 'unknown', url: busyUrl, detail: 'the answer has no boolean `busy`' };
  return { state: body.busy ? 'busy' : 'idle', url: busyUrl, answer: body };
}

function isBusyAnswer(v: unknown): v is BusyAnswer {
  if (typeof v !== 'object' || v === null || typeof (v as BusyAnswer).busy !== 'boolean') return false;
  const counts = (v as BusyAnswer).counts;
  if (counts === undefined) return true;
  return typeof counts === 'object' && counts !== null && Object.values(counts).every((n) => Number.isInteger(n) && n >= 0);
}

/** A kind's singular and plural, where adding an "s" is wrong. */
export type Nouns = Record<string, [singular: string, plural: string]>;

/** BragDoc's kinds of work (shared/api.ts BusyResponse), as a person reads them. */
export const NOUNS: Nouns = { import: ['import', 'imports'], judge: ['judge run', 'judge runs'], ai: ['AI request', 'AI requests'] };

/** `1 import and 2 AI requests are running`, from the non-zero counts; '' if there are none. */
export function describeCounts(counts: Record<string, number> = {}, nouns: Nouns = NOUNS): string {
  const parts = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([kind, n]) => {
      const [one, many] = nouns[kind] ?? [kind, `${kind}s`];
      return `${n} ${n === 1 ? one : many}`;
    });
  if (parts.length === 0) return '';
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`;
  const total = Object.values(counts).reduce((a, n) => a + (n > 0 ? n : 0), 0);
  return `${list} ${total === 1 ? 'is' : 'are'} running`;
}

/** The sentence for a person (SPEC §4): `BragDoc is busy: 1 judge run is running.` */
export function busyMessage(result: BusyResult, nouns: Nouns = NOUNS): string {
  switch (result.state) {
    case 'not-running':
      return "BragDoc isn't running.";
    case 'idle':
      return "BragDoc isn't busy.";
    case 'busy': {
      const what = describeCounts(result.answer.counts, nouns);
      return what ? `BragDoc is busy: ${what}.` : 'BragDoc is busy.';
    }
    case 'unknown':
      return `Something answered at ${result.url}, but not as BragDoc's busy check (${result.detail}).`;
  }
}

/** 0 idle, 75 busy, 3 nothing answers, 1 an answer that isn't a busy answer. */
export function busyExitCode(result: BusyResult): number {
  switch (result.state) {
    case 'idle':
      return 0;
    case 'busy':
      return EXIT_BUSY;
    case 'not-running':
      return EXIT_NOT_RUNNING;
    case 'unknown':
      return 1;
  }
}

/** What `bragdoc busy --json` prints: valid against the contract's `schemas/busy.schema.json`. */
export function busyJson(result: BusyResult): Record<string, unknown> {
  if (result.state === 'not-running') return { running: false, busy: false };
  if (result.state === 'unknown') return { running: true, busy: false, url: base(result.url), error: result.detail };
  return {
    running: true,
    busy: result.answer.busy,
    url: base(result.url),
    ...(result.answer.version !== undefined ? { version: result.answer.version } : {}),
    counts: result.answer.counts ?? {},
  };
}

const base = (busyUrl: string) => busyUrl.replace(/\/api\/busy$/, '');

export interface Say {
  out(s: string): void;
  err(s: string): void;
}

/** `bragdoc busy [--json]`. Returns the exit code. With --json, one document on stdout and the sentence on stderr. */
export async function runBusyCommand(o: FindOptions & { io: Say; json: boolean }): Promise<number> {
  const result = await checkBusy(o);
  const message = busyMessage(result);
  if (o.json) o.io.out(JSON.stringify(busyJson(result), null, 2) + '\n');
  if (result.state === 'unknown') o.io.err(`bragdoc: ${message}\n`);
  else if (o.json) o.io.err(message + '\n');
  else o.io.out(message + '\n');
  return busyExitCode(result);
}

/**
 * The check before `service stop`, `service restart` and `update` (SPEC §4). Returns null to go ahead, or 75 after
 * printing the refusal. With `--force` it prints the same message, prefixed `Overriding:`, and goes ahead. Nothing
 * answering, or an answer that isn't a busy answer (an older BragDoc), goes ahead: there's nothing it can say is cut
 * short.
 */
export async function guardBusy(o: FindOptions & { io: Say; force?: boolean; hint?: string }): Promise<number | null> {
  const result = await checkBusy(o);
  if (result.state !== 'busy') return null;
  const message = busyMessage(result);
  if (o.force) {
    o.io.err(`Overriding: ${message}\n`);
    return null;
  }
  o.io.err(`bragdoc: ${message} ${o.hint ?? 'Try again once it has finished, or use --force.'}\n`);
  return EXIT_BUSY;
}
