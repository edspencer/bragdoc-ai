// Folio "Draft with AI" (SPEC R24, D80): checking a draft against what it was made from. Pure and dependency-free
// (shared/ runs in the browser too). The draft is a suggestion: every claim in it should trace to a clipping the user
// picked. So, line by line:
// - a bullet must cite its clippings (`[3]`, `[3, 5]`, `[3][5]`); one that doesn't is `uncited`, as is a paragraph
//   under a heading (a model that writes prose instead of bullets still has to say where each claim came from; only
//   the opening, before the first heading, may cite nothing);
// - a `[n]` with no clipping n is a `badCitation`;
// - any number, amount, date or capitalised name in a line that isn't in the clippings it cites (or, for a line citing
//   nothing, in any clipping), nor in the context the model was given (the person, the window, the projects and
//   companies, the note), is `ungrounded` (shared/ai/grounding.ts, which leans toward flagging);
// - a filler phrase ("passionate about", "went above and beyond") the user's own material doesn't use is `filler`.
// Headings are themes the model names, so only their numbers and dates are checked.
import type { AiDraftCheck, AiDraftFlag } from '../api.js';
import { groundingIndex, joinIndexes, normaliseForMatch, ungrounded, type GroundingIndex } from './grounding.js';

/** What a draft is checked against. `clippings[n - 1]` is clipping n's text exactly as it was sent. */
export interface DraftSources {
  clippings: string[];
  /** Everything else the model was told that may be stated as fact: names, the window, the note. */
  context: string[];
}

/**
 * Phrases a self-review is better without (SPEC R24's "no fluff"): praise of oneself in place of what happened, and
 * vague intensifiers in place of a number. Lower case; matched as whole words, any case. Kept small on purpose: each one
 * is a flag the user has to look at.
 */
export const DRAFT_FILLER: readonly string[] = [
  'passionate about',
  'above and beyond',
  'team player',
  'results-driven',
  'results driven',
  'go-getter',
  'self-starter',
  'synergy',
  'synergies',
  'thought leader',
  'thought leadership',
  'game changer',
  'game-changer',
  'world-class',
  'best-in-class',
  'cutting-edge',
  'rockstar',
  'ninja',
  'tirelessly',
  'seamlessly',
  'move the needle',
  'moved the needle',
  'hit the ground running',
  'paradigm shift',
  'value-add',
  'wore many hats',
  'spearheaded',
  'leveraged',
  'significantly',
  'dramatically',
  'massively',
  'hugely',
  'incredibly',
  'extremely',
  'invaluable',
  'instrumental in',
  'key contributor',
  'successfully',
];

/** `[3]`, `[3, 5]`, `[3,5,8]`: a citation of clippings by number. */
const CITE = /\[(\d{1,4}(?:\s*,\s*\d{1,4})*)\]/g;
const BULLET = /^\s{0,3}(?:[-*+]|\d{1,3}[.)])\s+/;
const HEADING = /^\s{0,3}#{1,6}\s+/;

/** The clipping numbers a piece of text cites, in order, once each. */
export function citations(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(CITE)) for (const n of m[1]!.split(',').map((s) => Number(s.trim()))) if (!out.includes(n)) out.push(n);
  return out;
}

/**
 * A number glued to its unit ("410ms", "2.4s") spaced as the clippings usually write it ("410 ms"): the same fact, so
 * not a flag. Magnitudes (`41k`) and multipliers (`3x`) are the grounding check's own business.
 */
const spaceUnits = (s: string) => s.replace(/(\d)(ms|s|secs?|mins?|hrs?|h|kb|mb|gb|tb|px|pp)(?![\p{L}\p{N}])/giu, '$1 $2');

/** Text without its citations (their digits aren't facts). */
const uncite = (text: string) => text.replace(CITE, ' ');

/** The download's file name for a draft: `bragdoc-draft-<from>-<to>.md`. */
export const draftExportName = (f: { from: string; to: string }) => `bragdoc-draft-${f.from}-${f.to}.md`;

interface Block {
  kind: 'bullet' | 'heading' | 'text';
  line: number;
  text: string;
}

/** The most lines a check reads: past this a draft is a document, not a self-review, and the server has other work. */
export const CHECK_MAX_LINES = 2000;

/**
 * The draft as blocks: a bullet with its indented continuation lines, a heading, or a line of text. Fence lines are
 * skipped, but what's between them is checked like anything else (a claim in a code block is still a claim).
 */
function blocks(draft: string): Block[] {
  const out: Block[] = [];
  draft
    .split(/\r?\n/)
    .slice(0, CHECK_MAX_LINES)
    .forEach((raw, i) => {
      const line = i + 1;
      if (/^\s*(```|~~~)/.test(raw) || !raw.trim()) return;
      if (HEADING.test(raw)) out.push({ kind: 'heading', line, text: raw.replace(HEADING, '') });
      else if (BULLET.test(raw)) out.push({ kind: 'bullet', line, text: raw.replace(BULLET, '') });
      else {
        const prev = out.at(-1);
        // an indented line straight after a bullet continues it (a wrapped bullet, or one written over two lines)
        if (prev?.kind === 'bullet' && /^\s{2,}\S/.test(raw) && prev.line + countLines(prev.text) === line) prev.text += `\n${raw.trim()}`;
        else out.push({ kind: 'text', line, text: raw.replace(/^\s*>\s?/, '') });
      }
    });
  return out;
}
const countLines = (s: string) => s.split('\n').length;

/**
 * A capitalised run the grounding check flagged that only starts with an ordinary capitalised word: "Shipped Preflight"
 * at the start of a bullet is the verb, then the project. Grounded if the rest is.
 */
function verbLed(flag: string, text: string, appears: (s: string) => boolean): boolean {
  const words = flag.split(/\s+/);
  if (words.length < 2 || /\d/.test(flag)) return false;
  const at = text.indexOf(flag);
  if (at < 0 || !/(^|[.!?:;]\s+|\*\*|^\W*)$/.test(text.slice(0, at))) return false;
  return appears(words.slice(1).join(' '));
}

/** A whole-words matcher for `needle` (normalised), compiled once. */
const wordsRe = (needle: string) => new RegExp(`(?<![\\p{L}\\p{N}])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'u');
const FILLER_RES = DRAFT_FILLER.map((p) => [p, wordsRe(p)] as const);
const containsWords = (hay: string, needle: string) => wordsRe(needle).test(hay);

/**
 * Check a draft against its sources (see the top of this file). Flags are in line order. Each source is normalised
 * and indexed once per check, not once per line: a check runs again after every pause in typing, on a long draft.
 */
export function checkDraft(draft: string, src: DraftSources): AiDraftCheck {
  const check: AiDraftCheck = { ungrounded: [], uncited: [], filler: [], badCitations: [] };
  const clippings = src.clippings.map(spaceUnits);
  const context = src.context.map(spaceUnits);
  const clipIx = clippings.map((c) => groundingIndex(c));
  const contextIx = groundingIndex(context);
  const allIx = joinIndexes(...clipIx, contextIx);
  const joined = new Map<string, GroundingIndex>();
  const material = allIx.haystacks.join('\n');
  const fillers = FILLER_RES.filter(([, re]) => !re.test(material));
  const seen = new Set<string>();
  const push = (list: AiDraftFlag[], kind: string, line: number, text: string) => {
    const k = `${kind}\0${line}\0${text}`;
    if (seen.has(k)) return;
    seen.add(k);
    list.push({ line, text });
  };

  let headed = false;
  for (const b of blocks(draft)) {
    if (b.kind === 'heading') headed = true;
    const cited = citations(b.text);
    const valid = cited.filter((n) => n >= 1 && n <= clippings.length);
    for (const n of cited) if (!valid.includes(n)) push(check.badCitations, 'bad', b.line, `[${n}]`);
    if ((b.kind === 'bullet' || (b.kind === 'text' && headed)) && !cited.length) push(check.uncited, 'uncited', b.line, b.text.split('\n')[0]!.trim().slice(0, 120));

    const text = spaceUnits(uncite(b.text));
    // a line's facts must be in what it cites; a line citing nothing (an opening paragraph) is checked against it all
    let ix = allIx;
    if (valid.length) {
      const key = [...valid].sort((x, y) => x - y).join(',');
      ix = joined.get(key) ?? joinIndexes(...valid.map((n) => clipIx[n - 1]!), contextIx);
      joined.set(key, ix);
    }
    const appears = (s: string) => ix.haystacks.some((h) => containsWords(h, normaliseForMatch(s)));
    for (const fact of ungrounded(text, ix)) {
      if (b.kind === 'heading' && !/\d/.test(fact)) continue;
      if (verbLed(fact, text, appears)) continue;
      push(check.ungrounded, 'ungrounded', b.line, fact);
    }

    const norm = normaliseForMatch(text);
    for (const [p, re] of fillers) if (re.test(norm)) push(check.filler, 'filler', b.line, p);
  }
  return check;
}

/** How many flags, all told. */
export const flagCount = (c: AiDraftCheck) => c.ungrounded.length + c.uncited.length + c.filler.length + c.badCitations.length;
