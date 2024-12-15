import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { Brag } from '../../evals/types';

// Schema for validating LLM response
const bragResponseSchema = z.object({
  title: z.string(),
  summary: z.string(),
  details: z.string(),
  eventStart: z.string().datetime(),
  eventEnd: z.string().datetime(),
  eventDuration: z.enum(['day', 'week', 'month', 'quarter', 'year'])
});

export async function extractBrag({ input, chat_history }: { input: string; chat_history: { role: string; content: string }[] }): Promise<Brag> {
  const model = openai.chat("gpt-4");

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
  - eventDuration: Must be one of: "day", "week", "month", "quarter", "year"

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
    eventEnd: new Date(object.eventEnd)
  };
}
