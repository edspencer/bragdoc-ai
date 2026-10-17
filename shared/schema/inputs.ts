// What callers give the services (server/services/): the HTTP routes and MCP tools validate request bodies with these
// (MCP's SDK takes Zod schemas as tool inputs). Strict: an unknown key is an error in a request, even though a file may
// carry keys BragDoc doesn't know. In updates, `null` clears an optional field and an absent key leaves it alone.
import { z } from 'zod';
import { ACHIEVEMENT_SOURCES } from './achievement.js';
import { hexColor, impact, isoDate, isoDateTime, ulidSchema } from './common.js';
import { EvidenceInputSchema, QuoteSchema } from './evidence.js';
import { FOUND_SOURCES } from './found.js';
import { PROJECT_STATUSES } from './project.js';

const ids = z.array(ulidSchema);
const record = z.record(z.string(), z.unknown());

export const AchievementCreateSchema = z.strictObject({
  title: z.string().trim().min(1),
  summary: z.string().optional(),
  body: z.string().optional(),
  happenedAt: isoDate.optional().describe('Defaults to today.'),
  endedAt: isoDate.nullable().optional(),
  impact: impact.optional(),
  impactSource: z.enum(['user', 'import']).optional(),
  projects: ids.optional(),
  repos: ids.optional(),
  companyId: ulidSchema.nullable().optional(),
  evidence: z.array(EvidenceInputSchema).optional(),
  source: z.enum(ACHIEVEMENT_SOURCES).optional(),
  sourceAgent: z.string().optional(),
  externalKey: z.string().min(1).optional().describe('Adding an achievement with a key that is already on the board returns that one instead.'),
  legacyId: z.string().min(1).optional(),
  archived: z.boolean().optional(),
  createdAt: isoDateTime.optional().describe('For importers: when it was originally added (its id is made from this time).'),
  updatedAt: isoDateTime.optional().describe('For importers: when it was last changed. Defaults to now.'),
  example: z.boolean().optional(),
  meta: record.optional(),
});
export type AchievementCreate = z.infer<typeof AchievementCreateSchema>;

export const AchievementUpdateSchema = z.strictObject({
  title: z.string().trim().min(1).optional(),
  summary: z.string().nullable().optional(),
  body: z.string().optional(),
  happenedAt: isoDate.optional(),
  endedAt: isoDate.nullable().optional(),
  impact: impact.nullable().optional(),
  impactSource: z.enum(['user', 'import']).nullable().optional(),
  projects: ids.optional(),
  repos: ids.optional(),
  companyId: ulidSchema.nullable().optional(),
  evidence: z.array(EvidenceInputSchema).optional().describe('The whole list: evidence left out is taken off.'),
  archived: z.boolean().optional(),
  meta: record.nullable().optional(),
});
export type AchievementUpdate = z.infer<typeof AchievementUpdateSchema>;

export const AchievementListSchema = z.strictObject({
  q: z.string().optional().describe('Full-text search; results are best match first unless `sort` is `date`.'),
  projectId: ulidSchema.optional(),
  repoId: ulidSchema.optional(),
  companyId: ulidSchema.optional().describe('Its own company, or one of its projects\' company.'),
  from: isoDate.optional().describe('happenedAt on or after.'),
  to: isoDate.optional().describe('happenedAt on or before.'),
  archived: z.enum(['exclude', 'include', 'only']).optional().describe('Default `exclude`.'),
  source: z.enum(ACHIEVEMENT_SOURCES).optional(),
  minImpact: impact.optional(),
  sort: z.enum(['date', 'relevance']).optional(),
  limit: z.number().int().min(1).max(1000).optional().describe('Default 100.'),
  offset: z.number().int().min(0).optional(),
});
export type AchievementList = z.infer<typeof AchievementListSchema>;

export const ProjectCreateSchema = z.strictObject({
  name: z.string().trim().min(1),
  description: z.string().optional(),
  color: hexColor.optional().describe('Defaults to the next swatch.'),
  start: isoDate.optional().describe('Defaults to today.'),
  end: isoDate.nullable().optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  companyId: ulidSchema.nullable().optional(),
  repoIds: ids.optional(),
  legacyId: z.string().min(1).optional(),
  example: z.boolean().optional(),
});
export type ProjectCreate = z.infer<typeof ProjectCreateSchema>;
export const ProjectUpdateSchema = z.strictObject({
  name: z.string().trim().min(1).optional(),
  description: z.string().nullable().optional(),
  color: hexColor.optional(),
  start: isoDate.optional(),
  end: isoDate.nullable().optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  companyId: ulidSchema.nullable().optional(),
  repoIds: ids.optional(),
});
export type ProjectUpdate = z.infer<typeof ProjectUpdateSchema>;

export const CompanyCreateSchema = z.strictObject({
  name: z.string().trim().min(1),
  role: z.string().optional(),
  start: isoDate.optional(),
  end: isoDate.nullable().optional(),
  legacyId: z.string().min(1).optional(),
  example: z.boolean().optional(),
});
export type CompanyCreate = z.infer<typeof CompanyCreateSchema>;
export const CompanyUpdateSchema = z.strictObject({
  name: z.string().trim().min(1).optional(),
  role: z.string().nullable().optional(),
  start: isoDate.nullable().optional(),
  end: isoDate.nullable().optional(),
});
export type CompanyUpdate = z.infer<typeof CompanyUpdateSchema>;

export const RepoCreateSchema = z
  .strictObject({
    name: z.string().trim().min(1).optional().describe('Defaults to owner/repo from the remote, else the folder name.'),
    localPath: z.string().min(1).optional(),
    remoteUrl: z.string().min(1).optional(),
    tracked: z.boolean().optional(),
    example: z.boolean().optional(),
  })
  .refine((r) => r.localPath || r.remoteUrl, { message: 'give a localPath, a remoteUrl, or both', path: ['localPath'] });
export type RepoCreate = z.infer<typeof RepoCreateSchema>;
export const RepoUpdateSchema = z.strictObject({
  name: z.string().trim().min(1).optional(),
  localPath: z.string().min(1).nullable().optional(),
  remoteUrl: z.string().min(1).nullable().optional(),
  tracked: z.boolean().optional(),
});
export type RepoUpdate = z.infer<typeof RepoUpdateSchema>;

export const ProfileUpdateSchema = z.strictObject({
  name: z.string().trim().min(1).optional(),
  role: z.string().nullable().optional(),
  githubLogin: z.string().nullable().optional(),
  aliases: z.array(z.string().min(1)).optional(),
  notMe: z.array(z.string().min(1)).optional(),
  emails: z.array(z.string().min(1)).optional(),
  timezone: z.string().nullable().optional(),
});
export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>;

export const FoundAddSchema = z.strictObject({
  source: z.enum(FOUND_SOURCES),
  sourceAgent: z.string().optional(),
  externalKey: z.string().min(1).optional().describe('Adding a key that is already in Found (even dismissed) or on the board does nothing.'),
  title: z.string().trim().min(1),
  summary: z.string().optional(),
  body: z.string().optional(),
  happenedAt: isoDate.optional().describe('Defaults to today.'),
  impact: impact.optional(),
  evidence: z.array(EvidenceInputSchema).optional(),
  files: z.array(z.strictObject({ path: z.string().regex(/^(\/|[A-Za-z]:[\\/])/, 'an absolute path'), title: z.string().optional() })).optional(),
  quote: QuoteSchema.optional().describe('Shorthand for one quote evidence.'),
  matchedRules: z.array(z.string()).optional(),
  suggestedProjects: ids.optional(),
  suggestedRepos: ids.optional(),
  meta: record.optional(),
});
export type FoundAdd = z.infer<typeof FoundAddSchema>;

/** Keep: what to change from the candidate on the way to the board. */
export const FoundKeepSchema = z.strictObject({
  title: z.string().trim().min(1).optional(),
  summary: z.string().optional(),
  body: z.string().optional(),
  happenedAt: isoDate.optional(),
  impact: impact.optional(),
  projects: ids.optional().describe('Defaults to the suggested projects.'),
  repos: ids.optional().describe('Defaults to the suggested repos.'),
});
export type FoundKeep = z.infer<typeof FoundKeepSchema>;
