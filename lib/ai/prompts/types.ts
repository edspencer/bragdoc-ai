import { z } from 'zod';
import { Achievement, Company, Project, User } from '@/lib/db/schema';
import { Message } from 'ai';

//Schema we use to ask the LLM for a structured response using
export const achievementResponseSchema = z.object({
  title: z
    .string()
    .min(1, 'Title must be at least 1 character')
    .describe('A concise title for the achievement'),
  summary: z.string().describe('A brief summary of the achievement').optional(),
  details: z
    .string()
    .describe('Additional details about the achievement')
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
    .max(3)
    .describe('Impact level of the achievement (1: Low, 2: Medium, 3: High)')
    .default(2),
});

// The type that we get back from the LLM
export type LLMExtractedAchievement = z.infer<typeof achievementResponseSchema>;

// the type of Achievement emitted by the LLM wrapper (not saved to db yet)
// basically what the LLM sent back plus a couple of fields like impactUpdatedAt
export type ExtractedAchievement = Pick<
  Achievement,
  | 'title'
  | 'summary'
  | 'details'
  | 'eventDuration'
  | 'eventStart'
  | 'eventEnd'
  | 'companyId'
  | 'projectId'
  | 'impact'
  | 'impactSource'
  | 'impactUpdatedAt'
>;

export type ExtractAchievementsFetcherProps = {
  user: User;
  message: string;
  chatHistory: Message[];
}

//props required to render the Extract Achievements Prompt
export interface ExtractAchievementsPromptProps {
  companies: Company[];
  projects: Project[];
  message: string;
  chatHistory: Message[];
  user: User;
}

// props required to render the Extract Commit Achievements Prompt
export interface ExtractCommitAchievementsPromptProps {
  commits: Commit[];
  repository: Repository;
  companies: Company[];
  projects: Project[];
  user: User;
};

export type Commit = {
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
};

export type Repository = {
  name: string;
  path: string;
  remoteUrl?: string;
};