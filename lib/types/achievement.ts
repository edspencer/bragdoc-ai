import type { InferSelectModel } from 'drizzle-orm';
import type { achievement, company, project, userMessage } from '@/lib/db/schema';
import { z } from 'zod';

// Export base type from Drizzle schema
export type Achievement = InferSelectModel<typeof achievement>;
export type Company = InferSelectModel<typeof company>;
export type Project = InferSelectModel<typeof project>;
export type UserMessage = InferSelectModel<typeof userMessage>;

// Type with resolved relations
export type AchievementWithRelations = Achievement & {
  company: Company | null;
  project: Project | null;
  userMessage: UserMessage | null;
};

// Duration enum matching the database schema
export const EventDuration = {
  Day: 'day',
  Week: 'week',
  Month: 'month',
  Quarter: 'quarter',
  HalfYear: 'half year',
  Year: 'year',
} as const;

export type EventDuration = typeof EventDuration[keyof typeof EventDuration];

// Zod validation schemas
export const achievementRequestSchema = z.object({
  title: z.string().min(1).max(256),
  summary: z.string().nullable().optional(),
  details: z.string().nullable().optional(),
  eventStart: z.coerce.date().nullable().optional(),
  eventEnd: z.coerce.date().nullable().optional(),
  eventDuration: z.enum(['day', 'week', 'month', 'quarter', 'half year', 'year']),
  companyId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  isArchived: z.boolean().optional(),
});

// API request types
export type CreateAchievementRequest = z.infer<typeof achievementRequestSchema>;
export type UpdateAchievementRequest = Partial<CreateAchievementRequest>;

// Form type
export type FormValues = {
  title: string;
  summary: string | null;
  details: string | null;
  eventStart: Date | null;
  eventEnd: Date | null;
  eventDuration: EventDuration;
  companyId: string | null;
  projectId: string | null;
};

// Achievement source
export type AchievementSource = 'llm' | 'manual';

export interface AchievementFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  startDate?: Date;
  endDate?: Date;
  companyId?: string;
  projectId?: string;
  duration?: EventDuration;
  isArchived?: boolean;
  source?: AchievementSource;
  searchQuery?: string;
}
