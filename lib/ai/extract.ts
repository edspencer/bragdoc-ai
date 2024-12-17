import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { Brag } from '../../evals/types';

// Schema for validating LLM response
const bragResponseSchema = z.object({
  title: z.string().min(1), // Ensure non-empty title
  summary: z.string(),
  details: z.string(),
  eventStart: z.string().datetime(),
  eventEnd: z.string().datetime(),
  eventDuration: z.enum(['day', 'week', 'month', 'quarter', 'half year', 'year']),
  companyId: z.string().nullable(),
  projectId: z.string().nullable(),
  suggestNewProject: z.boolean()
});

const titleQualitySchema = z.string()
  .min(10, "Title must be at least 10 characters")
  .max(256, "Title must be at most 256 characters")
  // .refine(
  //   (title) => {
  //     // Check for metrics or specific achievements
  //     const hasMetrics = /\d+%|\d+x|\d+\+?(?:\s+[a-zA-Z]+\b)/.test(title);
  //     const hasSpecifics = /team|platform|system|framework|api|service|feature|product|project|initiative/i.test(title);
  //     return hasMetrics || hasSpecifics;
  //   },
  //   "Title should include specific metrics or achievements"
  // );

export async function extractBrag({ input, chat_history }: { input: string; chat_history: { role: string; content: string }[] }): Promise<Brag> {
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
    schema: bragResponseSchema,
  });

  // Convert string dates to Date objects and ensure all properties are included
  return {
    title: object.title,
    summary: object.summary,
    details: object.details,
    eventDuration: object.eventDuration,
    eventStart: new Date(object.eventStart),
    eventEnd: new Date(object.eventEnd),
    companyId: object.companyId,
    projectId: object.projectId,
    // suggestNewProject: object.suggestNewProject
  };
}

export type ChatMessage = {
  role: "user" | "assistant" | "system" | "data";
  content: string;
};

export type ExtractBragsInput = {
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

export type ExtractedBrag = {
  title: string;
  summary: string;
  details: string;
  eventDuration: string;
  companyId: string | null;
  projectId: string | null;
  suggestNewProject?: boolean;
};

export async function extractBrags(
  input: ExtractBragsInput
): Promise<ExtractedBrag[]> {
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

Extract ALL distinct achievements from the message, even small ones.
Each achievement should be complete and self-contained.

Today's date is ${new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}.`;

  const { object } = await generateObject({
    model: openai("gpt-4o"),
    prompt,
    output: 'array',
    schema: z.object({
        title: titleQualitySchema,
        summary: z.string(),
        details: z.string(),
        eventDuration: z.enum(["day", "week", "month", "quarter", "half year", "year"]),
        companyId: z.string().nullable(),
        projectId: z.string().nullable(),
        suggestNewProject: z.boolean(),

    })
  });

  return object;
}
