import { z } from 'zod/v3';

// Schema for individual achievement in export/import
export const exportAchievementSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  companyId: z.string().uuid().nullable(),
  projectId: z.string().uuid().nullable(),
  userMessageId: z.string().uuid().nullable(),
  title: z.string(),
  summary: z.string().nullable(),
  details: z.string().nullable(),
  eventStart: z.string().datetime().nullable(),
  eventEnd: z.string().datetime().nullable(),
  eventDuration: z.enum([
    'day',
    'week',
    'month',
    'quarter',
    'half year',
    'year',
  ]),
  isArchived: z.boolean().nullable(),
  source: z.enum(['llm', 'manual', 'commit']),
  impact: z.number().int().nullable(),
  impactSource: z.enum(['user', 'llm']).nullable(),
  impactUpdatedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  // Optional embedding fields for pre-computed embeddings (demo data)
  embedding: z.array(z.number()).optional(),
  embeddingModel: z.string().optional(),
  embeddingGeneratedAt: z.string().datetime().optional(),
});

// Schema for individual company in export/import
export const exportCompanySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  domain: z.string().nullable(),
  role: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().nullable(),
});

// Schema for individual project in export/import
export const exportProjectSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  companyId: z.string().uuid().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  color: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().nullable(),
  repoRemoteUrl: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Schema for individual document in export/import
export const exportDocumentSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  title: z.string(),
  content: z.string().nullable(),
  userId: z.string().uuid(),
  companyId: z.string().uuid().nullable(),
  type: z.string().nullable(),
  shareToken: z.string().nullable(),
});

// Main export data schema
export const exportDataSchema = z.object({
  version: z.literal('1.0'),
  exportedAt: z.string().datetime(),
  userId: z.string().uuid(),
  companies: z.array(exportCompanySchema),
  projects: z.array(exportProjectSchema),
  achievements: z.array(exportAchievementSchema),
  documents: z.array(exportDocumentSchema),
});

// Type inference
export type ExportData = z.infer<typeof exportDataSchema>;
export type ExportAchievement = z.infer<typeof exportAchievementSchema>;
export type ExportCompany = z.infer<typeof exportCompanySchema>;
export type ExportProject = z.infer<typeof exportProjectSchema>;
export type ExportDocument = z.infer<typeof exportDocumentSchema>;
