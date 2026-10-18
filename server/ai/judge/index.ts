// The Found judge (SPEC R21, D72–D74): for each pending candidate the rules let through, a model's honest opinion (keep
// or not, why, how sure), written to its `verdict`. It never keeps, merges or dismisses anything, and never touches a
// candidate you've decided: `services.found.setVerdict()` refuses those, and is the only thing it writes.
//
// - **What's judged** (`eligible`): pending candidates of the ticked kinds (screenshots; merged PRs only with
//   `judge.github`; never MCP), without a verdict, newest first, at most `maxPerRun`. "Judge again" names ids, and
//   then a verdict doesn't matter, but the rest still does.
// - **A run** is one at a time (409 while one runs), one candidate after another, at `background` priority unless
//   someone pressed Judge now. Its calls are one run in the AI activity log, counted as `win` · `probably-not` ·
//   `failed` · `skipped`. An item's own failure (an answer that's wrong twice, a timeout) is that item's; anything that
//   would fail every item (the runner down, AI switched off, a refused key) stops the run.
// - **Its input** is built fresh each time (judge/input.ts): a screenshot is read again through ctx.ocr, only if the
//   file is still the picture that passed (its sha256 is the candidate's key). The text is held in memory only (R7).
// - **The answer is checked** before it's written: a quote that isn't verbatim in the message judged is dropped, as is
//   a `from` that isn't in the input; project names map to ids (unknown ones dropped); `why` is trimmed to 160
//   characters; `confidence` and `impact` are clamped. `by` is "<model> on <where>", `inputHash` the sha256 of the input
//   and your instructions.
//
// No SDK import here: createApp builds this with AI off, and only ctx.ai loads the SDK, on the first call.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import type { AiGateCode, AiJudgeCounts, AiJudgePreview, AiJudgeStatus, AiTrigger } from '../../../shared/api.js';
import { contextTokensOf } from '../../../shared/ai/connections.js';
import { isVerbatim } from '../../../shared/ai/grounding.js';
import type { Judge, JudgeAnswer, JudgeContext } from '../../../shared/judge.js';
import { parsePrKey, parsePrUrl } from '../../../shared/links.js';
import type { FoundCandidate, Verdict } from '../../../shared/schema/found.js';
import type { Profile } from '../../../shared/schema/profile.js';
import type { Project } from '../../../shared/schema/project.js';
import type { ConfigStore } from '../../config.js';
import type { EventBus } from '../../events.js';
import type { Ocr } from '../../ocr/index.js';
import type { Services } from '../../services/index.js';
import type { Store } from '../../store/index.js';
import type { AiActivity } from '../activity.js';
import { AiError } from '../errors.js';
import { connectionHost } from '../policy.js';
import type { Ai, Priority } from '../run.js';
import { JUDGE_GITHUB_SCHEMA_NAME, JudgeGithubAnswer, judgeGithubPrompt } from '../prompts/judge-github.js';
import { JUDGE_SCREENSHOT_SCHEMA_NAME, JudgeScreenshotAnswer, judgeScreenshotPrompt, type JudgePromptInput } from '../prompts/judge-screenshot.js';
import { githubInput, inputBudget, screenshotInput, cut, type JudgeInput } from './input.js';
import { whatCountsStarter } from './starter.js';

/** What the judge needs from the app (a slice of AppContext, so tests and the eval can build one). */
export interface JudgeDeps {
  config: Pick<ConfigStore, 'get'>;
  ai: Ai;
  aiActivity: AiActivity;
  store: Store;
  services: Services;
  ocr: Ocr;
  bus?: EventBus;
}

export const WHY_MAX = 160;
const FROM_MAX = 80;
/** A picture bigger than this isn't read again (the source never adds one; a file replaced since might be). */
const MAX_PICTURE_BYTES = 50 * 1024 * 1024;
/** These fail every item after them: the run stops. Anything else is one item's failure. */
const RUN_LEVEL = new Set(['ai_off', 'no_model', 'not_consented', 'no_key', 'unreachable', 'model_missing', 'key_refused', 'quota', 'rate_limited', 'cancelled', 'busy']);

export type JudgeKind = 'screenshots' | 'github';

/** A candidate, made ready to send: its prompt, the input it was built from, and what the answer is checked against. */
export interface Prepared {
  kind: JudgeKind;
  input: JudgeInput;
  instructions: string | null;
  system: string;
  prompt: string;
  inputHash: string;
  /** Project name (lower case) → id, for the answer's names. */
  projects: Map<string, string>;
}

export interface RunOptions {
  /** Judge these again (verdict or not); otherwise whatever's waiting. */
  ids?: string[];
  trigger: AiTrigger;
  /** `now` when someone pressed Judge now and is watching (the default for `trigger: 'now'`). */
  priority?: Priority;
  signal?: AbortSignal;
}

export interface RunSummary {
  runId: string;
  total: number;
  done: number;
  counts: AiJudgeCounts;
  outcome: 'ok' | 'error' | 'cancelled';
  error: string | null;
}

export class JudgeRunning extends Error {
  constructor(readonly runId: string) {
    super('the judge is already running; wait for it to finish');
    this.name = 'JudgeRunning';
  }
}

export interface JudgeEngine extends Judge {
  /** Start a run in the background: throws an AiError for a gate (409) or JudgeRunning. `done` settles when it ends. */
  start(opts: RunOptions): { runId: string; queued: number; done: Promise<RunSummary> };
  /** start() and wait for it. */
  judgePending(opts: RunOptions): Promise<RunSummary>;
  /** Stop the run in progress (if any): what's been judged stays. */
  cancel(): void;
  status(): AiJudgeStatus;
  /** The candidates a run would take now (or of `ids`, for Judge again). */
  eligible(ids?: string[]): FoundCandidate[];
  /** What would be sent for one candidate. Sends nothing. Throws NotJudgeable for one the judge doesn't take. */
  preview(id: string): Promise<AiJudgePreview>;
  /** Make the candidate ready to send (exported for the eval and the tests). */
  prepare(c: FoundCandidate): Promise<Prepared>;
  /** Write ai/what-counts.md from your profile if there's none (the judge switched on for the first time). */
  ensureInstructions(): void;
  /** Stop listening for config changes. */
  close(): void;
}

export class NotJudgeable extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotJudgeable';
  }
}

const sha256 = (b: Uint8Array | string) => crypto.createHash('sha256').update(b).digest('hex');

export const inputHashOf = (kind: JudgeKind, input: string, instructions: string | null) =>
  `sha256:${crypto.createHash('sha256').update(kind).update('\0').update(input).update('\0').update(instructions ?? '').digest('hex')}`;

/** "this computer", "your network", or the host on the internet: where a verdict came from, for its `by`. */
export function whereLabel(where: string, host: string | null): string {
  return where === 'this-computer' ? 'this computer' : where === 'your-network' ? 'your network' : (host ?? 'the internet');
}

/** The projects a judge may name: the active and paused ones (the ones you'd still file things under). */
export const judgeProjects = (store: Store): Project[] => store.all('project').filter((p) => p.status === 'active' || p.status === 'paused');

/** A model's answer → the verdict that's written (without `by` and `at`). Exported for the unit tests and Jev (PR28). */
export function checkAnswer(a: JudgeAnswer, p: Pick<Prepared, 'kind' | 'input' | 'inputHash' | 'projects'>): Omit<Verdict, 'at' | 'by'> {
  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
  // a model that answers 86 for 86% meant 0.86; anything else out of range is clamped
  const conf = Number.isFinite(a.confidence) ? clamp(Number.isInteger(a.confidence) && a.confidence > 1 && a.confidence <= 100 ? a.confidence / 100 : a.confidence, 0, 1) : undefined;
  const why = a.why?.replace(/\s+/g, ' ').trim();
  const quote = a.quote?.replace(/\s+/g, ' ').trim();
  const from = a.from?.replace(/\s+/g, ' ').trim();
  const projects = [...new Set((a.projects ?? []).map((n) => p.projects.get(n.replace(/\s+/g, ' ').trim().toLowerCase())).filter((id): id is string => !!id))];
  const impact = p.kind === 'github' && typeof a.impact === 'number' && Number.isFinite(a.impact) ? clamp(Math.round(a.impact), 1, 10) : undefined;
  return {
    keep: a.keep,
    ...(conf !== undefined ? { confidence: Math.round(conf * 100) / 100 } : {}),
    // no invention (SPEC principle 7): a quote that isn't the judged message's own words is dropped, and so is a
    // "probably not" one (a dismissed-to-be candidate keeps as little of the screenshot's text as it can)
    ...(a.keep && quote && p.kind === 'screenshots' && isVerbatim(quote, p.input.target) ? { quote: cut(quote, 400) } : {}),
    ...(why ? { why: cut(why, WHY_MAX) } : {}),
    suggestedProjects: projects,
    ...(from && p.kind === 'screenshots' && isVerbatim(from, p.input.text) ? { from: cut(from, FROM_MAX) } : {}),
    ...(impact !== undefined ? { impact } : {}),
    inputHash: p.inputHash,
  };
}

export function createJudge(deps: JudgeDeps): JudgeEngine {
  const { config, ai, aiActivity, store, services, ocr, bus } = deps;
  let running: (NonNullable<AiJudgeStatus['running']> & { controller: AbortController }) | null = null;
  let last: AiJudgeStatus['last'] = null;
  const changed = () => bus?.emitSoon('ai-judge', { type: 'ai-judge' }, 100, 500);

  const unStarter = services.instructions.setStarter('what-counts', () => whatCountsStarter(store.profile()));

  function ensureInstructions(): void {
    try {
      if (!store.entry('instructions', 'what-counts')?.raw) services.instructions.ensure('what-counts', whatCountsStarter(store.profile()));
    } catch {
      /* a data home that can't be written: the judge still runs, on the default guidance */
    }
  }
  // the first time the judge is switched on (however: Settings, a hand edit of config.yaml), its starter is written
  const judgeOn = () => {
    const c = config.get();
    return c.ai.enabled && c.ai.features.judge.enabled;
  };
  const unsubscribe = bus?.subscribe((e) => {
    if (e.type === 'config' && judgeOn()) ensureInstructions();
  });

  function kindsOn(): { screenshots: boolean; github: boolean } {
    const j = config.get().ai.features.judge;
    return { screenshots: j.screenshots, github: j.github };
  }

  function judgeable(c: FoundCandidate): c is FoundCandidate & { source: JudgeKind } {
    const k = kindsOn();
    return c.status === 'pending' && ((c.source === 'screenshots' && k.screenshots) || (c.source === 'github' && k.github));
  }

  function eligible(ids?: string[]): FoundCandidate[] {
    const max = config.get().ai.features.judge.maxPerRun;
    const pending = services.found.list().filter(judgeable);
    if (ids) {
      const want = new Set(ids);
      return pending.filter((c) => want.has(c.id)).slice(0, max);
    }
    return pending.filter((c) => !c.verdict).slice(0, max);
  }

  /** The judge's model's connection and its context size, if one is chosen. */
  function slotInfo(): { model: string | null; contextTokens: number } {
    const cfg = config.get();
    const slot = ai.readiness('judge').slot;
    const conn = slot ? cfg.ai.connections[slot.connection] : undefined;
    return { model: slot?.model ?? null, contextTokens: conn ? contextTokensOf(conn, cfg.ai.connections) : 8192 };
  }

  /** A screenshot's text, read again: only from the file that passed (its sha256 is the key), else null. */
  async function reread(c: FoundCandidate): Promise<string | null> {
    const file = c.files[0]?.path;
    const sha = /^screenshot:([0-9a-f]{64})$/.exec(c.externalKey ?? '')?.[1];
    if (!file || !sha) return null;
    try {
      const st = await fs.stat(file);
      if (!st.isFile() || st.size > MAX_PICTURE_BYTES) return null;
      const bytes = new Uint8Array(await fs.readFile(file));
      if (sha256(bytes) !== sha) return null; // replaced since: not the picture that passed
      return (await ocr.read({ bytes })).text;
    } catch {
      return null; // gone, unreadable, or OCR couldn't: the quote stands in
    }
  }

  async function prepare(c: FoundCandidate): Promise<Prepared> {
    if (c.source !== 'screenshots' && c.source !== 'github') throw new NotJudgeable(`the judge doesn't judge ${c.source} candidates`);
    const profile: Profile | null = store.profile();
    const projects = judgeProjects(store);
    const instructions = services.instructions.forPrompt('what-counts');
    const base: Omit<JudgePromptInput, 'input'> = { profile, projects: projects.map((p) => p.name), instructions };
    const promptOf = c.source === 'github' ? judgeGithubPrompt : judgeScreenshotPrompt;
    let input: JudgeInput;
    if (c.source === 'github') {
      const pr = c.evidence.find((e) => e.kind === 'github_pr');
      const repo = (pr?.url ? parsePrUrl(pr.url)?.fullName : null) ?? parsePrKey(c.externalKey)?.fullName ?? null;
      const merged = typeof pr?.meta?.mergedAt === 'string' ? pr.meta.mergedAt : c.happenedAt;
      input = githubInput({ repo, title: c.title, body: c.body ?? null, mergedAt: merged });
    } else {
      const q = c.evidence.find((e) => e.kind === 'quote')?.quote ?? null;
      const systemChars = promptOf({ ...base, input: '' }).system.length;
      input = screenshotInput({
        ocrText: await reread(c),
        quote: q ? { text: q.text, ...(q.from ? { from: q.from } : {}), ...(q.where ? { where: q.where } : {}) } : null,
        profile: { name: profile?.name ?? '', aliases: profile?.aliases ?? [], notMe: profile?.notMe ?? [], ...(profile?.githubLogin ? { githubLogin: profile.githubLogin } : {}) },
        maxChars: inputBudget({ contextTokens: slotInfo().contextTokens, systemChars }),
      });
    }
    const { system, prompt } = promptOf({ ...base, input: input.text });
    return { kind: c.source, input, instructions, system, prompt, inputHash: inputHashOf(c.source, input.text, instructions), projects: new Map(projects.map((p) => [p.name.replace(/\s+/g, ' ').trim().toLowerCase(), p.id])) };
  }

  /** One call: the prepared prompt → the checked verdict, and where it came from. */
  async function ask(p: Prepared, call: { runId?: string; priority?: Priority; signal?: AbortSignal; trigger?: AiTrigger }): Promise<{ verdict: Omit<Verdict, 'at' | 'by'>; by: string }> {
    const common = { feature: 'judge' as const, purpose: 'ai.judge', system: p.system, prompt: p.prompt, maxOutputTokens: 400, ...(call.runId ? { runId: call.runId } : {}), ...(call.trigger ? { trigger: call.trigger } : {}), ...(call.priority ? { priority: call.priority } : {}), ...(call.signal ? { signal: call.signal } : {}) };
    const r =
      p.kind === 'github'
        ? await ai.object({ ...common, schema: JudgeGithubAnswer, schemaName: JUDGE_GITHUB_SCHEMA_NAME })
        : await ai.object({ ...common, schema: JudgeScreenshotAnswer, schemaName: JUDGE_SCREENSHOT_SCHEMA_NAME });
    const o = r.object as Partial<JudgeScreenshotAnswer & JudgeGithubAnswer>;
    const answer: JudgeAnswer = { keep: !!o.keep, confidence: o.confidence ?? NaN, quote: o.quote ?? '', from: o.from ?? '', why: o.why ?? '', projects: o.projects ?? [], ...(o.impact !== undefined ? { impact: o.impact } : {}) };
    const host = connectionHost(config.get().ai, r.connection);
    return { verdict: checkAnswer(answer, p), by: `${r.model} on ${whereLabel(r.where, host ?? r.connection)}` };
  }

  /** Judge interface (D8): one candidate, its context given. The engine's runs build the context themselves. */
  async function decide(candidate: FoundCandidate, context: JudgeContext): Promise<Omit<Verdict, 'at' | 'by'>> {
    const p = await prepare(candidate);
    if (context.input !== undefined || context.instructions !== undefined) {
      const instructions = context.instructions ?? null;
      const input: JudgeInput = context.input !== undefined ? { ...p.input, text: context.input, target: context.input } : p.input;
      const promptOf = p.kind === 'github' ? judgeGithubPrompt : judgeScreenshotPrompt;
      const { system, prompt } = promptOf({ profile: context.profile, projects: context.projects.map((x) => x.name), instructions, input: input.text });
      Object.assign(p, { input, instructions, system, prompt, inputHash: inputHashOf(p.kind, input.text, instructions), projects: new Map(context.projects.map((x) => [x.name.trim().toLowerCase(), x.id])) });
    }
    return (await ask(p, {})).verdict;
  }

  function start({ ids, trigger, priority, signal }: RunOptions): { runId: string; queued: number; done: Promise<RunSummary> } {
    if (running) throw new JudgeRunning(running.runId);
    const { gate } = ai.readiness('judge');
    if (gate) throw new AiError(gate.code, gate.message);
    ensureInstructions();
    const todo = eligible(ids);
    const run = aiActivity.start({ feature: 'judge', trigger });
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal?.addEventListener('abort', onAbort, { once: true });
    const counts: AiJudgeCounts = {};
    const state = { runId: run.id, trigger, startedAt: new Date(store.now().getTime()).toISOString(), total: todo.length, done: 0, counts, controller };
    running = state;
    changed();
    const prio: Priority = priority ?? (trigger === 'now' ? 'now' : 'background');
    const count = (k: keyof AiJudgeCounts) => {
      counts[k] = (counts[k] ?? 0) + 1;
      run.count(k);
    };

    const done = (async (): Promise<RunSummary> => {
      let error: string | null = null;
      let cancelled = false;
      let itemError: string | null = null;
      try {
        for (const c of todo) {
          if (controller.signal.aborted) {
            cancelled = true;
            error = 'cancelled';
            break;
          }
          // the gates may have closed between items (AI switched off, the model unchosen): stop before asking
          const g = ai.readiness('judge').gate;
          if (g) {
            error = g.code;
            cancelled = g.code === 'ai_off';
            break;
          }
          // decided, or its kind unticked, since the run started: leave it
          const now = store.get('found', c.id);
          if (!now || !judgeable(now)) {
            count('skipped');
            state.done++;
            changed();
            continue;
          }
          try {
            const p = await prepare(now);
            const { verdict, by } = await ask(p, { runId: run.id, priority: prio, signal: controller.signal });
            const w = services.found.setVerdict(c.id, { ...verdict, by, at: new Date(store.now().getTime()).toISOString() } as Verdict);
            count(!w.written ? 'skipped' : verdict.keep ? 'win' : 'probably-not');
          } catch (e) {
            const code = e instanceof AiError ? e.code : null;
            if (code && RUN_LEVEL.has(code)) {
              error = code;
              cancelled = code === 'cancelled' || code === 'ai_off';
              break;
            }
            count('failed'); // this item: a bad answer, a timeout, a file that can't be written
            itemError = code ?? 'failed';
          }
          state.done++;
          changed();
        }
      } finally {
        // every item failed (and none was judged): the run failed, with the last item's reason, as the activity log says
        if (!error && itemError && !counts.win && !counts['probably-not']) error = itemError;
        signal?.removeEventListener('abort', onAbort);
        run.end({ error, cancelled });
        const outcome: RunSummary['outcome'] = cancelled ? 'cancelled' : error ? 'error' : 'ok';
        last = { runId: run.id, trigger, startedAt: state.startedAt, endedAt: new Date(store.now().getTime()).toISOString(), total: state.total, done: state.done, counts: { ...counts }, outcome, error };
        running = null;
        changed();
      }
      return { runId: run.id, total: state.total, done: state.done, counts: { ...counts }, outcome: last!.outcome, error };
    })();
    return { runId: run.id, queued: todo.length, done };
  }

  return {
    decide,
    start,
    judgePending: async (opts) => start(opts).done,
    cancel: () => running?.controller.abort(),
    eligible,
    prepare,
    ensureInstructions,
    status(): AiJudgeStatus {
      const { gate } = ai.readiness('judge');
      const j = config.get().ai.features.judge;
      const waiting = services.found.list().filter((c) => judgeable(c) && !c.verdict).length;
      const r = running;
      return {
        ready: !gate,
        reason: (gate?.code ?? null) as AiGateCode | null,
        message: gate?.message ?? null,
        kinds: kindsOn(),
        waiting,
        maxPerRun: j.maxPerRun,
        running: r ? { runId: r.runId, trigger: r.trigger, startedAt: r.startedAt, total: r.total, done: r.done, counts: { ...r.counts } } : null,
        last,
      };
    },
    async preview(id) {
      const c = services.found.get(id);
      if (c.status !== 'pending') throw new NotJudgeable(`that one was already ${c.status}: the judge only looks at pending candidates`);
      const p = await prepare(c);
      return { candidate: c.id, kind: p.kind, input: p.input.from, system: p.system, prompt: p.prompt, model: slotInfo().model, truncated: p.input.truncated, inputHash: p.inputHash };
    },
    close() {
      unsubscribe?.();
      unStarter();
    },
  };
}
