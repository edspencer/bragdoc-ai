import type { Standup, StandupDocument, Company, Project } from '../schema';

/**
 * Input type for creating a standup
 */
export interface StandupInsert {
  userId: string;
  name: string;
  companyId?: string | null;
  projectIds?: string[];
  daysMask: number;
  meetingTime: string; // HH:mm format
  timezone: string; // IANA timezone
  startDate?: string; // ISO date string
  enabled?: boolean;
  description?: string;
  instructions?: string;
}

/**
 * Standup with related entities populated
 */
export interface StandupWithRelations extends Standup {
  company?: Company | null;
  projects?: Project[];
}

/**
 * Standup document with additional details
 */
export interface StandupDocumentWithDetails extends StandupDocument {
  standup?: Standup;
  quickSummary?: string; // Generated 1-line summary
}

/**
 * Input for updating a standup document
 */
export interface StandupDocumentUpdate {
  wip?: string;
  achievementsSummary?: string;
}
