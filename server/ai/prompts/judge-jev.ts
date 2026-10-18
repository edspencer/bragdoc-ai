// What the judge sends Jev (SPEC R21, R25; D82): not a prompt but a state and typed questions. A pure function of the
// same { profile, projects, instructions, input } as the chat judge's prompts, written fresh for v0.2 (D2) after the
// Found spike's Jev call (its state fields and its yes/no question with criteria): nothing from the hosted app.
//
// - **The state** is plain text fields: who the user is (with the names that aren't them), their own "what counts"
//   instructions (ai/what-counts.md, verbatim, or the default guidance), and the input judge/input.ts made (a
//   screenshot's messages with "(the user)" marks and the one to judge labelled, or a PR's details). Never a path, an
//   id or a local URL: the same input a cloud chat model would be sent.
// - **The questions:** `keep`, a yes/no that Jev answers with P(yes), and, when you have projects, `project`: a choice
//   among their names, or none. Jev gives no reason, quote or author, so nothing is asked for one.
// - **The preview** (GET /api/ai/judge/preview) shows exactly this, rendered: the questions as `system`, the state as
//   `prompt`.
import { DEFAULT_GUIDANCE, whoIsTheUser, type JudgePromptInput } from './judge-screenshot.js';

/** One of Jev's questions, in the AI SDK's shape (decide.ts puts `boolean` on the wire as Jev's `noul`). */
export type JevQuestion =
  | { type: 'boolean'; instructions: string; criteria: { true: string; false: string } }
  | { type: 'choice'; instructions: string; criteria: Record<string, string> };

export interface JevRequest {
  state: Record<string, string>;
  questions: Record<string, JevQuestion>;
}

/** The project question's "none of them" option (a key no project name is likely to be). */
export const JEV_NO_PROJECT = '(none of these)';

const SCREENSHOT_KEEP: JevQuestion = {
  type: 'boolean',
  instructions:
    "Following the user's instructions, is the message to judge in the screenshot a win worth saving for the user: praise, thanks or recognition for something the user did, or evidence of the impact of their work?",
  criteria: {
    true: 'Someone other than the user praises, thanks or credits the user for specific work, or reports the impact of work the user did.',
    false: "Routine thanks for a small favour, praise for someone else (even one that names the user in passing), the user's own messages, sarcasm or backhanded comments, requests, scheduling, bot posts, or ordinary work chatter.",
  },
};

const GITHUB_KEEP: JevQuestion = {
  type: 'boolean',
  instructions: "Following the user's instructions, is this merged pull request, which the user wrote, a notable piece of work worth a brag rather than routine?",
  criteria: {
    true: 'A feature shipped, a real bug or incident fixed, a performance or cost win, a migration, or a design others build on.',
    false: 'A dependency or version bump, a typo or formatting fix, a revert, a rename, a config tweak, a small chore, or a work-in-progress step.',
  },
};

/** The state and questions for one candidate. */
export function judgeJevRequest(kind: 'screenshots' | 'github', { profile, projects, instructions, input }: JudgePromptInput): JevRequest {
  // each project once (the first spelling: the judge maps names back case-blind), in your order
  const names: string[] = [];
  for (const n of projects.map((p) => p.replace(/\s+/g, ' ').trim())) if (n && !names.some((x) => x.toLowerCase() === n.toLowerCase())) names.push(n);
  const state: Record<string, string> = {
    user: whoIsTheUser(profile),
    user_instructions: instructions?.trim() || DEFAULT_GUIDANCE,
    ...(kind === 'github' ? { pull_request: input } : { screenshot: input }),
  };
  const questions: Record<string, JevQuestion> = { keep: kind === 'github' ? GITHUB_KEEP : SCREENSHOT_KEEP };
  if (names.length)
    questions.project = {
      type: 'choice',
      instructions: kind === 'github' ? "Which of the user's projects is this pull request most about?" : "Which of the user's projects is the message to judge most about?",
      criteria: { ...Object.fromEntries(names.map((n) => [n, n])), [JEV_NO_PROJECT]: 'None of these projects, or it isn’t clear which.' },
    };
  return { state, questions };
}

/** The request as the preview shows it: the questions, then the state, exactly as they're sent. */
export function jevPreview(r: JevRequest): { system: string; prompt: string } {
  const q = Object.entries(r.questions).map(([id, x]) =>
    [`${id} (${x.type === 'boolean' ? 'yes or no, answered as a probability' : 'one of the options'}): ${x.instructions}`, ...Object.entries(x.criteria).map(([k, v]) => `  ${k}: ${v}`)].join('\n'),
  );
  return {
    system: `Sent to Jev (TypeSafe's decision model, through OpenRouter) as typed questions. It answers each with a probability or a choice, and never with a reason.\n\n${q.join('\n\n')}`,
    prompt: JSON.stringify(r.state, null, 2),
  };
}
