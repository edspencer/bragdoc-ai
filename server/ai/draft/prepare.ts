// A draft's input, made from the folio's state alone (SPEC R24, D80): the same clippings the page shows (matching()
// over folioData(), less what's unticked, best first), numbered, budgeted against the model's context (budget.ts),
// and turned into the prompt. The check's sources come from the same numbering, so a `[3]` means the same clipping to
// the model, the check and the page. Pure but for its inputs: the route gathers them.
import type { AiDraftCited } from '../../../shared/api.js';
import type { DraftSources } from '../../../shared/ai/draft.js';
import { matching, pruneFilter, type FolioFilter, type FolioItem, type FolioResponse } from '../../../shared/folio.js';
import { clippingText, draftClipping, draftContext, draftPrompt, type DraftPromptInput } from '../prompts/draft.js';
import { draftBudget, estimateTokens, fit, type DraftBudget } from './budget.js';

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

export function prepareDraft({ data, folio, purpose, role, style, contextTokens }: DraftInput): PreparedDraft {
  const picked = pickedItems(data, folio);
  const base: Omit<DraftPromptInput, 'clippings'> = {
    from: folio.from,
    to: folio.to,
    name: data.author,
    role: role ?? null,
    projects: data.projects.map((p) => p.name),
    companies: data.companies.map((c) => c.name),
    purpose: purpose ?? null,
    style: style ?? null,
  };
  const budget = draftBudget(contextTokens);
  const clippings = picked.map((a) => draftClipping(a, data));
  // everything but the clippings, with a worst-case "N were left out" line in it
  const empty = draftPrompt({ ...base, clippings: [], omitted: picked.length || 1 });
  const fixed = estimateTokens(empty.system) + estimateTokens(empty.prompt);
  const { kept, omitted } = fit(clippings, (c, i) => estimateTokens(clippingText(i + 1, c)) + 1, fixed, budget.inputTokens);
  const { system, prompt } = draftPrompt({ ...base, clippings: kept, omitted });
  return {
    system,
    prompt,
    picked,
    sent: kept.length,
    omitted,
    cited: kept.map((_, i) => ({ n: i + 1, id: picked[i]!.id, title: picked[i]!.title })),
    sources: { clippings: kept.map((c, i) => clippingText(i + 1, c)), context: draftContext(base) },
    budget,
  };
}
