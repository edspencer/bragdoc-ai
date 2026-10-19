// What the judge reads (SPEC R21, D72): a Found candidate turned into plain text a model can judge. Pure: the caller
// (judge/index.ts) does the I/O (re-reading the picture through ctx.ocr) and hands the text in.
//
// - **A screenshot:** its OCR text, split into messages at author lines the way the rules split it
//   (shared/rules/screenshot.ts compileMessages). The user's own messages are marked "(the user)" and `notMe` names
//   "(not the user)", so a model can't take your praise of someone else, or praise for "Alex P", as your win (the
//   spike's biggest prompt fix). The message the rules matched is labelled as the one to judge; the rest are context,
//   nearest first, until the budget runs out. With the picture gone, the quote the rules kept is the whole input.
// - **A merged PR:** repo, title, merge date and the first 2,000 characters of its description, HTML comments removed.
//
// Never a path, a file name, an id or a URL of this machine: what's here is what a cloud model would be sent.
import { isVerbatim, normaliseForMatch } from '../../../shared/ai/grounding.js';
import { compileMessages, type RulesProfile, type ScreenMessage } from '../../../shared/rules/screenshot.js';

/** How much of a PR's description the judge reads. */
export const GITHUB_BODY_MAX = 2000;
/** The fewest characters of input any budget allows: below this a model can't judge anything anyway. */
export const MIN_INPUT_CHARS = 600;

export interface JudgeInput {
  /** The text the prompt puts between its markers. */
  text: string;
  /** What it was made from: the picture read again, the stored quote (the picture is gone), or a PR. */
  from: 'ocr' | 'quote' | 'github';
  /** The words the judge's `quote` must come from (the message to judge; for a PR, the whole input). */
  target: string;
  /** Who wrote the message to judge, as the screenshot shows it (or the rules kept it): what `from` must be. */
  author?: string;
  /** Context was left out, or the message cut, to fit the budget. */
  truncated: boolean;
}

export interface QuoteIn {
  text: string;
  from?: string;
  where?: string;
}

/** Cut `s` to `max` characters at a word, with an ellipsis. */
export function cut(s: string, max: number): string {
  if (s.length <= max) return s;
  const head = s.slice(0, Math.max(1, max - 1));
  const at = head.lastIndexOf(' ');
  return `${(at > max * 0.6 ? head.slice(0, at) : head).trimEnd()}…`;
}

/** `notMe` names inside a message, marked where they appear: "thanks Alex P (not the user)". */
function markNotMe(text: string, notMe: readonly string[]): string {
  const names = notMe.map((n) => n.trim()).filter((n) => n.length >= 2).sort((a, b) => b.length - a.length);
  if (!names.length) return text;
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?<![\\p{L}\\p{N}_])@?(?:${names.map(esc).join('|')})(?![\\p{L}\\p{N}_])(?! \\(not the user\\))`, 'giu');
  return text.replace(re, (m) => `${m} (not the user)`);
}

function who(m: ScreenMessage): string {
  if (!m.author) return '(no name shown)';
  return `${m.author}${m.own ? ' (the user)' : m.notMe ? ' (not the user)' : m.bot ? ' (a bot)' : ''}`;
}

/** Which message the rules matched: the one holding their quote, else the one sharing the most of its words. */
export function findTarget(messages: ScreenMessage[], quote: string | null): number {
  if (!messages.length) return -1;
  if (!quote?.trim()) return messages.length - 1;
  const exact = messages.findIndex((m) => isVerbatim(quote, m.text));
  if (exact >= 0) return exact;
  const words = new Set(normaliseForMatch(quote).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2));
  let best = -1;
  let score = 0;
  messages.forEach((m, i) => {
    const s = normaliseForMatch(m.text).split(/[^\p{L}\p{N}]+/u).filter((w) => words.has(w)).length;
    if (s > score) [best, score] = [i, s];
  });
  return best >= 0 ? best : messages.length - 1;
}

/**
 * A screenshot candidate's input. `ocrText`: the picture read again (null when it's gone, or no longer the picture that
 * passed); `quote`: what the rules kept, on the candidate; `maxChars`: the budget for the whole input.
 */
export function screenshotInput({ ocrText, quote, profile, maxChars }: { ocrText: string | null; quote: QuoteIn | null; profile: RulesProfile; maxChars: number }): JudgeInput {
  const budget = Math.max(MIN_INPUT_CHARS, maxChars);
  const notMe = profile.notMe ?? [];
  const messages = ocrText?.trim() ? compileMessages(profile)(ocrText) : [];
  if (!messages.length) {
    // the picture is gone (or had no text): the stored quote is all there is
    const text = quote?.text.trim() ?? '';
    const head = `The message to judge${quote?.where ? `, in ${quote.where}` : ''}:`;
    const body = cut(markNotMe(text, notMe), budget - head.length - 60);
    const line = `  ${quote?.from ? `${quote.from}: ` : ''}${body}`;
    return { text: `${head}\n${line}`, from: 'quote', target: text, ...(quote?.from ? { author: quote.from } : {}), truncated: body.length < text.length };
  }

  const where = quote?.where ? `, in ${quote.where}` : '';
  const i = findTarget(messages, quote?.text ?? null);
  const target = messages[i]!;
  // no author lines (a document, a page): one block of text; the rules' quote is the part to judge, the rest context
  if (messages.length === 1 && !target.author && quote?.text && normaliseForMatch(quote.text).length < normaliseForMatch(target.text).length * 0.8) {
    const part = cut(markNotMe(quote.text.trim(), notMe), Math.floor(budget * 0.4));
    const rest = cut(markNotMe(target.text, notMe), budget - part.length - 140);
    return {
      text: `Text in the screenshot, for context only:\n  ${rest}\n\nThe part to judge${where}:\n  ${part}`,
      from: 'ocr',
      target: quote.text.trim(),
      ...(quote.from ? { author: quote.from } : {}),
      truncated: rest.length < target.text.length || part.length < quote.text.trim().length,
    };
  }

  const judged = `  ${who(target)}: ${markNotMe(target.text, notMe)}`;
  const own = cut(judged, budget - 120);
  let left = budget - own.length - 160;
  let truncated = own.length < judged.length;
  const before: string[] = [];
  const after: string[] = [];
  // nearest first, earlier before later at the same distance (a thread's context comes before its reply)
  for (let d = 1; d < messages.length; d++) {
    for (const [j, list, front] of [
      [i - d, before, true],
      [i + d, after, false],
    ] as const) {
      const m = messages[j];
      if (!m) continue;
      const line = `  ${who(m)}: ${markNotMe(m.text, notMe)}`;
      if (line.length + 1 > left) {
        truncated = true;
        continue;
      }
      left -= line.length + 1;
      if (front) list.unshift(line);
      else list.push(line);
    }
  }
  const parts = [
    ...(before.length ? ['Earlier messages on screen, for context only:', ...before, ''] : []),
    `The message to judge${where}:`,
    own,
    ...(after.length ? ['', 'Later messages on screen, for context only:', ...after] : []),
  ];
  return { text: parts.join('\n'), from: 'ocr', target: target.text, ...(target.author ? { author: target.author } : {}), truncated };
}

/** HTML comments (PR templates' hidden instructions) out, whitespace tidied. */
export const stripComments = (s: string) => s.replace(/<!--[\s\S]*?(?:-->|$)/g, '').replace(/\n{3,}/g, '\n\n').trim();

/** A merged PR's input: repo, title, merge date, and the start of its description. */
export function githubInput({ repo, title, body, mergedAt }: { repo: string | null; title: string; body?: string | null; mergedAt: string }): JudgeInput {
  const desc = body ? stripComments(body) : '';
  const shown = desc.length > GITHUB_BODY_MAX ? `${desc.slice(0, GITHUB_BODY_MAX).trimEnd()}…` : desc;
  const text = [
    ...(repo ? [`Repository: ${repo}`] : []),
    `Title: ${title.trim()}`,
    `Merged: ${mergedAt}`,
    shown ? `Description:\n${shown}` : 'Description: (none)',
  ].join('\n');
  return { text, from: 'github', target: text, truncated: shown.length < desc.length };
}

/** Characters per token assumed: English is about four, but OCR text, names, numbers and emoji tokenise worse. */
export const CHARS_PER_TOKEN = 2.5;

/**
 * The characters of input a connection's context can take, after the system prompt and room for the answer. Ollama
 * cuts an over-long prompt silently, from the front (the system prompt, and its fence), so this leans small. Null when
 * the system prompt alone (a long ai/what-counts.md) leaves no room for any input: nothing should be sent.
 */
export function inputBudget({ contextTokens, systemChars, answerTokens = 500 }: { contextTokens: number; systemChars: number; answerTokens?: number }): number | null {
  const room = Math.floor((contextTokens - answerTokens) * CHARS_PER_TOKEN) - systemChars - 300;
  return room < MIN_INPUT_CHARS ? null : Math.min(24_000, room);
}
