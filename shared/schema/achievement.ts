// achievements/YYYY/MM/<id>.md: one achievement per file, YAML front-matter between `---` lines, then a markdown body.
// YYYY/MM is the month of the id's creation time, so changing `happenedAt` never moves the file (SPEC R2).
import { z } from 'zod';
import { example, id, impact, isoDate, isoDateTime, meta, schemaVersion, ulidSchema } from './common.js';
import { EvidenceSchema } from './evidence.js';

export const ACHIEVEMENT_SOURCES = ['manual', 'paste', 'github-pr', 'screenshot', 'mcp', 'import'] as const;
export type AchievementSource = (typeof ACHIEVEMENT_SOURCES)[number];

export const AchievementFrontMatterSchema = z.object({
  schemaVersion,
  id,
  title: z.string().min(1).describe('One line: what you did.'),
  summary: z.string().optional().describe('A sentence or two more.'),
  happenedAt: isoDate.describe('When it happened (or started), YYYY-MM-DD.'),
  endedAt: isoDate.nullable().optional().describe('When it ended, for something that took a while.'),
  impact: impact.optional().describe('How much it mattered, 1–10 (the scale is in the agent guide).'),
  impactSource: z.enum(['user', 'import']).optional().describe('Who set the impact: `user`, or `import` (carried over from the hosted app).'),
  projects: z.array(ulidSchema).default([]).describe('Projects it belongs to (project ids).'),
  repos: z.array(ulidSchema).default([]).describe('Repos it touched (repo ids).'),
  companyId: ulidSchema.nullable().optional().describe('The company, when it isn\'t implied by a project.'),
  evidence: z.array(EvidenceSchema).default([]).describe('What backs it up (see Evidence).'),
  source: z.enum(ACHIEVEMENT_SOURCES).default('manual').describe('How it got here: `manual`, `paste`, `github-pr`, `screenshot`, `mcp` or `import`.'),
  sourceAgent: z.string().optional().describe('For `mcp`: which agent wrote it, as the board names it, e.g. `Claude Code`.'),
  externalKey: z.string().optional().describe('A stable key for where it came from (`github_pr:owner/repo#123`); adding the same key again is a no-op.'),
  legacyId: z.string().optional().describe('Its id in the hosted BragDoc, for imported achievements (re-importing skips it).'),
  archived: z.boolean().default(false).describe('`true` hides it from the board without deleting it.'),
  createdAt: isoDateTime.describe('When it was added.'),
  updatedAt: isoDateTime.describe('When it was last changed.'),
  example,
  meta,
});
export type AchievementFrontMatter = z.infer<typeof AchievementFrontMatterSchema>;

/** An achievement as the store holds it: the front-matter plus the markdown body (`''` when there's none). */
export type Achievement = AchievementFrontMatter & { body: string };
