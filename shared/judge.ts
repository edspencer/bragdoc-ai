// The seam an AI judge plugs into (D8). v0.1 shipped only the shape; v0.2's judge (server/ai/judge/, PR24) implements
// it over ctx.ai, and Jev (PR28) can implement it through the `ai` package's experimental_decide. Types only: shared/
// has no AI import, and the browser loads this file too.
import type { FoundCandidate, Verdict } from './schema/found.js';
import type { Profile } from './schema/profile.js';
import type { Project } from './schema/project.js';

export interface JudgeContext {
  profile: Profile | null;
  projects: Project[];
  /** What counts as a win for you (ai/what-counts.md, through services.instructions.forPrompt), or null for none. */
  instructions?: string | null;
  /**
   * What the judge reads, already normalised (server/ai/judge/input.ts): a screenshot's messages with "(the user)" and
   * "(not the user)" marks and the one to judge labelled, or a PR's repo, title, body and merge date. Plain text.
   */
  input?: string;
}

/**
 * A model's answer, as the prompts ask for it (server/ai/prompts/judge-*.ts), before any checking. Project names, not
 * ids: code maps them, and drops names that aren't yours. The judge turns it into a `Verdict`: a quote that isn't
 * verbatim in the input is dropped, `why` is trimmed, `confidence` and `impact` are clamped.
 */
export interface JudgeAnswer {
  keep: boolean;
  /** 0–1: how sure it is of `keep`, either way. */
  confidence: number;
  /** The words worth saving, copied from the input; empty when it has none. */
  quote: string;
  /** Who said it, as the input names them; empty when unknown. */
  from: string;
  /** One short sentence. */
  why: string;
  /** Names from your project list. */
  projects: string[];
  /** For a merged PR: the impact it suggests, 1–10. */
  impact?: number;
}

/**
 * A verdict from a decision model (Jev, D82): a probability and nothing else. It has no `why`, quote or `from`, and
 * none may be made up for it: the card says it answers with a probability only.
 */
export const probabilityOnly = (v: { by?: string | undefined } | null | undefined): boolean => /^typesafe\/jev\b/.test(v?.by ?? '');

export interface Judge {
  /** Decide whether a candidate is worth keeping. Never called unless the user has turned an AI feature on. */
  decide(candidate: FoundCandidate, context: JudgeContext): Promise<Omit<Verdict, 'at' | 'by'>>;
}
