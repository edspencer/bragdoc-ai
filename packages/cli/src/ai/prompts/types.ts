import { z } from 'zod';

//Schema we use to ask the LLM for a structured response using
export const achievementResponseSchema = z.object({
  title: z
    .string()
    .min(1, 'Title must be at least 1 character')
    .describe('A concise title for the achievement'),
  summary: z.string().describe('A brief summary of the achievement').optional(),
  details: z
    .string()
    .describe(
      'If the user input had to be summarized to fit into the title, put their entire input here. Otherwise, leave this empty',
    )
    .optional(),
  eventStart: z
    .string()
    .describe(
      'The start date of the event or achievement. Fill this if the user mentions a date',
    )
    .optional(),
  eventEnd: z
    .string()
    .nullable()
    .describe(
      'The end date of the event or achievement. This is less important than eventStart',
    )
    .optional(),
  eventDuration: z
    .enum(['day', 'week', 'month', 'quarter', 'half year', 'year'])
    .describe('The duration of the achievement'),
  companyId: z
    .string()
    .nullable()
    .describe(
      'The ID of the company this achievement is associated with (null if not specified)',
    ),
  projectId: z
    .string()
    .nullable()
    .describe(
      'The ID of the project this achievement is associated with (null if not specified)',
    ),
  impact: z
    .number()
    .min(1)
    .max(10)
    .describe('Impact level of the achievement (1: Low, 2: Medium, 3: High)')
    .default(2),
});

// The type that we get back from the LLM
export type LLMExtractedAchievement = z.infer<typeof achievementResponseSchema>;

// Minimal types for Achievement data (not saved to db yet)
export type ExtractedAchievement = {
  title: string;
  summary?: string;
  details?: string;
  eventDuration: 'day' | 'week' | 'month' | 'quarter' | 'half year' | 'year';
  eventStart: Date | null;
  eventEnd: Date | null;
  companyId: string | null;
  projectId: string | null;
  impact: number;
  impactSource: 'llm' | 'user';
  impactUpdatedAt: Date;
};

/**
 * Commit Achievement Extraction Types
 */

export interface Commit {
  hash: string;
  message: string;
  author: {
    name: string;
    email: string;
  };
  date: string;
  prDetails?: {
    title: string;
    description: string;
    number: number;
  };
}

export interface Repository {
  name: string;
  path: string;
  remoteUrl?: string;
}

// Minimal Company type for prompt rendering
// Dates can be Date objects or ISO strings (from API responses)
export interface Company {
  id: string;
  name: string;
  role?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
}

// Minimal Project type for prompt rendering
// Dates can be Date objects or ISO strings (from API responses)
export interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  companyId?: string | null;
  startDate: Date | string;
  endDate?: Date | string | null;
  repoRemoteUrl?: string | null;
}

// Minimal User type for prompt rendering
export interface User {
  id: string;
  name?: string | null;
  email: string;
  preferences?: {
    documentInstructions?: string;
  } | null;
}

export type FetchExtractCommitAchievementsPromptProps = {
  user: User;
  commits: Commit[];
  repository: Repository;
};

// props required to render the Extract Commit Achievements Prompt
export interface ExtractCommitAchievementsPromptProps {
  commits: Commit[];
  repository: Repository;
  companies: Company[];
  projects: Project[];
  user: User;
}
