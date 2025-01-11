import { z } from 'zod';

// Schema for validating LLM response
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