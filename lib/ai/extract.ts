import { streamObject, generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { Achievement } from '../db/schema';
import { customModel } from './index';

// Schema for validating LLM response
const achievementResponseSchema = z.object({
  title: z.string().min(1, "Title must be at least 1 character").describe("A concise title for the achievement"),
  summary: z.string().describe("A brief summary of the achievement").optional(),
  details: z.string().describe("Additional details about the achievement").optional(),
  eventStart: z.date().nullable().describe("The start date of the event or achievement").optional(),
  eventEnd: z.date().nullable().describe("The end date of the event or achievement").optional(),
  eventDuration: z.enum(['day', 'week', 'month', 'quarter', 'half year', 'year']).describe("The duration of the achievement"),
  companyId: z.string().nullable().describe("The ID of the company this achievement is associated with (null if not specified)"),
  projectId: z.string().nullable().describe("The ID of the project this achievement is associated with (null if not specified)"),
  suggestNewProject: z.boolean().describe("Set to true if this achievement suggests creating a new project").optional(),
  impact: z.number().min(1).max(3).describe("Impact level of the achievement (1: Low, 2: Medium, 3: High)").default(2),
  impactExplanation: z.string().describe("Brief explanation of why this impact level was chosen"),
})

export async function extractAchievement({ input, chat_history }: { input: string; chat_history: { role: string; content: string }[] }): Promise<ExtractedAchievement> {
  const model = openai("gpt-4o");

  const prompt = [
    {
      role: "system",
      content: `You are an AI assistant that helps users track their professional achievements. 
Extract achievements from user messages and format them as structured data.
Always include:
- A concise title
- A brief summary
- Detailed description
- Time information:
  - eventStart: Must be a valid ISO datetime string (e.g., "2024-12-14T00:00:00Z")
  - eventEnd: Must be a valid ISO datetime string (e.g., "2024-12-14T00:00:00Z")
  - eventDuration: Must be one of: "day", "week", "month", "quarter", "half year", "year"
- Company and project information:
  - companyId: The ID of the company this achievement is associated with (null if not specified)
  - projectId: The ID of the project this achievement is associated with (null if not specified)
  - suggestNewProject: Set to true if this achievement suggests creating a new project
- Impact rating:
  - impact: A number from 1-3 indicating the impact level
  - impactExplanation: Brief explanation of why this impact level was chosen

Impact Level Criteria and Examples:

1 (Low Impact):
- Routine tasks, maintenance work, or minor improvements
- Benefits limited to individual or small team
- Short-term or temporary impact
Examples:
- Fixed a minor UI bug affecting a few users
- Updated documentation for a single component
- Completed routine code reviews
- Attended team training sessions

2 (Medium Impact):
- Notable improvements or initiatives
- Benefits team or department level
- Medium-term impact with measurable results
Examples:
- Led a successful migration to a new testing framework
- Implemented a new feature used by multiple teams
- Improved build pipeline, reducing build times by 30%
- Mentored junior developers, improving team velocity

3 (High Impact):
- Major initiatives or transformative work
- Benefits entire organization or multiple departments
- Long-term strategic impact with significant results
Examples:
- Architected and implemented a new microservices platform
- Led a major product launch that increased revenue by 25%
- Implemented organization-wide security improvements
- Created a new framework adopted by multiple teams

Consider these factors when scoring impact:
1. Scope: How many people/teams were affected?
2. Duration: How long did the impact last?
3. Metrics: Were there measurable improvements?
4. Innovation: Was this a novel solution?
5. Strategic Value: How aligned was this with company goals?

If exact dates are not provided, use the current date (${new Date().toISOString()}) for both start and end dates.
If duration is not clear from the context, default to "day".`,
    },
    ...(chat_history.map(({ role, content }) => ({
      role,
      content: [{ type: "text", text: content }],
    })) as any),
    {
      role: "user",
      content: [{ type: "text", text: input }],
    },
  ];

  const { object } = await generateObject({
    model,
    messages: prompt,
    schema: achievementResponseSchema,
  });

  // Convert string dates to Date objects and ensure all properties are included
  return {
    title: object.title,
    summary: object.summary || "",
    details: object.details || "",
    eventDuration: object.eventDuration,
    eventStart: object.eventStart ? new Date(object.eventStart) : null,
    eventEnd: object.eventEnd ? new Date(object.eventEnd) : null,
    companyId: object.companyId,
    projectId: object.projectId,
    impact: object.impact,
    impactSource: 'llm',
    impactUpdatedAt: new Date(),
    // suggestNewProject: object.suggestNewProject
  };
}

export type ChatMessage = {
  role: "user" | "assistant" | "system" | "data";
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

export type ExtractedAchievement = Pick<Achievement, 
  'title' | 'summary' | 'details' | 'eventDuration' | 
  'eventStart' | 'eventEnd' | 'companyId' | 'projectId' |
  'impact' | 'impactSource' | 'impactUpdatedAt'
> & {
  suggestNewProject?: boolean;
};

export async function* extractAchievements(
  input: ExtractAchievementsInput
): AsyncGenerator<ExtractedAchievement, void, unknown> {
  const chatStr = input.chat_history
    .map(({ role, content }) => `${role}: ${content}`)
    .join("\n");

  const companiesStr = input.context.companies
    .map(
      (company) => `
Name: ${company.name} (ID: ${company.id})
Role: ${company.role}
Domain: ${company.domain || "N/A"}
Start Date: ${company.startDate}
End Date: ${company.endDate || "Present"}
    `
    )
    .join("\n");

  const projectsStr = input.context.projects
    .map(
      (project) => `
Name: ${project.name} (ID: ${project.id})
Company: ${project.companyId || "N/A"}
Description: ${project.description}
Start Date: ${project.startDate || "N/A"}
End Date: ${project.endDate || "N/A"}
    `
    )
    .join("\n");

  const prompt = `Extract all achievements from the following user message. Consider the chat history and context to understand the full scope of each achievement. Pay special attention to:
1. Recent updates or progress reports
2. Completed milestones or phases
3. Team growth or leadership responsibilities
4. Quantitative metrics or impact
5. Technical implementations or solutions

[User Message]:
${input.input}

[Chat History]:
${chatStr}

[Context]:

Companies:
${companiesStr}

Projects:
${projectsStr}

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
2. A concise summary highlighting key metrics and impact
3. Detailed description including context and significance
4. Event duration (day/week/month/quarter/half year/year)
5. Related company ID (or null if none)
6. Related project ID (or null if none)
7. Whether to suggest creating a new project (true/false)
8. Impact rating (1-3) based on these criteria:
   - Level 1 (Low): Routine tasks, individual/small team benefit, short-term impact
   - Level 2 (Medium): Notable improvements, team/department benefit, medium-term impact
   - Level 3 (High): Major initiatives, org-wide benefit, long-term strategic impact
9. Brief explanation of the impact rating choice

Extract ONE achievement at a time, responding with each achievement as you find it.
Each achievement should be complete and self-contained.

Today's date is ${new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}.`;

  const {elementStream} = await streamObject({
    model: customModel("gpt-4o"),
    prompt,
    temperature: 0.5,
    output: 'array',
    schema: achievementResponseSchema
  });

  for await (const element of elementStream) {
    yield {
      title: element.title,
      summary: element.summary || "",
      details: element.details || "",
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
