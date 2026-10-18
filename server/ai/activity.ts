// The AI activity log (SPEC R20, D68): logs/ai-runs.jsonl, one line per run, for Settings → AI's receipt. A run is a
// feature's pass over many items (a judge run, an eval) or a single call (a tidy, a draft, a connection test).
//
// - It hears every finished call from ctx.ai (`listen(ai)`, over Ai.onCall). A call that names a run opened here
//   (`start()` → its `id` as the call's `runId`) is counted into that run, whose line is written when it ends; any
//   other call is a line of its own.
// - **Never any content**: no prompt, answer, quote, title or message. Codes, counts, times, the model and where it
//   went. An error is its code only (`unreachable`, `bad_output`), because a message can quote what was sent.
// - A run that never asked a model anything writes nothing: this is the log of what asked a model, and a judge run
//   with nothing to judge didn't.
// - Machine-written (atomic.ts appendLine, 0600), like the network log, and rotated the same way: at LOG_MAX_BYTES
//   the file becomes ai-runs.1.jsonl (replacing the one before), and reads cover both.
// - Nothing is created until a line is written, so with AI off there's no file at all.
import fs from 'node:fs';
import path from 'node:path';
import type { AiActivityEntry, AiActivityResponse, AiTrigger, AiWhere } from '../../shared/api.js';
import type { AiCallFeature } from '../../shared/ai/connections.js';
import { ulid } from '../../shared/ulid.js';
import { appendLine } from '../atomic.js';
import { LOG_MAX_BYTES } from '../egress.js';
import { homePaths } from '../home.js';
import type { Ai, CallRecord } from './run.js';

/** A code is lower-case words and `_`/`-`: anything else (a sentence) isn't stored. */
const CODE_RE = /^[a-z][a-z0-9_-]{0,39}$/;
const code = (s: string | null | undefined): string | null => (s && CODE_RE.test(s) ? s : s ? 'failed' : null);

/** Runs left open longer than this are written as abandoned (a feature that forgot to end one). */
export const RUN_MAX_MS = 6 * 60 * 60 * 1000;

export interface ActivityRun {
  /** Pass this as `runId` to every ctx.ai call the run makes. */
  readonly id: string;
  /** Count one of the feature's own outcomes (`win`, `probably-not`, `skipped`): these become the line's `counts`. */
  count(outcome: string, n?: number): void;
  /**
   * Write the run's line (once; later calls do nothing). `error`: why it stopped, as a code. `cancelled`: it was
   * stopped (AI turned off, the user cancelled). Returns the line, or null when it made no calls (nothing written).
   */
  end(opts?: { error?: string | null; cancelled?: boolean }): AiActivityEntry | null;
}

export interface ActivityOptions {
  dataDir: string;
  now?: () => number;
  /** Called after each line is written (createApp emits `{ type: 'ai-activity' }`). */
  onLine?: (e: AiActivityEntry) => void;
  /** Rotate past this size (tests). */
  maxBytes?: number;
}

interface Open {
  entry: AiActivityEntry;
  lastError: string | null;
  t0: number;
  ended: boolean;
}

export class AiActivity {
  private readonly file: string;
  private readonly now: () => number;
  private readonly runs = new Map<string, Open>();

  constructor(private readonly opts: ActivityOptions) {
    this.file = activityFile(opts.dataDir);
    this.now = opts.now ?? Date.now;
  }

  /** Hear every call `ai` makes. Returns the unsubscribe. */
  listen(ai: Pick<Ai, 'onCall'>): () => void {
    return ai.onCall((r) => this.record(r));
  }

  /** Open a run that groups many calls. End it with `end()`, whatever happens (a `finally`). */
  start({ feature, trigger }: { feature: AiCallFeature; trigger: AiTrigger }): ActivityRun {
    this.sweep();
    const t0 = this.now();
    const id = ulid(t0);
    const at = new Date(t0).toISOString();
    const open: Open = { entry: blank(id, feature, trigger, at), lastError: null, t0, ended: false };
    this.runs.set(id, open);
    return {
      id,
      count: (outcome, n = 1) => {
        const k = code(outcome);
        if (!k || open.ended) return;
        open.entry.counts[k] = (open.entry.counts[k] ?? 0) + n;
      },
      end: ({ error = null, cancelled = false } = {}) => this.finish(open, { error, cancelled }),
    };
  }

  /** One finished call (from ctx.ai): into its run, or a line of its own. */
  record(r: CallRecord): void {
    const open = r.runId ? this.runs.get(r.runId) : undefined;
    if (open && !open.ended) {
      add(open.entry, r);
      if (r.outcome === 'error') open.lastError = code(r.error);
      return;
    }
    const startedAt = r.startedAt;
    const e = blank(ulid(Date.parse(startedAt) || this.now()), r.feature, r.trigger ?? 'now', startedAt);
    add(e, r);
    e.endedAt = new Date(Date.parse(startedAt) + r.ms).toISOString();
    e.ms = r.ms;
    e.outcome = r.outcome;
    e.error = r.outcome === 'ok' ? null : code(r.error);
    this.write(e);
  }

  /** What's in the log, newest first. */
  read(opts: { limit?: number; offset?: number } = {}): AiActivityResponse {
    return readActivity(this.opts.dataDir, opts);
  }

  private finish(open: Open, { error, cancelled }: { error: string | null; cancelled: boolean }): AiActivityEntry | null {
    if (open.ended) return null;
    open.ended = true;
    this.runs.delete(open.entry.id);
    const e = open.entry;
    const total = e.calls.ok + e.calls.error + e.calls.cancelled;
    if (!total) return null; // nothing asked a model anything
    const end = this.now();
    e.endedAt = new Date(end).toISOString();
    e.ms = end - open.t0;
    const counted = Object.values(e.counts).reduce((a, b) => a + b, 0);
    e.items = counted || total;
    e.error = code(error) ?? (e.calls.ok === 0 && e.calls.error > 0 ? open.lastError : null);
    e.outcome = cancelled ? 'cancelled' : e.error ? 'error' : e.calls.ok === 0 && e.calls.cancelled > 0 ? 'cancelled' : 'ok';
    this.write(e);
    return e;
  }

  /** Write runs left open far too long, so a feature's bug can't hold memory (or its line) forever. */
  private sweep(): void {
    const now = this.now();
    for (const open of [...this.runs.values()]) if (now - open.t0 > RUN_MAX_MS) this.finish(open, { error: 'abandoned', cancelled: false });
  }

  private write(e: AiActivityEntry): void {
    try {
      rotateIfNeeded(this.file, this.opts.maxBytes ?? LOG_MAX_BYTES);
      appendLine(this.file, JSON.stringify(e));
    } catch (err) {
      // a log that can't be written mustn't break the call; say so where someone running it will see it
      process.stderr.write(`bragdoc: couldn't write the AI activity log: ${(err as Error).message}\n`);
      return;
    }
    try {
      this.opts.onLine?.(e);
    } catch {
      /* a listener's problem isn't the log's */
    }
  }
}

function blank(id: string, feature: AiCallFeature, trigger: AiTrigger, at: string): AiActivityEntry {
  return { id, feature, trigger, startedAt: at, endedAt: at, ms: 0, connection: null, model: null, where: null, items: 0, calls: { ok: 0, error: 0, cancelled: 0 }, counts: {}, tokensIn: null, tokensOut: null, outcome: 'ok', error: null };
}

function add(e: AiActivityEntry, r: CallRecord): void {
  e.calls[r.outcome]++;
  e.items = e.calls.ok + e.calls.error + e.calls.cancelled;
  e.connection ??= r.connection;
  e.model ??= r.model;
  e.where ??= r.where as AiWhere;
  if (r.tokensIn !== null) e.tokensIn = (e.tokensIn ?? 0) + r.tokensIn;
  if (r.tokensOut !== null) e.tokensOut = (e.tokensOut ?? 0) + r.tokensOut;
}

export const activityFile = (dataDir: string) => path.join(homePaths(dataDir).logs, 'ai-runs.jsonl');

function rotateIfNeeded(file: string, max: number): void {
  let size: number;
  try {
    size = fs.statSync(file).size;
  } catch {
    return;
  }
  if (size >= max) fs.renameSync(file, file.replace(/\.jsonl$/, '.1.jsonl'));
}

/** The log, newest first, from ai-runs.jsonl and the rotated ai-runs.1.jsonl. Lines that don't parse are skipped. */
export function readActivity(dataDir: string, { limit = 50, offset = 0 }: { limit?: number; offset?: number } = {}): AiActivityResponse {
  const file = activityFile(dataDir);
  const entries: AiActivityEntry[] = [];
  for (const f of [file.replace(/\.jsonl$/, '.1.jsonl'), file]) {
    let text: string;
    try {
      text = fs.readFileSync(f, 'utf8');
    } catch {
      continue;
    }
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        const e = JSON.parse(line) as AiActivityEntry;
        if (typeof e.id === 'string' && typeof e.startedAt === 'string' && typeof e.feature === 'string') entries.push(e);
      } catch {
        /* a torn line (a crash mid-append): skip it */
      }
    }
  }
  entries.reverse();
  return { entries: entries.slice(offset, offset + limit), total: entries.length };
}
