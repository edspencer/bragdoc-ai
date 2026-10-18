// found/<id>.yaml: a candidate a source spotted, waiting in Found for you to keep, merge or dismiss (SPEC R7). Decided
// candidates stay on disk: a dismissed `externalKey` never comes back, and a decision can be undone.
import { z } from 'zod';
import { impact, isoDate, isoDateTime, meta, schemaVersion, id, ulidSchema } from './common.js';
import { EvidenceSchema } from './evidence.js';

export const FOUND_SOURCES = ['github', 'screenshots', 'mcp'] as const;
export type FoundSource = (typeof FOUND_SOURCES)[number];
export const FOUND_STATUSES = ['pending', 'kept', 'dismissed'] as const;

/**
 * What a judge decided (the future AI seam, D8; shared/judge.ts). v0.1 has no judge, so it's always null. Shaped like
 * the judge's answer so a later version fills it in without a format change.
 */
export const VerdictSchema = z.object({
  keep: z.boolean(),
  confidence: z.number().min(0).max(1).optional(),
  quote: z.string().optional(),
  why: z.string().optional(),
  suggestedProjects: z.array(ulidSchema).default([]),
  by: z.string().optional().describe('Which judge (model or service).'),
  at: isoDateTime.optional(),
});
export type Verdict = z.infer<typeof VerdictSchema>;

export const DecisionSchema = z.object({
  action: z.enum(['keep', 'merge', 'dismiss']).describe('What you did with it.'),
  at: isoDateTime.describe('When.'),
  achievementId: ulidSchema.optional().describe('keep: the achievement made from it; merge: the one it went into.'),
  evidenceIds: z.array(ulidSchema).optional().describe('merge: the evidence it added (undo takes exactly these off again).'),
});

export const FoundCandidateSchema = z.object({
  schemaVersion,
  id,
  status: z.enum(FOUND_STATUSES).default('pending').describe('`pending`, `kept` or `dismissed`.'),
  source: z.enum(FOUND_SOURCES).describe('Which source spotted it: `github`, `screenshots` or `mcp`.'),
  sourceAgent: z.string().optional().describe('For `mcp`: which agent sent it.'),
  externalKey: z.string().optional().describe('A stable key (`github_pr:owner/repo#123`, `screenshot:<sha256>`): the same key is never added twice.'),
  keyHashes: z
    .array(z.string().regex(/^sha256:[0-9a-f]{64}$/))
    .optional()
    .describe('A dismissed candidate keeps only these: `sha256:` of each key it had, so the same thing never comes back.'),
  title: z.string().min(1).describe('What the achievement would be called.'),
  summary: z.string().optional(),
  body: z.string().optional().describe('Markdown, for the achievement\'s body.'),
  happenedAt: isoDate.describe('When it happened, YYYY-MM-DD.'),
  impact: impact.optional(),
  evidence: z.array(EvidenceSchema).default([]).describe('Evidence it would carry (links, PRs, quotes, stored files).'),
  files: z
    .array(z.object({ path: z.string().min(1).describe('An absolute path.'), title: z.string().optional() }))
    .default([])
    .describe('Files on disk it points at (a screenshot), copied into evidence/ only when you keep or merge it.'),
  matchedRules: z.array(z.string()).default([]).describe('Which rules it passed, in words (shown on its card).'),
  suggestedProjects: z.array(ulidSchema).default([]).describe('Projects it probably belongs to.'),
  suggestedRepos: z.array(ulidSchema).default([]).describe('Repos it probably touched.'),
  verdict: VerdictSchema.nullable().default(null).describe('A judge\'s decision. Always empty in v0.1 (no AI).'),
  decision: DecisionSchema.nullable().default(null).describe('What you decided, once you have.'),
  foundAt: isoDateTime.describe('When it was spotted.'),
  meta,
});
export type FoundCandidate = z.infer<typeof FoundCandidateSchema>;
