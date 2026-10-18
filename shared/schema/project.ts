// projects/<id>.yaml: a named piece of work with dates and a colour, optionally under a company, linked to repos.
// References are ids, never names, so renaming a project rewrites this one file (SPEC R2).
import { z } from 'zod';
import { example, hexColor, id, isoDate, schemaVersion, ulidSchema } from './common.js';

/** The twelve project swatches (the Scrapbook prototype's). New projects get one in turn; any #rrggbb is allowed. */
export const PROJECT_SWATCHES = ['#ef5a3c', '#f5a524', '#e8c547', '#2fb37e', '#14a3a3', '#3b6cf6', '#6a5cf0', '#a25ddc', '#e05aa8', '#8a6a4f', '#5f6b7a', '#1d1a17'] as const;

export const PROJECT_STATUSES = ['active', 'paused', 'done', 'archived'] as const;

export const ProjectSchema = z.object({
  schemaVersion,
  id,
  name: z.string().min(1).describe('The project\'s name.'),
  description: z.string().optional().describe('A line or two about it.'),
  color: hexColor.describe('Its tape colour, `#rrggbb`.'),
  start: isoDate.describe('When it started, YYYY-MM-DD.'),
  end: isoDate.nullable().default(null).describe('When it ended; empty while it\'s ongoing.'),
  status: z.enum(PROJECT_STATUSES).default('active').describe('`active`, `paused`, `done` or `archived` (hidden from pickers).'),
  companyId: ulidSchema.nullable().default(null).describe('The company it was for (a company id), or empty.'),
  repoIds: z.array(ulidSchema).default([]).describe('Linked repos (repo ids).'),
  legacyId: z.string().optional().describe('Its id in the hosted BragDoc, for imported projects (re-importing skips it).'),
  example,
});
export type Project = z.infer<typeof ProjectSchema>;
