// A draft's input, made from the folio's state alone (SPEC R24, D80): the same clippings the page shows (matching()
// over folioData(), less what's unticked, best first), numbered, budgeted against the model's context (budget.ts),
// and turned into the prompt. The check's sources come from the same numbering, so a `[3]` means the same clipping to
// the model, the check and the page. Pure but for its inputs: the route gathers them.
import type { AiDraftCited } from '../../../shared/api.js';
import type { DraftSources } from '../../../shared/ai/draft.js';
import { matching, pruneFilter, type FolioFilter, type FolioItem, type FolioResponse } from '../../../shared/folio.js';
import { clippingText, draftClipping, draftContext, draftPrompt, type DraftClipping, type DraftPromptInput } from '../prompts/draft.js';
import { capText, draftBudget, estimateTokens, fit, STYLE_SHARE, type DraftBudget } from './budget.js';

export interface DraftInput {
  data: FolioResponse;
  folio: FolioFilter;
  purpose?: string | null;
  role?: string | null;
  style?: string | null;
  /** The draft model's connection's contextTokens. */
  contextTokens: number;
}

export interface PreparedDraft {
  system: string;
  prompt: string;
  /** What the folio picks (before the budget), best first. */
  picked: FolioItem[];
  sent: number;
  omitted: number;
  /** "How I write" was cut to fit its share of the budget. */
  styleCut: boolean;
  cited: AiDraftCited[];
  sources: DraftSources;
  budget: DraftBudget;
}

/** The achievements a folio picks: what the filters let through, less what's unticked, best first (as folioDoc). */
export function pickedItems(data: FolioResponse, f: FolioFilter): FolioItem[] {
  const folio = pruneFilter(f, data);
  const out = new Set(folio.exclude);
  return matching(data, folio).filter((a) => !out.has(a.id));
}

/** The project and company names these clippings belong to, once each, in order (never the rest of the catalog). */
function namesOf(cs: DraftClipping[]): { projects: string[]; companies: string[] } {
  return { projects: [...new Set(cs.flatMap((c) => c.projects))], companies: [...new Set(cs.flatMap((c) => (c.company ? [c.company] : [])))] };
}

export function prepareDraft({ data, folio, purpose, role, style, contextTokens }: DraftInput): PreparedDraft {
  const picked = pickedItems(data, folio);
  const budget = draftBudget(contextTokens);
  const styled = style ? capText(style, Math.floor(budget.inputTokens * STYLE_SHARE)) : null;
  const base: Omit<DraftPromptInput, 'clippings' | 'projects' | 'companies'> = {
    from: folio.from,
    to: folio.to,
    name: data.author,
    role: role ?? null,
    purpose: purpose ?? null,
    style: styled?.text ?? null,
  };
  const clippings = picked.map((a) => draftClipping(a, data));
  // everything but the clippings, with a worst-case "N were left out" line in it; names are counted with each clipping
  const empty = draftPrompt({ ...base, clippings: [], projects: [], companies: [], omitted: picked.length || 1 });
  const fixed = estimateTokens(empty.system) + estimateTokens(empty.prompt) + 16;
  const nameCost = (c: DraftClipping) => estimateTokens([...c.projects, c.company ?? ''].join('", "')) + 2;
  const { kept, omitted } = fit(clippings, (c, i) => estimateTokens(clippingText(i + 1, c)) + 1 + nameCost(c), fixed, budget.inputTokens);
  const { system, prompt } = draftPrompt({ ...base, clippings: kept, ...namesOf(kept), omitted });
  return {
    system,
    prompt,
    picked,
    sent: kept.length,
    omitted,
    styleCut: !!styled?.cut,
    cited: kept.map((_, i) => ({ n: i + 1, id: picked[i]!.id, title: picked[i]!.title })),
    sources: { clippings: kept.map((c, i) => clippingText(i + 1, c, true)), context: draftContext(base) },
    budget,
  };
}

/**
 * The check's sources for a draft already made: its own numbering (`cited`, the ids in [n] order, from its `start`
 * line), rebuilt from the store, so a [3] still means what it meant when it was written even if the folio, the store
 * or Draft's model has changed since. Only ids the folio still picks count; one that's gone is an empty clipping
 * (everything a line citing it states is flagged).
 */
export function checkSources(input: Omit<DraftInput, 'contextTokens' | 'style'>, cited: string[]): DraftSources {
  const picked = new Map(pickedItems(input.data, input.folio).map((a) => [a.id, a]));
  return {
    clippings: cited.map((id, i) => {
      const a = picked.get(id);
      return a ? clippingText(i + 1, draftClipping(a, input.data), true) : '';
    }),
    context: draftContext({ from: input.folio.from, to: input.folio.to, name: input.data.author, role: input.role ?? null, purpose: input.purpose ?? null }),
  };
}
