// Folio "Draft with AI" (SPEC R24, D80): checking a draft against what it was made from. Pure and dependency-free
// (shared/ runs in the browser too). The draft is a suggestion: every claim in it should trace to a clipping the user
// picked. So, line by line:
// - a bullet must cite its clippings (`[3]`, `[3, 5]`, `[3][5]`); one that doesn't is `uncited`;
// - a `[n]` with no clipping n is a `badCitation`;
// - any number, amount, date or capitalised name in a line that isn't in the clippings it cites (or, for a line citing
//   nothing, in any clipping), nor in the context the model was given (the person, the window, the projects and
//   companies, the note), is `ungrounded` (shared/ai/grounding.ts, which leans toward flagging);
// - a filler phrase ("passionate about", "went above and beyond") the user's own material doesn't use is `filler`.
// Headings are themes the model names, so only their numbers and dates are checked.
import type { AiDraftCheck, AiDraftFlag } from '../api.js';
import { normaliseForMatch, ungrounded } from './grounding.js';

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

/** Text without its citations (their digits aren't facts). */
const uncite = (text: string) => text.replace(CITE, ' ');

/** The download's file name for a draft: `bragdoc-draft-<from>-<to>.md`. */
export const draftExportName = (f: { from: string; to: string }) => `bragdoc-draft-${f.from}-${f.to}.md`;

interface Block {
  kind: 'bullet' | 'heading' | 'text';
  line: number;
  text: string;
}

/** The draft as blocks: a bullet with its indented continuation lines, a heading, or a line of text. */
function blocks(draft: string): Block[] {
  const out: Block[] = [];
  let fenced = false;
  draft.split(/\r?\n/).forEach((raw, i) => {
    const line = i + 1;
    if (/^\s*(```|~~~)/.test(raw)) {
      fenced = !fenced;
      return;
    }
    if (fenced || !raw.trim()) return;
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

/** `needle` (normalised) occurs in `hay` (normalised) as whole words. */
function hasWords(hay: string, needle: string): boolean {
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'u');
  return re.test(hay);
}

/** Check a draft against its sources (see the top of this file). Flags are in line order. */
export function checkDraft(draft: string, src: DraftSources): AiDraftCheck {
  const check: AiDraftCheck = { ungrounded: [], uncited: [], filler: [], badCitations: [] };
  const all = [...src.clippings, ...src.context];
  const material = normaliseForMatch(all.join('\n'));
  const fillers = DRAFT_FILLER.filter((p) => !hasWords(material, p));
  const push = (list: AiDraftFlag[], line: number, text: string) => {
    if (!list.some((f) => f.line === line && f.text === text)) list.push({ line, text });
  };

  for (const b of blocks(draft)) {
    const cited = citations(b.text);
    const valid = cited.filter((n) => n >= 1 && n <= src.clippings.length);
    for (const n of cited) if (!valid.includes(n)) push(check.badCitations, b.line, `[${n}]`);
    if (b.kind === 'bullet' && !cited.length) push(check.uncited, b.line, b.text.split('\n')[0]!.trim().slice(0, 120));

    const text = uncite(b.text);
    // a line's facts must be in what it cites; a line citing nothing (an opening paragraph) is checked against it all
    const sources = valid.length ? [...valid.map((n) => src.clippings[n - 1]!), ...src.context] : all;
    const hay = sources.map((s) => normaliseForMatch(s));
    const appears = (s: string) => hay.some((h) => hasWords(h, normaliseForMatch(s)));
    for (const fact of ungrounded(text, sources)) {
      if (b.kind === 'heading' && !/\d/.test(fact)) continue;
      if (verbLed(fact, text, appears)) continue;
      push(check.ungrounded, b.line, fact);
    }

    const norm = normaliseForMatch(text);
    for (const p of fillers) if (hasWords(norm, p)) push(check.filler, b.line, p);
  }
  return check;
}

/** How many flags, all told. */
export const flagCount = (c: AiDraftCheck) => c.ungrounded.length + c.uncited.length + c.filler.length + c.badCitations.length;
