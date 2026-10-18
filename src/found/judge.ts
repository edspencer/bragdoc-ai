// The judge, as Found and its Settings card say it (SPEC R21, R22; PR25). Pure, so it's unit-tested (test/judge-ui.test.ts):
// how Found groups what's waiting once verdicts exist, and the plain words for when the judge runs by itself and why
// it isn't running now ("waiting for 19:00", "on battery", "backing off until 14:20").
import type { AiJudgeCounts, AiJudgeSchedule } from '../../shared/api.ts';
import type { FoundCandidate } from '../../shared/schema/index.ts';
import { OUTCOME_HEADLINE } from '../settings/ai/words.ts';

export interface FoundGroups {
  /** Any verdict at all: without one, Found is v0.1's single list. */
  grouped: boolean;
  /** "Looks like a win", surest first. */
  wins: FoundCandidate[];
  /** Not judged yet, newest first (as the list came). */
  unjudged: FoundCandidate[];
  /** "Probably not", surest first: collapsed, never dismissed by itself. */
  probablyNot: FoundCandidate[];
}

const sure = (c: FoundCandidate) => c.verdict?.confidence ?? 0.5;

export function groupFound(items: readonly FoundCandidate[]): FoundGroups {
  const wins: FoundCandidate[] = [];
  const unjudged: FoundCandidate[] = [];
  const probablyNot: FoundCandidate[] = [];
  for (const c of items) (!c.verdict ? unjudged : c.verdict.keep ? wins : probablyNot).push(c);
  // stable: equal confidence keeps the list's order (newest first)
  const bySure = (a: FoundCandidate, b: FoundCandidate) => sure(b) - sure(a);
  return { grouped: wins.length + probablyNot.length > 0, wins: wins.sort(bySure), unjudged, probablyNot: probablyNot.sort(bySure) };
}

/** "14:20", or "Tue 14:20" when it isn't today, in this browser's time zone. */
export function when(iso: string, now = new Date()): string {
  const d = new Date(iso);
  // the browser's own clock style, as its time inputs show it (17:52 or 5:52 PM)
  const t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return d.toDateString() === now.toDateString() ? t : `${d.toLocaleDateString([], { weekday: 'short' })} ${t}`;
}

/** Why a run stopped or failed, for people (the activity log and the status keep codes). */
export const STOP_WORDS: Record<string, string> = {
  battery: 'stopped: this computer went onto battery',
  window: 'stopped: the “only between” window closed',
  off: 'stopped: background judging was switched off',
  cloud: 'stopped: a cloud model needs “also in the background”',
  'not-ready': 'stopped: the judge couldn’t run',
};

export function errorWords(code: string | null): string {
  if (!code) return 'it didn’t work';
  return STOP_WORDS[code] ?? (OUTCOME_HEADLINE as Record<string, string>)[code]?.toLowerCase() ?? code;
}

/**
 * One sentence about when the judge runs by itself, from the status: what's set, and what's holding it back right
 * now. Null when there's nothing to say beyond the run in progress, or while it can't run at all (the card says why).
 */
export function scheduleLine(s: AiJudgeSchedule, onlyBetween: { from: string; to: string } | null = null, now = new Date()): string | null {
  const h = s.hold;
  if (h?.code === 'not-ready' || h?.code === 'running') return null;
  if (!s.background || h?.code === 'off') return 'It runs only when you press Judge now.';
  const what = [s.onArrival ? 'as new candidates arrive' : null, s.everyHours ? `every ${s.everyHours === 1 ? 'hour' : `${s.everyHours} hours`}` : null].filter(Boolean).join(', and ');
  const base = `It judges ${what}`;
  switch (h?.code) {
    case 'cloud':
      return `${base}, but not with a cloud model until you tick “also in the background”. Judge now still works.`;
    case 'window':
      return `${base}. Waiting for ${when(h.until!, now)}${onlyBetween ? ` (only between ${onlyBetween.from} and ${onlyBetween.to})` : ''}.`;
    case 'battery':
      return `${base}. On battery: it waits until this computer is plugged in.`;
    case 'backoff':
      return `${base}. The last run didn’t work (${errorWords(s.backoff?.error ?? null)}): backing off until ${when(h.until!, now)}. Judge now still works.`;
    default: {
      const next = s.everyHours && s.nextRunAt ? ` Next run ${Date.parse(s.nextRunAt) - now.getTime() < 60_000 ? 'any moment' : `at ${when(s.nextRunAt, now)}`}.` : '';
      const soon = s.arrivalsWaiting ? ' New ones are waiting: it starts in a moment.' : '';
      return `${base}.${soon}${next}`;
    }
  }
}

/** The power reading's caveat: unknown counts as plugged in, and the card says so. */
export const POWER_WORDS: Record<AiJudgeSchedule['power'], string> = {
  ac: 'Plugged in now.',
  battery: 'On battery now.',
  unknown: 'BragDoc can’t tell whether this computer is plugged in (a desktop, or Docker), so it counts as plugged in.',
};

/** "3 wins · 2 probably not · 1 failed" from a run's counts. */
export function countsLine(c: AiJudgeCounts): string {
  const parts = [c.win ? `${c.win} ${c.win === 1 ? 'win' : 'wins'}` : null, c['probably-not'] ? `${c['probably-not']} probably not` : null, c.failed ? `${c.failed} failed` : null, c.skipped ? `${c.skipped} skipped` : null].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'nothing judged';
}
