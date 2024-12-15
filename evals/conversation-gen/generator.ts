import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { type ConversationScenario, type Conversation, type GeneratedTestData, type Message } from './types';
import { SCENARIO_TEMPLATES, type ScenarioTemplate } from './templates';

const scenarioSchema = z.object({
  description: z.string(),
  companies: z.array(z.object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
    domain: z.string().optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional()
  })),
  projects: z.array(z.object({
    id: z.string(),
    name: z.string(),
    companyId: z.string().optional(),
    description: z.string(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  })),
  userPersona: z.string(),
  timeframe: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  })
});

const messageSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
    timestamp: z.string().datetime()
  }))
});

const bragSchema = z.object({
  brags: z.array(z.object({
    text: z.string(),
    date: z.string().datetime(),
    companyId: z.string().optional(),
    projectId: z.string().optional(),
    type: z.enum(["technical", "leadership", "personal"])
  }))
});

export async function generateScenario(template: ScenarioTemplate): Promise<ConversationScenario> {
  const { prompt } = SCENARIO_TEMPLATES[template];
  const model = openai.chat("gpt-4");
  
  const { object } = await generateObject({
    model,
    messages: [
      {
        role: "system",
        content: `You are a helpful assistant that creates detailed scenarios for testing a brag tracking application. 
        Generate realistic scenarios with specific company names, project names, and dates. 
        Use realistic dates within the last 2 years.
        IMPORTANT: All dates must be in ISO 8601 format with timezone (e.g. "2024-12-14T00:00:00Z").
        Do not use "Present" or any other text for dates - use actual dates.`
      },
      {
        role: "user",
        content: prompt
      }
    ],
    schema: scenarioSchema,
  });

  return {
    ...object,
    companies: object.companies.map(c => ({
      ...c,
      startDate: new Date(c.startDate),
      endDate: c.endDate ? new Date(c.endDate) : undefined
    })),
    projects: object.projects.map(p => ({
      ...p,
      startDate: p.startDate ? new Date(p.startDate) : undefined,
      endDate: p.endDate ? new Date(p.endDate) : undefined
    })),
    timeframe: {
      start: new Date(object.timeframe.start),
      end: new Date(object.timeframe.end)
    }
  };
}

export async function generateConversation(
  scenario: ConversationScenario,
  numTurns: number
): Promise<Conversation> {
  const model = openai.chat("gpt-4");
  
  const { object } = await generateObject({
    model,
    messages: [
      {
        role: "system",
        content: `You are simulating a conversation between a user and an AI assistant that helps track professional and personal achievements ("brags").
The conversation should be natural and include:
- The user sharing updates about their work and achievements
- The AI asking relevant follow-up questions
- References to companies (${scenario.companies.map(c => c.name).join(', ')})
- References to projects (${scenario.projects.map(p => p.name).join(', ')})
- Mix of direct achievements and casual conversation
IMPORTANT: All timestamps must be in ISO 8601 format with timezone (e.g. "2024-12-14T00:00:00Z").`
      },
      {
        role: "user",
        content: `Generate a natural conversation with ${numTurns} total messages between the user and AI assistant.
Context:
${JSON.stringify(scenario, null, 2)}`
      }
    ],
    schema: messageSchema,
  });

  return {
    id: uuidv4(),
    messages: object.messages.map(m => ({
      ...m,
      timestamp: new Date(m.timestamp)
    })),
    scenario
  };
}

export async function generateExpectedBrags(
  conversation: Conversation,
  context: ConversationScenario
): Promise<GeneratedTestData['expectedBrags']> {
  const model = openai.chat("gpt-4");
  
  const { object } = await generateObject({
    model,
    messages: [
      {
        role: "system",
        content: `You are analyzing a conversation to extract achievements ("brags") with their associated company and project context.
For each achievement mentioned in the conversation, output a brag object with:
- text: The achievement text
- date: When it occurred (must be ISO 8601 format with timezone, e.g. "2024-12-14T00:00:00Z")
- companyId: ID of the company it's associated with (if any)
- projectId: ID of the project it's associated with (if any)
- type: The type of achievement (e.g., "technical", "leadership", "personal")`
      },
      {
        role: "user",
        content: `Extract brags from this conversation, using the provided context to properly attribute them to companies and projects:

Context:
${JSON.stringify(context, null, 2)}

Conversation:
${JSON.stringify(conversation.messages, null, 2)}`
      }
    ],
    schema: bragSchema,
  });

  return object.brags.map(b => ({
    ...b,
    date: new Date(b.date)
  }));
}

export async function generateTestData(template: ScenarioTemplate, numTurns = 10): Promise<GeneratedTestData> {
  const scenario = await generateScenario(template);
  const conversation = await generateConversation(scenario, numTurns);
  const expectedBrags = await generateExpectedBrags(conversation, scenario);

  return {
    scenario,
    conversation,
    expectedBrags
  };
}
