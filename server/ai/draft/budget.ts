// How much of a folio fits in one draft (SPEC R24, D81). A model reads a fixed number of tokens (its connection's
// contextTokens: 8192 by default for a local runner, 30k for a cloud one), and that has to hold the instructions, the
// clippings and the answer. Past it, Ollama silently drops the start of the prompt and a cloud model refuses, so the
// budget is worked out here, before anything is sent: the clippings go in best first, and the lowest-impact ones that
// don't fit are left out and counted, for the page to say so ("12 lower-impact items weren't sent").
//
// Tokens are estimated, not counted: no tokenizer is bundled (each model has its own). The estimate is deliberately
// high (about 3.5 characters a token, where English averages nearer 4), so a folio that fits by the estimate fits.

/** Estimated tokens in a piece of text. */
export const estimateTokens = (s: string): number => Math.ceil(s.length / 3.5);

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
