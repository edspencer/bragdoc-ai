// When the judge runs by itself (SPEC R22, D75). Turning the judge on gives you Judge now and nothing else: every
// background trigger is a second, explicit choice, and with a cloud model a third ("also in the background").
//
// - **As they arrive** (`when.onArrival`): a candidate the judge would take, new to Found (not one an Undo brought
//   back), starts a run 30 s after the last of a burst (at most 5 minutes after the first): 5 arrivals → 1 run.
// - **Every N hours** (`when.everyHours`): a run when N hours have passed since the last scheduled one.
// - **Conditions** for both: only between two local times (across midnight is fine), and only on AC power (on by
//   default; unknown, as on a desktop or in Docker, counts as plugged in). A cloud model also needs `backgroundCloud`.
// - **One run at a time** (the engine refuses a second). A background run stops after the item in progress when its
//   conditions stop holding (unplugged, the window closed, background judging or the judge switched off); what it
//   judged stays and the rest waits. Arrivals held back by a condition run as soon as it lifts.
// - **Backoff:** a run that couldn't reach its model (the runner down, the model gone, rate limits…) holds background
//   runs for 15 minutes, doubling to 6 hours; any run that works clears it. Judge now ignores all of this: you asked.
//
// Its state (the last scheduled run, the backoff, the last run of any kind) is cache/ai/judge.json: derived, deletable,
// written only once the judge has run. Nothing here runs until startServer calls start(); createApp starts nothing.
import fs from 'node:fs';
import path from 'node:path';
import type { AiJudgeHold, AiJudgeSchedule, AiTrigger } from '../../../shared/api.js';
import { atomicWrite } from '../../atomic.js';
import type { ConfigStore } from '../../config.js';
import type { EventBus } from '../../events.js';
import type { PowerState } from '../../platform/power.js';
import type { Store } from '../../store/index.js';
import { whereOf } from '../policy.js';
import type { Ai } from '../run.js';
import type { JudgeEngine, RunSummary } from './index.js';

const MIN = 60_000;
const HOUR = 60 * MIN;
/** Arrivals are gathered for this long after the last one… */
export const ARRIVAL_DEBOUNCE_MS = 30_000;
/** …but a steady trickle still starts a run this long after the first. */
export const ARRIVAL_MAX_WAIT_MS = 5 * MIN;
/** How often it looks at the clock, the window and the power. */
export const TICK_MS = 30_000;
export const BACKOFF_MS = 15 * MIN;
export const BACKOFF_MAX_MS = 6 * HOUR;
/** A run that ended with one of these couldn't reach (or use) its model: background runs back off. */
const BACKOFF_CODES = new Set(['unreachable', 'timeout', 'model_missing', 'key_refused', 'quota', 'rate_limited', 'busy', 'failed', 'no_structured_output', 'bad_output', 'context_too_long']);

/** The schedule's clock: tests drive a fake one. */
export interface Clock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export const realClock: Clock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => {
    const t = setTimeout(fn, ms);
    t.unref?.();
    return t;
  },
  clearTimeout: (h) => clearTimeout(h as NodeJS.Timeout),
};

export interface ScheduleDeps {
  dataDir: string;
  config: Pick<ConfigStore, 'get'>;
  judge: JudgeEngine;
  ai: Pick<Ai, 'readiness'>;
  store: Pick<Store, 'subscribe' | 'get' | 'all'>;
  bus?: EventBus;
  /** Is this computer plugged in? (platform/power.ts) */
  power: () => Promise<PowerState>;
  clock?: Clock;
  tickMs?: number;
}

interface State {
  /** When the last "every N hours" slot was used (a run, or nothing waiting). */
  lastScheduledAt: string | null;
  failures: number;
  retryAt: string | null;
  lastError: string | null;
  lastRun: AiJudgeSchedule['lastRun'];
}

const EMPTY: State = { lastScheduledAt: null, failures: 0, retryAt: null, lastError: null, lastRun: null };

export interface JudgeSchedule {
  /** Listen for arrivals and run the clock. Returns a function that stops it all. */
  start(): () => void;
  status(): AiJudgeSchedule;
  /** Read the power again if the last reading is older than `maxAgeMs` (the status route, before it answers). */
  refreshPower(maxAgeMs?: number): Promise<void>;
  /** One look at the clock: start a run that's due (tests call it with a fake clock). */
  tick(): Promise<void>;
  /** Settles when the run this schedule started (if any) has ended. */
  idle(): Promise<void>;
}

const hhmm = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  return h! * 60 + m!;
};

/** Is `at` (local time) inside from–to? Across midnight when `to` is earlier; from = to means all day. */
export function inWindow(at: Date, w: { from: string; to: string }): boolean {
  const m = at.getHours() * 60 + at.getMinutes();
  const f = hhmm(w.from);
  const t = hhmm(w.to);
  if (f === t) return true;
  return f < t ? m >= f && m < t : m >= f || m < t;
}

/** The next time the window opens after `at` (local time). */
export function windowOpens(at: Date, w: { from: string; to: string }): Date {
  const f = hhmm(w.from);
  const d = new Date(at.getFullYear(), at.getMonth(), at.getDate(), Math.floor(f / 60), f % 60, 0, 0);
  if (d.getTime() <= at.getTime()) d.setDate(d.getDate() + 1);
  return d;
}

/** 15 minutes, doubling with each failure in a row, at most 6 hours. */
export const backoffMs = (failures: number) => Math.min(BACKOFF_MS * 2 ** Math.max(0, failures - 1), BACKOFF_MAX_MS);

export function createJudgeSchedule(deps: ScheduleDeps): JudgeSchedule {
  const { dataDir, config, judge, ai, store, bus, power: readPower } = deps;
  const clock = deps.clock ?? realClock;
  const tickMs = deps.tickMs ?? TICK_MS;
  const file = path.join(dataDir, 'cache', 'ai', 'judge.json');
  const changed = () => bus?.emitSoon('ai-judge', { type: 'ai-judge' }, 100, 500);

  let power: PowerState = 'unknown';
  let powerAt = 0;
  /** Candidates already seen (so an Undo isn't an arrival). */
  const known = new Set<string>();
  let arrivalsWaiting = false;
  /** A scheduled run stopped by its conditions (or cut at maxPerRun): it carries on when they lift. */
  let resumeSchedule = false;
  let firstArrival = 0;
  let debounce: unknown = null;
  let tickTimer: unknown = null;
  let running: Promise<unknown> | null = null;
  let started = false;
  let state: State | null = null;

  function load(): State {
    if (state) return state;
    try {
      state = { ...EMPTY, ...(JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<State>) };
    } catch {
      state = { ...EMPTY };
    }
    return state;
  }

  function save(patch: Partial<State>): void {
    state = { ...load(), ...patch };
    try {
      atomicWrite(file, JSON.stringify(state, null, 2) + '\n');
    } catch (e) {
      process.stderr.write(`bragdoc: couldn't save the judge's schedule: ${(e as Error).message}\n`);
    }
    changed();
  }

  const settings = () => config.get().ai.features.judge;
  const now = () => new Date(clock.now());

  function cloud(): boolean {
    const slot = ai.readiness('judge').slot;
    return !!slot && config.get().ai.connections[slot.connection] !== undefined && whereOf(config.get().ai, slot.connection) === 'internet';
  }

  /**
   * Why a background run can't go on (or start) right now, for the conditions only: the switches, cloud, the window,
   * the power. Also what a running background run asks between items (D75).
   */
  function conditions(): { code: AiJudgeHold; until: string | null } | null {
    const j = settings();
    if (ai.readiness('judge').gate) return { code: 'not-ready', until: null };
    if (!j.when.onArrival && !j.when.everyHours) return { code: 'off', until: null };
    if (cloud() && !j.backgroundCloud) return { code: 'cloud', until: null };
    const at = now();
    if (j.when.onlyBetween && !inWindow(at, j.when.onlyBetween)) return { code: 'window', until: windowOpens(at, j.when.onlyBetween).toISOString() };
    if (j.when.onlyOnAC && power === 'battery') return { code: 'battery', until: null };
    return null;
  }

  function backoff(): AiJudgeSchedule['backoff'] {
    const s = load();
    return s.retryAt && Date.parse(s.retryAt) > clock.now() ? { until: s.retryAt, failures: s.failures, error: s.lastError ?? 'failed' } : null;
  }

  /** Everything that holds a background run back, in the order the card explains it. */
  function hold(): { code: AiJudgeHold; until: string | null } | null {
    if (judge.status().running) return { code: 'running', until: null };
    const c = conditions();
    if (c) return c;
    const b = backoff();
    if (b) return { code: 'backoff', until: b.until };
    if (!judge.eligible().length) return { code: 'nothing', until: null };
    return null;
  }

  function nextScheduled(): Date | null {
    const n = settings().when.everyHours;
    if (!n) return null;
    const last = load().lastScheduledAt;
    return new Date(Math.max(last ? Date.parse(last) + n * HOUR : 0, clock.now()));
  }

  /** Start a background run, if nothing holds it. */
  function tryRun(trigger: Extract<AiTrigger, 'arrival' | 'schedule'>): boolean {
    const h = hold();
    if (h) {
      if (h.code === 'nothing' && trigger === 'schedule') save({ lastScheduledAt: now().toISOString() }); // the slot's used: nothing waited
      return false;
    }
    try {
      const r = judge.start({ trigger, until: () => conditions()?.code ?? null });
      if (trigger === 'schedule') save({ lastScheduledAt: now().toISOString() });
      // this run takes them; one stopped early (or cut at maxPerRun) puts them back (onRunEnd)
      if (trigger === 'arrival') arrivalsWaiting = false;
      else resumeSchedule = false;
      running = r.done.catch(() => {}).finally(() => (running = null));
      changed();
      return true;
    } catch {
      return false; // a gate closed, or a Judge now got there first: the next tick looks again
    }
  }

  async function tick(): Promise<void> {
    if (clock.now() - powerAt >= tickMs / 2) await refreshPower(0);
    const j = settings();
    if (!j.enabled) {
      arrivalsWaiting = false;
      return;
    }
    if (arrivalsWaiting && j.when.onArrival && !debounce && tryRun('arrival')) return;
    if (resumeSchedule && j.when.everyHours && tryRun('schedule')) return;
    const next = nextScheduled();
    if (next && next.getTime() <= clock.now()) tryRun('schedule');
  }

  async function refreshPower(maxAgeMs = 30_000): Promise<void> {
    if (clock.now() - powerAt < maxAgeMs && powerAt) return;
    const before = power;
    try {
      power = await readPower();
    } catch {
      power = 'unknown';
    }
    powerAt = clock.now();
    if (power !== before) changed();
  }

  function arrived(id: string): void {
    if (known.has(id)) return;
    known.add(id);
    const c = store.get('found', id);
    if (!c || c.status !== 'pending' || c.verdict) return;
    const j = settings();
    if (!j.enabled || !j.when.onArrival) return;
    if (!judge.eligible([id]).length) return; // a kind it doesn't judge (MCP, PRs without the tick)
    const t = clock.now();
    if (!arrivalsWaiting) firstArrival = t;
    arrivalsWaiting = true;
    if (debounce) clock.clearTimeout(debounce);
    const wait = Math.max(0, Math.min(ARRIVAL_DEBOUNCE_MS, firstArrival + ARRIVAL_MAX_WAIT_MS - t));
    debounce = clock.setTimeout(() => {
      debounce = null;
      if (arrivalsWaiting) tryRun('arrival');
    }, wait);
    changed();
  }

  function onRunEnd(r: RunSummary & { trigger: AiTrigger; startedAt: string; endedAt: string }): void {
    // a background run its conditions stopped, or one that took maxPerRun with more waiting: the rest go next, once
    // nothing holds them (not after a failure: the backoff decides that, and a failing item isn't retried every tick)
    if (r.trigger === 'arrival' || r.trigger === 'schedule') {
      const stopped = r.outcome === 'cancelled' && r.error !== null && ['battery', 'window', 'cloud', 'off'].includes(r.error);
      const capped = r.outcome === 'ok' && r.total >= settings().maxPerRun;
      if ((stopped || capped) && judge.eligible().length) {
        if (r.trigger === 'arrival') arrivalsWaiting = true;
        else resumeSchedule = true;
      }
    }
    const lastRun: AiJudgeSchedule['lastRun'] = { at: r.endedAt, trigger: r.trigger, outcome: r.outcome, error: r.error, counts: r.counts, total: r.total, done: r.done };
    if (r.outcome === 'error' && r.error && BACKOFF_CODES.has(r.error)) {
      const failures = load().failures + 1;
      save({ lastRun, failures, lastError: r.error, retryAt: new Date(clock.now() + backoffMs(failures)).toISOString() });
    } else if (r.outcome === 'ok' && r.total > 0) {
      save({ lastRun, failures: 0, lastError: null, retryAt: null });
    } else if (r.total > 0 || r.outcome !== 'ok') {
      save({ lastRun });
    }
  }

  return {
    start() {
      if (started) return () => {};
      started = true;
      for (const c of store.all('found')) known.add(c.id); // what's in Found already isn't an arrival
      const unRun = judge.onRunEnd(onRunEnd);
      const unStore = store.subscribe((ch) => {
        if (ch.entity === 'found' && ch.op === 'upsert' && !ch.problem) arrived(ch.id);
      });
      const unBus = bus?.subscribe((e) => {
        if (e.type !== 'config') return;
        const j = settings();
        // background judging switched off: arrivals gathered so far are forgotten (Judge now still takes them)
        if (!j.enabled || !j.when.onArrival) {
          arrivalsWaiting = false;
          if (debounce) clock.clearTimeout(debounce);
          debounce = null;
        }
        changed();
      });
      const loop = () => {
        tickTimer = clock.setTimeout(() => {
          void tick().finally(() => started && loop());
        }, tickMs);
      };
      void refreshPower(0);
      loop();
      return () => {
        started = false;
        unRun();
        unStore();
        unBus?.();
        if (debounce) clock.clearTimeout(debounce);
        if (tickTimer) clock.clearTimeout(tickTimer);
        debounce = tickTimer = null;
      };
    },
    status(): AiJudgeSchedule {
      const j = settings();
      const s = load();
      return {
        background: j.when.onArrival || !!j.when.everyHours,
        onArrival: j.when.onArrival,
        everyHours: j.when.everyHours,
        cloud: cloud(),
        power,
        hold: j.enabled ? hold() : { code: 'not-ready', until: null },
        nextRunAt: j.enabled ? (nextScheduled()?.toISOString() ?? null) : null,
        arrivalsWaiting,
        backoff: backoff(),
        lastRun: s.lastRun,
      };
    },
    refreshPower,
    tick,
    idle: async () => {
      await running;
    },
  };

}
