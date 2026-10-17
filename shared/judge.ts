// The seam a future AI judge plugs into (D8). v0.1 ships no implementation and no AI dependency: this is only the shape,
// so Found candidates (their nullable `verdict`) and the code that will call a judge don't need a format change later.
// It's shaped so the `ai` package's experimental_decide, or a local model behind Ollama, can implement it.
import type { FoundCandidate, Verdict } from './schema/found.js';
import type { Profile } from './schema/profile.js';
import type { Project } from './schema/project.js';

export interface JudgeContext {
  profile: Profile | null;
  projects: Project[];
}

export interface Judge {
  /** Decide whether a candidate is worth keeping. Never called unless the user has turned an AI feature on. */
  decide(candidate: FoundCandidate, context: JudgeContext): Promise<Omit<Verdict, 'at' | 'by'>>;
}
