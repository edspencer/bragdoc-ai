import { streamObject } from 'ai';
import { z } from 'zod';
import {extractAchievementsModel} from '@/lib/ai';
import type { Achievement } from '../db/schema';

// Schema for validating LLM response
const achievementResponseSchema = z.object({
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

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system' | 'data';
  content: string;
};

export type ExtractAchievementsInput = {
  input: string;
  chat_history: ChatMessage[];
  context: {
    companies: Array<{
      id: string;
      name: string;
      role: string;
      domain?: string;
      startDate: Date;
      endDate?: Date;
    }>;
    projects: Array<{
      id: string;
      name: string;
      companyId?: string;
      description: string;
      startDate?: Date;
      endDate?: Date;
    }>;
  };
};

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
> & {
  suggestNewProject?: boolean;
};

export async function* extractAchievements(
  input: ExtractAchievementsInput,
): AsyncGenerator<ExtractedAchievement, void, unknown> {
  const chatStr = input.chat_history
    .map(({ role, content }) => `${role}: ${content}`)
    .join('\n');

  const companiesStr = input.context.companies
    .map(
      (company) => `
Name: ${company.name} (ID: ${company.id})
Role: ${company.role}
Domain: ${company.domain || 'N/A'}
Start Date: ${company.startDate}
End Date: ${company.endDate || 'Present'}
    `,
    )
    .join('\n');

  const projectsStr = input.context.projects
    .map(
      (project) => `
Name: ${project.name} (ID: ${project.id})
Company: ${project.companyId || 'N/A'}
Description: ${project.description}
Start Date: ${project.startDate || 'N/A'}
End Date: ${project.endDate || 'N/A'}
    `,
    )
    .join('\n');

  const today = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const prompt = `Extract all achievements from the following user message. Consider the chat history and context to understand the full scope of each achievement. Pay special attention to:
1. Recent updates or progress reports
2. Completed milestones or phases
3. Team growth or leadership responsibilities
4. Quantitative metrics or impact
5. Technical implementations or solutions

<user-message>
${input.input}
</user-message>

<chat-history>
${chatStr}
</chat-history>

<context>
<companies>
${companiesStr}
</companies>

<projects>
${projectsStr}
</projects>
</context>

For each achievement found, provide:
1. A clear, action-oriented title (REQUIRED) that:
   - Starts with an action verb (e.g., Led, Launched, Developed)
   - Includes specific metrics when possible (e.g., "40% reduction", "2x improvement")
   - Mentions specific systems or teams affected
   - Is between 10 and 256 characters
   Example good titles:
   - "Led Migration of 200+ Services to Cloud Platform"
   - "Reduced API Response Time by 40% through Caching"
   - "Grew Frontend Team from 5 to 12 Engineers"
2. A concise summary highlighting key metrics and impact. Do not add anything beyond what the user told you.
3. Detailed description including context and significance. Do not add anything beyond what the user told you. Do not speculate.
4. Event duration (day/week/month/quarter/half year/year)
5. Related company ID (or null if none)
6. Related project ID (or null if none)
7. An eventStart date if possible. If the user tells you they did something on a specific date, include it. Today's date is ${today}
8. An eventEnd date if possible. If the user does not explicitly mention an end date, do not return one
9. Impact rating (1-3) based on these criteria:
   - Level 1 (Low): Routine tasks, individual/small team benefit, short-term impact
   - Level 2 (Medium): Notable improvements, team/department benefit, medium-term impact
   - Level 3 (High): Major initiatives, org-wide benefit, long-term strategic impact

Each achievement should be complete and self-contained.

Consider only the single message inside <user-message> when creating Achievements. If the user mentions achievements in the <chat-history>
you are given, you should not extract them because they have already been extracted. However, if those previous messages are relevant to the current
message, you should use them to inform your extraction.

Today's date is ${today}.`;

  console.log(prompt);

  const { elementStream } = await streamObject({
    model: extractAchievementsModel,
    prompt,
    temperature: 0,
    output: 'array',
    schema: achievementResponseSchema,
  });

  for await (const element of elementStream) {
    yield {
      title: element.title,
      summary: element.summary || '',
      details: element.details || '',
      eventDuration: element.eventDuration,
      eventStart: element.eventStart ? new Date(element.eventStart) : null,
      eventEnd: element.eventEnd ? new Date(element.eventEnd) : null,
      companyId: element.companyId,
      projectId: element.projectId,
      impact: element.impact,
      impactSource: 'llm',
      impactUpdatedAt: new Date(),
    };
  }
}
