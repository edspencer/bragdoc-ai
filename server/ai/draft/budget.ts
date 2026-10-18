// How much of a folio fits in one draft (SPEC R24, D81). A model reads a fixed number of tokens (its connection's
// contextTokens: 8192 by default for a local runner, 30k for a cloud one), and that has to hold the instructions, the
// clippings and the answer. Past it, Ollama silently drops the start of the prompt and a cloud model refuses, so the
// budget is worked out here, before anything is sent: the clippings go in best first, and the lowest-impact ones that
// don't fit are left out and counted, for the page to say so ("12 lower-impact items weren't sent").
//
// Tokens are estimated, not counted: no tokenizer is bundled (each model has its own). The estimate is deliberately
// high, so a folio that fits by the estimate fits: about 3.5 characters a token for ASCII (English averages nearer
// 4), and a token for every other character (CJK, emoji and accented text take one or more each).

/** Estimated tokens in a piece of text. */
export function estimateTokens(s: string): number {
  let other = 0;
  for (const ch of s) if (ch.charCodeAt(0) > 127) other++;
  return Math.ceil((s.length - other) / 3.5) + other;
}

/** The most of the input budget "How I write" may take: past it, it's cut (and the cut said), so clippings fit. */
export const STYLE_SHARE = 0.2;

/** `style` cut to `maxTokens` by the estimate, or as it is. */
export function capText(s: string, maxTokens: number): { text: string; cut: boolean } {
  if (estimateTokens(s) <= maxTokens) return { text: s, cut: false };
  let lo = 0, hi = s.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (estimateTokens(s.slice(0, mid)) <= maxTokens) lo = mid;
    else hi = mid - 1;
  }
  return { text: `${s.slice(0, lo).trimEnd()}\n… (cut short to fit)`, cut: true };
}

export interface DraftBudget {
  contextTokens: number;
  /** Kept free for the answer (and sent as its cap, `maxOutputTokens`). */
  answerTokens: number;
  /** What the system prompt, the prompt and its clippings may use together. */
  inputTokens: number;
}

/** A quarter of the context for the answer, between 1,024 and 4,096 tokens; the rest for the input. */
export function draftBudget(contextTokens: number): DraftBudget {
  const answerTokens = Math.min(4096, Math.max(1024, Math.floor(contextTokens / 4)));
  return { contextTokens, answerTokens, inputTokens: Math.max(0, contextTokens - answerTokens) };
}

/**
 * The most of `items` (best first) that fits: `fixed` is everything but the items (the instructions, the person, the
 * note: with room for the "N were left out" line), `cost(item, i)` one item's tokens as it's sent at position `i`.
 * What doesn't fit is the end of the list: the lowest impact, then the oldest. Stops at the first item that doesn't
 * fit rather than skipping to a smaller one further down, so what's left out is always the lowest-impact tail.
 */
export function fit<T>(items: T[], cost: (item: T, i: number) => number, fixed: number, budget: number): { kept: T[]; omitted: number } {
  let used = fixed;
  let n = 0;
  for (; n < items.length; n++) {
    const c = cost(items[n]!, n);
    if (used + c > budget) break;
    used += c;
  }
  return { kept: items.slice(0, n), omitted: items.length - n };
}
