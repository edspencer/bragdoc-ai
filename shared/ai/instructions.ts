// The instructions files (SPEC R20, D67): markdown you write for the models, in the data home's ai/ folder. They're
// user data, so the store owns them and backups keep them. Pure data, shared by the server and the web app.
//   ai/what-counts.md   "What counts as a win for me": the judge reads it (PR24)
//   ai/style.md         "How I write": tidy and draft read it, if you write one (PR26, PR27)

export const INSTRUCTION_NAMES = ['what-counts', 'style'] as const;
export type InstructionsName = (typeof INSTRUCTION_NAMES)[number];

export const isInstructionsName = (s: string): s is InstructionsName => (INSTRUCTION_NAMES as readonly string[]).includes(s);

/**
 * The longest an instructions file may be, in characters. Each is sent with every call of the features that read it,
 * and a local model's context is a few thousand tokens (contextTokens, 8192 by default): past this a file would crowd
 * out what it's meant to judge. A longer file is a Problem, and the last good copy is used (D67).
 */
export const INSTRUCTIONS_MAX_CHARS = 20_000;

export const INSTRUCTIONS_INFO: Record<InstructionsName, { file: string; title: string; readBy: readonly ('judge' | 'tidy' | 'draft')[] }> = {
  'what-counts': { file: 'ai/what-counts.md', title: 'What counts as a win for me', readBy: ['judge'] },
  style: { file: 'ai/style.md', title: 'How I write', readBy: ['tidy', 'draft'] },
};
