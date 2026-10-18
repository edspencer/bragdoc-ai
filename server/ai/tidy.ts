// "Tidy this up" (SPEC R23, D78–D79): text in, an achievement suggestion out. Nothing here writes anything: the answer
// goes back to the board, where the user accepts it field by field and saves it themselves (SPEC principle 6).
//
// - **Gathering** (gatherTidy): the server collects the text itself, from what the browser names: pasted text, board
//   pictures (their OCR sidecar, waiting briefly for a read in progress), and an achievement's own fields. So the
//   browser can't put words in a picture's mouth, and the preview is built from the same parts.
// - **One call** through ctx.ai.object (gated, queued, through egress, in the activity log), with a lenient schema:
//   small local models get lengths and nulls wrong often enough that refusing (and repairing) over them costs more
//   than fixing them here.
// - **Checking** (finishTidy, pure): lengths clipped, "null" strings made null, impact clamped, projects mapped from
//   names to your ids (unknown ones dropped), a date kept only if the material states it or a relative date in it
//   resolves to it (else dropped and said so: D79), and every number, amount, date or name in a text field that isn't
//   in your text flagged (shared/ai/grounding.ts; SPEC principle 7).
import { z } from 'zod';
import type { AiTidyField, AiTidyRequest, AiTidyResponse, AiTidySuggestion } from '../../shared/api.js';
import { ungrounded } from '../../shared/ai/grounding.js';
import { IMPACT_SCALE } from '../../shared/impact.js';
import type { Achievement, Project } from '../../shared/schema/index.js';
import type { AppContext } from '../context.js';
import { AiError } from './errors.js';
import { TIDY_LIMITS, TIDY_MAX_CHARS, tidyMaterial, tidyPrompt, type TidyPart } from './prompts/tidy.js';

/** What the model is asked for. Lenient on purpose: finishTidy enforces the limits. */
export const TidyAnswerSchema = z.object({
  title: z.string().describe('One line, what I did, at most 90 characters'),
  summary: z.string().describe('One or two sentences, at most 280 characters'),
  body: z.string().nullable().describe('Optional markdown detail, at most 1500 characters, or null'),
  happenedAt: z.string().nullable().describe('YYYY-MM-DD, only if stated or worked out from a relative date; else null'),
  endedAt: z.string().nullable().describe('YYYY-MM-DD, only for work stated to span a period; else null'),
  impact: z.number().nullable().describe('1 to 10 on the impact scale, or null'),
  impactWhy: z.string().nullable().describe('One short line on why that impact, or null'),
  projects: z.array(z.string()).describe('Names from my project list, exactly as listed; may be empty'),
  notAnAchievement: z.string().nullable().describe("If this isn't an achievement, a short reason; else null"),
  unclear: z.string().nullable().describe("One line on what you couldn't tell, or null"),
});
export type TidyAnswer = z.infer<typeof TidyAnswerSchema>;
export const TIDY_SCHEMA_NAME = 'achievement_tidy';

/** A tidy the server refuses before asking any model: its status, code and sentence. */
export class TidyRefused extends Error {
  constructor(
    readonly status: 400 | 404 | 409,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

const isoOf = (d: Date) => d.toISOString().slice(0, 10);
const dayOf = (iso: string) => new Date(`${iso}T00:00:00Z`);
const addDays = (iso: string, n: number) => isoOf(new Date(dayOf(iso).getTime() + n * DAY_MS));
const validIso = (s: string) => ISO.test(s) && isoOf(dayOf(s)) === s;

/** Today in the user's time zone (profile.yaml), else this machine's. */
export function localToday(now: Date, timeZone?: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  } catch {
    return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  }
}

// ---------------------------------------------------------------- dates the material allows

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_RE = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?';
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const NUMBER_WORDS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, couple: 2, few: 3 };

export interface DateRange {
  from: string;
  to: string;
  /** Why it's allowed, for tests and the "dropped" sentence. */
  why: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const monthIdx = (name: string) => MONTHS.indexOf(name.slice(0, 3).toLowerCase());
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

/**
 * The dates (as ranges) that the material states or implies, against `today`. A date the model gives outside all of
 * them was made up (D79). Leans toward allowing: an explicit date, any reading of 10/11, a weekday in the last two
 * weeks, "last week" as the last fortnight.
 */
export function allowedDates(text: string, today: string): DateRange[] {
  const t = text.toLowerCase();
  const out: DateRange[] = [];
  const exact = (iso: string, why: string) => validIso(iso) && out.push({ from: iso, to: iso, why });
  const year = Number(today.slice(0, 4));
  // a month and day with no year: this year, or last year if that's still to come
  const guessYear = (m: number, d: number) => (`${year}-${pad(m + 1)}-${pad(d)}` > today ? year - 1 : year);

  for (const m of t.matchAll(/(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/g)) exact(`${m[1]}-${m[2]}-${m[3]}`, m[0]);
  for (const m of t.matchAll(new RegExp(`\\b${MONTH_RE} (\\d{1,2})(?:st|nd|rd|th)?(?:,? (\\d{4}))?(?!\\d|:\\d)`, 'g'))) {
    const mo = monthIdx(m[1]!), d = Number(m[2]);
    exact(`${m[3] ?? guessYear(mo, d)}-${pad(mo + 1)}-${pad(d)}`, m[0]);
  }
  for (const m of t.matchAll(new RegExp(`(?<!\\d)(\\d{1,2})(?:st|nd|rd|th)? (?:of )?${MONTH_RE}(?:,? (\\d{4}))?`, 'g'))) {
    const mo = monthIdx(m[2]!), d = Number(m[1]);
    exact(`${m[3] ?? guessYear(mo, d)}-${pad(mo + 1)}-${pad(d)}`, m[0]);
  }
  for (const m of t.matchAll(new RegExp(`\\b${MONTH_RE},? (\\d{4})(?!\\d)`, 'g'))) {
    const mo = monthIdx(m[1]!), y = Number(m[2]);
    out.push({ from: `${y}-${pad(mo + 1)}-01`, to: `${y}-${pad(mo + 1)}-${pad(lastDay(y, mo))}`, why: m[0] });
  }
  for (const m of t.matchAll(/\bq([1-4]),? (\d{4})(?!\d)/g)) {
    const q = Number(m[1]) - 1, y = Number(m[2]);
    out.push({ from: `${y}-${pad(q * 3 + 1)}-01`, to: `${y}-${pad(q * 3 + 3)}-${pad(lastDay(y, q * 3 + 2))}`, why: m[0] });
  }
  // 10/11 or 10/11/2026: either reading. Not a fraction ("1/3 of it") or "24/7"
  for (const m of t.matchAll(/(?<![\d/.])(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?(?![\d/%])(?!\s+of\b)/g)) {
    if (m[0] === '24/7') continue;
    const a = Number(m[1]), b = Number(m[2]);
    const y = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : null;
    if (a >= 1 && a <= 12) exact(`${y ?? guessYear(a - 1, b)}-${pad(a)}-${pad(b)}`, m[0]);
    if (b >= 1 && b <= 12) exact(`${y ?? guessYear(b - 1, a)}-${pad(b)}-${pad(a)}`, m[0]);
  }

  // 11.10.2026 (day first) and 2026/10/11
  for (const m of t.matchAll(/(?<![\d.])(\d{1,2})\.(\d{1,2})\.(\d{4})(?![\d.])/g)) exact(`${m[3]}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`, m[0]);
  for (const m of t.matchAll(/(?<!\d)(\d{4})\/(\d{1,2})\/(\d{1,2})(?!\d)/g)) exact(`${m[1]}-${pad(Number(m[2]))}-${pad(Number(m[3]))}`, m[0]);
  // "on the 12th", "the 5th of this month": that day this month or last ("the 3rd attempt" is not a date)
  for (const m of t.matchAll(/\b(?:on|by|since) the (\d{1,2})(?:st|nd|rd|th)\b(?! of(?! (?:this|last) month))|\bthe (\d{1,2})(?:st|nd|rd|th) of (?:this|last) month\b/g)) {
    m[1] ??= m[2];
    const d = Number(m[1]), mo = Number(today.slice(5, 7)) - 1;
    for (const [y, mm] of [[year, mo], mo === 0 ? [year - 1, 11] : [year, mo - 1]] as const) if (d <= lastDay(y, mm)) exact(`${y}-${pad(mm + 1)}-${pad(d)}`, m[0]);
  }
  // a year on its own ("in 2025", "last year", "this year"): the whole year
  for (const m of t.matchAll(/\b(?:in|during|since|throughout) (\d{4})\b(?! ?ms\b)/g)) {
    const y = Number(m[1]);
    if (y >= year - 40 && y <= year) out.push({ from: `${y}-01-01`, to: y === year ? today : `${y}-12-31`, why: m[0] });
  }
  if (/\blast year\b/.test(t)) out.push({ from: `${year - 1}-01-01`, to: `${year - 1}-12-31`, why: 'last year' });
  if (/\bthis year\b/.test(t)) out.push({ from: `${year}-01-01`, to: today, why: 'this year' });

  // relative dates, against today
  if (/\b(today|tonight|this (morning|afternoon|evening)|earlier today|just now)\b/.test(t)) exact(today, 'today');
  if (/\b(yesterday|last night)\b/.test(t)) exact(addDays(today, -1), 'yesterday');
  if (/\b(day before yesterday)\b/.test(t)) exact(addDays(today, -2), 'the day before yesterday');
  for (const m of t.matchAll(/\b(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|couple|few)(?: of)? (day|week|month)s? ago\b/g)) {
    const n = NUMBER_WORDS[m[1]!] ?? Number(m[1]);
    const unit = m[2] === 'day' ? 1 : m[2] === 'week' ? 7 : 30;
    const slack = unit === 1 ? 0 : unit === 7 ? 3 : 10;
    out.push({ from: addDays(today, -n * unit - slack), to: addDays(today, Math.min(0, -n * unit + slack)), why: m[0] });
  }
  for (const [i, day] of WEEKDAYS.entries()) {
    // Tuesday in any case; an abbreviation (Tue, Tues, Thurs, Weds…) only capitalised or with a full stop, since
    // "sat with", "sun-themed" and "the mon dashboard" are words
    const abbrev = { sunday: 'Sun', monday: 'Mon', tuesday: 'Tues?', wednesday: 'Weds?', thursday: 'Thu(?:rs?)?', friday: 'Fri', saturday: 'Sat' }[day]!;
    if (!new RegExp(`\\b${day}s?\\b`).test(t) && !new RegExp(`\\b${abbrev}\\b(?![\\p{L}-])`, 'u').test(text) && !new RegExp(`\\b${abbrev.toLowerCase()}\\.|\\b(?:last|on|this|since|by) ${abbrev.toLowerCase()}\\b`).test(t)) continue;
    // the last two weeks' worth of that weekday ("on Tuesday", "last Tuesday")
    for (let back = 0; back <= 14; back++) {
      const iso = addDays(today, -back);
      if (dayOf(iso).getUTCDay() === i) exact(iso, day);
    }
  }
  if (/\b(this|last|past) week\b/.test(t)) out.push({ from: addDays(today, -13), to: today, why: 'last week' });
  if (/\b(this|last|past) month\b/.test(t)) {
    const y = year, mo = Number(today.slice(5, 7)) - 1;
    const prev = mo === 0 ? { y: y - 1, m: 11 } : { y, m: mo - 1 };
    out.push({ from: `${prev.y}-${pad(prev.m + 1)}-01`, to: today, why: 'last month' });
  }
  return out;
}

const within = (iso: string, ranges: DateRange[]) => ranges.some((r) => iso >= r.from && iso <= r.to);

// ---------------------------------------------------------------- the answer, checked

const NULLISH = /^(null|none|n\/a|na|nil|undefined|unknown|-+)$/i;

/** A string field, trimmed; null for empty or a model's "null". */
function str(v: string | null | undefined): string | null {
  const s = (v ?? '').replace(/\s+\n/g, '\n').trim();
  return !s || NULLISH.test(s) ? null : s;
}

/** Clip to `max` characters at a word boundary, without inventing an ellipsis. */
export function clip(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max + 1);
  const at = cut.lastIndexOf(' ');
  return (at > max * 0.6 ? cut.slice(0, at) : s.slice(0, max)).replace(/[\s,;:–-]+$/, '');
}

const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();

// Number words a model reaches for when it rounds up an outcome ("three weeks", "doubled"). "one" is left out: it's
// mostly not a quantity ("one of the services").
const NUMBER_WORD = /\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundreds?|thousands?|millions?|billions?|dozens?|double[ds]?|doubling|triple[ds]?|tripling|quadrupled?|half|halved|halving|twice|thrice)\b/gi;

/** Words a sentence opens with that aren't names: irregular past tenses, pronouns, articles, connectives. */
const OPENER =
  /^(?:I|A|An|The|This|That|These|Those|It|Its|My|Our|We|They|He|She|Their|His|Her|After|Before|When|While|With|Without|Then|Also|Both|All|Every|Each|Some|Most|New|First|Second|Last|Next|Now|Once|Over|Under|From|For|To|In|On|At|By|As|So|But|And|Or|No|Not|Only|Just|Still|Already|Again|Thanks|Thank|Kudos|Huge|Big|Great|Took|Led|Ran|Wrote|Rewrote|Built|Rebuilt|Made|Got|Gave|Cut|Set|Kept|Won|Brought|Found|Taught|Bought|Sent|Spent|Held|Met|Paid|Put|Read|Saw|Said|Told|Thought|Began|Became|Broke|Chose|Drew|Drove|Fed|Fought|Flew|Forgot|Grew|Hit|Hid|Knew|Left|Lent|Let|Lost|Meant|Overcame|Oversaw|Rode|Rose|Shot|Shut|Sold|Split|Spoke|Spun|Stood|Struck|Swept|Swam|Threw|Understood|Undertook|Upheld|Woke|Wore|Withdrew|Help|Helps|Fix|Fixes|Ship|Ships|Move|Moves|Add|Adds|Cut|Make|Makes|Build|Builds|Run|Runs|Lead|Leads|Improve|Improves|Reduce|Reduces|Speed|Speeds)$/;

const WORD_VALUE: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000, million: 1_000_000, billion: 1_000_000_000, dozen: 12, twice: 2, thrice: 3 };

/** Is flagged run `w` not a name after all: its words are all in the sources (any case, any order), or it is a sentence's first word plus words that are? */
function notReallyAName(output: string, w: string, sources: string[]): boolean {
  const parts = w.split(/\s+/).map((p) => p.replace(/['’]s$/, ''));
  // only a run of capitalised words can be a name: a number, an amount or a date flagged by grounding stays flagged
  if (parts.length < 2 || !parts.every((p) => /^\p{Lu}[\p{L}'’-]*$/u.test(p))) return false;
  const hay0 = sources.join('\n').toLowerCase();
  const inText = (p: string) => new RegExp(`(?<![\\p{L}\\p{N}])${p.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'u').test(hay0);
  // every word is in your text, just not capitalised or not together ("Sam's Docker" from "sam … his docker")
  if (parts.every(inText)) return true;
  const at = output.indexOf(w);
  if (at < 0 || !/(^|[.!?:;]\s+|\n\s*)$/.test(output.slice(0, at))) return false;
  const hay = sources.join('\n').toLowerCase();
  return parts.slice(1).every((p) => new RegExp(`(?<![\\p{L}\\p{N}])${p.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'u').test(hay));
}

/**
 * What shared/ai/grounding.ts doesn't catch, for tidy (D78): a lone capitalised word that isn't starting a sentence
 * ("for Stripe", "with Priya"), and number words. Each counts as grounded if it appears in a source as a word. Leans
 * toward flagging, as grounding does: a false flag costs a glance.
 */
export function inventedWords(output: string, sources: string[]): string[] {
  const hay = sources.join('\n').toLowerCase();
  const digits = new Set([...hay.matchAll(/\d+/g)].map((m) => Number(m[0])));
  const has = (w: string) => new RegExp(`(?<![\\p{L}\\p{N}])${w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'u').test(hay);
  const out: string[] = [];
  for (const m of output.matchAll(/[\p{L}][\p{L}\p{N}'’-]*/gu)) {
    // anything with a digit in it ("INC-2291", "v2") is grounding's to check, whole
    if (/\d/.test(m[0])) continue;
    const w = m[0].replace(/['’]s$/, '').replace(/[-'’]+$/, '');
    if (!/^\p{Lu}/u.test(w) || w === 'I' || /^I['’]/.test(w)) continue;
    if (new RegExp(`^(?:${NUMBER_WORD.source.replace(/^\\b\(|\)\\b$/g, '')})$`, 'i').test(w)) continue; // the number check below decides
    const before = output.slice(0, m.index);
    // a sentence's first word is usually a verb ("Shipped", "Led"), but a title can open with a name ("Stripe
    // migration"): flag it unless it looks like a verb or a common opener
    if (/(^|[.!?:;]\s+|\n\s*|["“(]\s*)$/.test(before) && (OPENER.test(w) || /(?:ed|ing)$/i.test(w))) continue;
    if (!has(w)) out.push(w);
  }
  // "three" is grounded by a 3 in the text
  for (const m of output.matchAll(NUMBER_WORD)) if (!has(m[0]) && !(WORD_VALUE[m[0].toLowerCase()] !== undefined && digits.has(WORD_VALUE[m[0].toLowerCase()]!))) out.push(m[0]);
  return out;
}

export interface FinishInput {
  /** The material that was tidied (all parts, as sent). */
  material: string;
  today: string;
  /** The projects the prompt listed. */
  projects: Pick<Project, 'id' | 'name'>[];
  /** The user's own name, role and aliases: theirs, so never "not in your text". */
  own: string[];
}

/** The model's answer → what the board shows: checked, clipped, mapped, and flagged. Pure. */
export function finishTidy(a: TidyAnswer, input: FinishInput): Pick<AiTidyResponse, 'suggestion' | 'ungrounded' | 'dropped'> {
  const dropped: string[] = [];
  const title = oneLine(str(a.title) ?? '').replace(/\.$/, '');
  const summary = oneLine(str(a.summary) ?? '');
  const body = str(a.body);
  const s: AiTidySuggestion = {
    title: clip(title, TIDY_LIMITS.title),
    summary: clip(summary, TIDY_LIMITS.summary),
    body: body ? clip(body, TIDY_LIMITS.body) : null,
    happenedAt: null,
    endedAt: null,
    impact: null,
    impactWhy: null,
    suggestedProjects: [],
    notAnAchievement: str(a.notAnAchievement),
    unclear: str(a.unclear),
  };
  if (s.title.length < title.length) dropped.push(`The title was over ${TIDY_LIMITS.title} characters, so it was shortened.`);
  if (s.summary.length < summary.length) dropped.push(`The summary was over ${TIDY_LIMITS.summary} characters, so it was shortened.`);

  // dates: kept only when the material states them, or a relative date in it resolves to them (D79)
  const ranges = allowedDates(input.material, input.today);
  for (const key of ['happenedAt', 'endedAt'] as const) {
    const v = str(a[key]);
    if (!v) continue;
    if (!validIso(v)) dropped.push(`${key === 'happenedAt' ? 'The date' : 'The end date'} “${v.slice(0, 40)}” wasn’t a date, so it was left out.`);
    else if (!within(v, ranges)) dropped.push(`${key === 'happenedAt' ? 'The date' : 'The end date'} ${v} isn’t in your text, so it was left out.`);
    else s[key] = v;
  }
  if (s.endedAt && (!s.happenedAt || s.endedAt <= s.happenedAt)) {
    if (s.happenedAt) dropped.push(`The end date ${s.endedAt} wasn’t after the start, so it was left out.`);
    else s.happenedAt = s.endedAt; // "finished on the 3rd": one date is when it happened
    s.endedAt = null;
  }

  if (typeof a.impact === 'number' && Number.isFinite(a.impact)) {
    s.impact = Math.min(10, Math.max(1, Math.round(a.impact)));
    s.impactWhy = str(a.impactWhy) ? clip(oneLine(str(a.impactWhy)!), 200) : null;
  }

  // projects by name → your ids; anything else was made up (or misspelt) and goes
  const byName = new Map(input.projects.map((p) => [p.name.trim().toLowerCase(), p.id]));
  for (const raw of a.projects ?? []) {
    const name = String(raw).trim().replace(/^["']|["']$/g, '');
    if (!name || NULLISH.test(name)) continue;
    const id = byName.get(name.toLowerCase());
    if (id) {
      if (!s.suggestedProjects.includes(id)) s.suggestedProjects.push(id);
    } else dropped.push(`“${name.slice(0, 60)}” isn’t one of your projects, so it wasn’t suggested.`);
  }

  // grounding: your text, plus what's yours anyway (your projects' names, your name), plus the dates it allowed
  // the impact scale (its labels and guidance) was in the prompt: a why that quotes it invents nothing
  const sources = [input.material, ...input.projects.map((p) => p.name), ...input.own.filter(Boolean), ...IMPACT_SCALE.flatMap((l) => [l.label, l.guidance]), ...ranges.filter((r) => r.from === r.to).map((r) => r.from)];
  const ungroundedOut: Partial<Record<AiTidyField, string[]>> = {};
  for (const field of ['title', 'summary', 'body', 'impactWhy'] as const) {
    const v = s[field];
    if (!v) continue;
    // a run that starts a sentence ("Fixed PDF renderer…") is a capitalised verb plus the rest: the rest is the claim
    const words = ungrounded(v, sources).filter((w) => !notReallyAName(v, w, sources));
    // a lone word already inside a flagged run ("Acme Corp") isn't flagged twice
    for (const w of inventedWords(v, sources)) if (!words.some((x) => x.toLowerCase().split(/\s+/).includes(w.toLowerCase()))) words.push(w);
    const uniq = [...new Map(words.map((w) => [w.toLowerCase(), w])).values()];
    if (uniq.length) ungroundedOut[field] = uniq;
  }
  return { suggestion: s, ungrounded: ungroundedOut, dropped };
}

// ---------------------------------------------------------------- gathering, and the call

const RequestSchema = z.strictObject({
  text: z.string().max(200_000).optional(),
  evidenceShas: z.array(z.string().regex(/^[0-9a-f]{64}$/, 'a picture is named by its sha256')).max(20).optional(),
  achievementId: z.string().min(1).max(64).optional(),
  today: z.string().regex(ISO).optional(),
});

/** How long a tidy waits for a picture that's still being read before saying so (`not_read_yet`). Tests shorten it. */
export const TIDY_TIMING = { ocrWaitMs: 8000, pollMs: 250 };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A picture's text: waits a little for a read in progress, then refuses with `not_read_yet`. */
async function pictureText(ctx: AppContext, sha: string, opts: { wait: boolean; signal?: AbortSignal }): Promise<string | null> {
  const deadline = Date.now() + (opts.wait ? TIDY_TIMING.ocrWaitMs : 0);
  for (;;) {
    let st;
    try {
      st = ctx.evidenceText.status(sha);
    } catch {
      throw new TidyRefused(404, 'not_found', 'That picture isn’t in BragDoc any more.');
    }
    if (st.status === 'done') return st.text ?? '';
    if (st.status === 'none') throw new TidyRefused(400, 'not_a_picture', 'Only a picture’s text can be tidied, not a PDF’s or a file’s.');
    if (st.status === 'failed') {
      if (!opts.wait) return null;
      throw new TidyRefused(409, 'not_readable', 'BragDoc couldn’t read the text in that picture, so there’s nothing of it to tidy.');
    }
    if (Date.now() >= deadline || opts.signal?.aborted) {
      if (!opts.wait) return null;
      throw new TidyRefused(409, 'not_read_yet', 'The picture’s text is still being read. Try again in a moment.');
    }
    await sleep(TIDY_TIMING.pollMs);
  }
}

export interface Gathered {
  parts: TidyPart[];
  material: string;
  today: string;
}

/** The request → the parts to tidy, the material as sent, and today. Throws TidyRefused (400/404/409). */
export async function gatherTidy(ctx: AppContext, raw: unknown, signal?: AbortSignal): Promise<Gathered> {
  const r = RequestSchema.safeParse(raw);
  if (!r.success) {
    const i = r.error.issues[0]!;
    throw new TidyRefused(400, 'bad_request', `${i.path.join('.') || 'the request'}: ${i.message}`);
  }
  const req: AiTidyRequest = r.data;
  const parts: TidyPart[] = [];
  if (req.achievementId) {
    const a = ctx.store.get('achievement', req.achievementId) as Achievement | undefined;
    if (!a) throw new TidyRefused(404, 'not_found', 'That achievement isn’t on the board any more.');
    parts.push({ label: 'title', text: a.title }, { label: 'summary', text: a.summary ?? '' }, { label: 'notes', text: a.body ?? '' });
    for (const e of a.evidence) {
      if (e.kind === 'quote' && e.quote) parts.push({ label: 'quote', text: e.quote.text, ...(e.quote.from ? { from: e.quote.from } : {}), ...(e.quote.where ? { where: e.quote.where } : {}) });
      // its pictures add their text if it's been read; an achievement's tidy doesn't wait for one
      if (e.kind === 'image' && e.blob) {
        const t = await pictureText(ctx, e.blob, { wait: false, signal }).catch(() => null);
        if (t) parts.push({ label: 'picture', text: t });
      }
    }
  }
  if (req.text?.trim()) parts.push({ label: 'pasted', text: req.text });
  for (const sha of new Set(req.evidenceShas ?? [])) {
    const t = await pictureText(ctx, sha, { wait: true, signal });
    if (t?.trim()) parts.push({ label: 'picture', text: t });
  }
  const material = tidyMaterial(parts);
  if (!material.trim())
    throw new TidyRefused(400, 'empty', req.evidenceShas?.length && !req.text?.trim() ? 'There are no words in that picture to tidy.' : 'There’s nothing to tidy yet: paste or type something first.');
  const chars = parts.reduce((n, p) => n + p.text.trim().length, 0);
  if (chars > TIDY_MAX_CHARS)
    throw new TidyRefused(400, 'too_long', `That’s ${chars.toLocaleString('en-US')} characters, and Tidy takes up to ${TIDY_MAX_CHARS.toLocaleString('en-US')}. Tidy the part that matters, or trim it first.`);
  const serverToday = localToday(ctx.store.now(), ctx.store.profile()?.timezone);
  // the browser's day, if it's a plausible one: a tidy at 00:30 means today where the user is
  const today = req.today && Math.abs(dayOf(req.today).getTime() - dayOf(serverToday).getTime()) <= 2 * DAY_MS ? req.today : serverToday;
  return { parts, material, today };
}

/** The projects a tidy may suggest: not archived, newest first, by name (never ids in the prompt). */
export function tidyProjects(ctx: AppContext): Pick<Project, 'id' | 'name'>[] {
  return (ctx.store.all('project') as Project[])
    .filter((p) => p.status !== 'archived')
    .sort((a, b) => (a.start < b.start ? 1 : -1))
    .slice(0, 60)
    .map((p) => ({ id: p.id, name: p.name }));
}

/** The prompt for these parts (or a placeholder, for the preview). */
export function buildTidyPrompt(ctx: AppContext, material: string, today: string): { system: string; prompt: string } {
  const p = ctx.store.profile();
  return tidyPrompt({ text: material, today, name: p?.name ?? null, role: p?.role ?? null, projects: tidyProjects(ctx).map((x) => x.name), style: ctx.services.instructions.forPrompt('style') });
}

/** One tidy: gate, gather, ask, check. Throws AiError (the gates, the model's failures) or TidyRefused. */
export async function runTidy(ctx: AppContext, raw: unknown, signal?: AbortSignal): Promise<AiTidyResponse> {
  const { gate } = ctx.ai.readiness('tidy');
  if (gate) throw new AiError(gate.code, gate.message);
  const g = await gatherTidy(ctx, raw, signal);
  const { system, prompt } = buildTidyPrompt(ctx, g.material, g.today);
  const r = await ctx.ai.object({ feature: 'tidy', purpose: 'ai.tidy', schema: TidyAnswerSchema, schemaName: TIDY_SCHEMA_NAME, system, prompt, ...(signal ? { signal } : {}), maxOutputTokens: 1200 });
  const p = ctx.store.profile();
  const done = finishTidy(r.object, { material: g.material, today: g.today, projects: tidyProjects(ctx), own: [p?.name ?? '', p?.role ?? '', ...(p?.aliases ?? [])] });
  return { ...done, model: r.model, where: r.where, ms: r.ms, chars: g.parts.reduce((n, x) => n + x.text.trim().length, 0) };
}
