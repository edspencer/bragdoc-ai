import { InferSelectModel } from 'drizzle-orm';
import { brag, company, project, userMessage } from '@/lib/db/schema';
import { z } from 'zod';

// Export base type from Drizzle schema
export type Achievement = InferSelectModel<typeof brag>;
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

// API request types
export type CreateAchievementRequest = Pick<Achievement,
  | 'title'
  | 'summary'
  | 'details'
  | 'eventStart'
  | 'eventEnd'
  | 'eventDuration'
  | 'companyId'
  | 'projectId'
>;

export type UpdateAchievementRequest = Partial<CreateAchievementRequest> & {
  isArchived?: boolean;
};

// Zod validation schemas
export const achievementRequestSchema = z.object({
  title: z.string().min(1).max(256),
  summary: z.string().nullable().optional(),
  details: z.string().nullable().optional(),
  eventStart: z.date().nullable().optional(),
  eventEnd: z.date().nullable().optional(),
  eventDuration: z.enum([
    EventDuration.Day,
    EventDuration.Week,
    EventDuration.Month,
    EventDuration.Quarter,
    EventDuration.HalfYear,
    EventDuration.Year,
  ]),
  companyId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  isArchived: z.boolean().optional(),
});

export type AchievementSource = 'llm' | 'manual';

export interface AchievementFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  companyId?: string;
  projectId?: string;
  duration?: EventDuration;
  isArchived?: boolean;
  source?: AchievementSource;
}
