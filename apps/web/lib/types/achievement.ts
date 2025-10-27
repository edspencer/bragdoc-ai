import type { InferSelectModel } from 'drizzle-orm';
import type {
  achievement,
  company,
  project,
  userMessage,
} from '@/database/schema';

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
  Year: 'year',
} as const;

export type EventDuration = (typeof EventDuration)[keyof typeof EventDuration];

// API request types
export type CreateAchievementRequest = Omit<
  Achievement,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
>;
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
  isArchived?: boolean;
  impact?: number;
  impactSource?: 'user' | 'llm';
  impactUpdatedAt?: Date;
};

// Achievement source
export type AchievementSource = 'llm' | 'manual';

// Achievement filters
export interface AchievementFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  start: Date;
  end: Date;
  startDate?: Date;
  endDate?: Date;
  companyId?: string;
  projectId?: string;
  duration?: EventDuration;
  isArchived?: boolean;
  source?: AchievementSource;
  searchQuery?: string;
}
