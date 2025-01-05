import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import type {
  ConversationScenario,
  Conversation,
  GeneratedTestData,
} from './types';
import type { Achievement } from '../../lib/db/schema';
import { SCENARIO_TEMPLATES, type ScenarioTemplate } from './templates';

const scenarioSchema = z.object({
  description: z.string(),
  companies: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      role: z.string(),
      domain: z.string().optional(),
      startDate: z.string().datetime(),
      endDate: z.string().datetime().optional(),
    }),
  ),
  projects: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      companyId: z.string().optional(),
      description: z.string(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    }),
  ),
  userPersona: z.string(),
  timeframe: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
});

const messageSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
      timestamp: z.string().datetime(),
    }),
  ),
});

const achievementSchema = z.object({
  achievements: z.array(
    z.object({
      title: z.string(),
      summary: z.string(),
      details: z.string(),
      eventStart: z.string().nullable(),
      eventEnd: z.string().nullable(),
      eventDuration: z.enum([
        'day',
        'week',
        'month',
        'quarter',
        'half year',
        'year',
      ]),
      companyId: z.string().nullable(),
      projectId: z.string().nullable(),
    }),
  ),
});

export async function generateScenario(
  template: ScenarioTemplate,
): Promise<ConversationScenario> {
  const { prompt } = SCENARIO_TEMPLATES[template];
  const model = openai('gpt-4o');

  console.log('Generating scenario...');

  const { object } = await generateObject({
    model,
    maxRetries: 3,
    messages: [
      {
        role: 'system',
        content: `You are a helpful assistant that creates detailed scenarios for testing a brag tracking application. 
        Generate realistic scenarios with specific company names, project names, and dates. 
        Use realistic dates within the last 12 months (between ${new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()} and ${new Date().toISOString()}).
        IMPORTANT: All dates must be in ISO 8601 format with timezone (e.g. "2024-12-14T00:00:00Z").
        Do not use "Present" or any other text for dates - use actual dates.`,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    schema: scenarioSchema,
  });

  console.log('Generated scenario:', object);

  return {
    ...object,
    userId: uuidv4(), // Add test user ID
    companies: object.companies.map((c) => ({
      ...c,
      startDate: new Date(c.startDate),
      endDate: c.endDate ? new Date(c.endDate) : undefined,
    })),
    projects: object.projects.map((p) => ({
      ...p,
      startDate: p.startDate ? new Date(p.startDate) : undefined,
      endDate: p.endDate ? new Date(p.endDate) : undefined,
    })),
    timeframe: {
      start: new Date(object.timeframe.start),
      end: new Date(object.timeframe.end),
    },
  };
}

export async function generateConversation(
  scenario: ConversationScenario,
  numTurns: number,
): Promise<Conversation> {
  const model = openai('gpt-4o');

  console.log('Generating conversation...');

  const { object } = await generateObject({
    model,
    maxRetries: 3,
    messages: [
      {
        role: 'system',
        content: `You are simulating messages from a user to an AI assistant that helps track professional and personal achievements ("brags").
The user should send multiple messages over time (spanning several weeks or months) sharing:

1. Initial achievements and updates
- Bundle multiple related achievements in single messages
- Include both major milestones and supporting achievements
- Mix technical accomplishments with leadership/impact
- Combine project updates with personal growth

2. Follow-up messages about previous topics
- Multiple progress updates on different ongoing projects
- Quantitative results and qualitative impact
- Unexpected challenges overcome
- Team growth and dynamics

3. New developments
- Multiple parallel initiatives starting
- Cross-project or cross-company achievements
- Skill development across different areas
- Community impact and mentorship

Each message should:
- Contain 2-4 distinct achievements
- Have clear, action-oriented titles for each achievement
- Reference specific companies (${scenario.companies.map((c) => c.name).join(', ')})
- Reference specific projects (${scenario.projects.map((p) => p.name).join(', ')})
- Include both technical and non-technical achievements
- Mention specific metrics and impact
- Feel natural and conversational
- Build on previous updates when relevant

Example achievement titles:
- "Led Migration of 200+ Services to Cloud Platform"
- "Grew Team from 5 to 12 Engineers"
- "Reduced API Response Time by 40%"
- "Launched New Customer Dashboard with 98% Satisfaction"

The AI assistant should give brief, encouraging responses but the focus should be on the user's detailed updates.
IMPORTANT: All timestamps must be in ISO 8601 format with timezone (e.g. "2024-12-14T00:00:00Z").
Space out the timestamps to simulate updates over several weeks/months within the scenario timeframe.`,
      },
      {
        role: 'user',
        content: `Generate a natural conversation with ${numTurns} total messages between the user and AI assistant.
Context:
${JSON.stringify(scenario, null, 2)}`,
      },
    ],
    schema: messageSchema,
  });

  return {
    id: uuidv4(),
    messages: object.messages.map((m) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    })),
    scenario,
  };
}

export async function generateExpectedAchievements(
  conversation: Conversation,
  context: ConversationScenario,
): Promise<GeneratedTestData['expectedAchievements']> {
  const model = openai('gpt-4o');

  console.log('Generating expected achievements...');

  const { object } = await generateObject({
    model,
    maxRetries: 3,
    messages: [
      {
        role: 'system',
        content: `You are analyzing a conversation to extract achievements ("brags") with their associated company and project context.
For each achievement mentioned in the conversation, output a brag object with:
- title: A concise one-line title for the achievement (e.g. "Led development of new CRM system")
- summary: A 1-2 sentence summary focusing on the impact and metrics (e.g. "Successfully delivered new CRM system on time and within budget, resulting in 20% efficiency increase for sales team")
- details: A detailed 2-3 sentence description including the challenge, approach, and outcome
- eventStart: When the achievement began (must be ISO 8601 format with timezone)
- eventEnd: When the achievement completed (must be ISO 8601 format with timezone) 
- eventDuration: The duration of the achievement (must be one of: "day", "week", "month", "quarter", "half year", "year")
- companyId: ID of the company it's associated with (if any)
- projectId: ID of the project it's associated with (if any)

Make sure to:
1. Keep titles concise and action-oriented
2. Include specific metrics and impacts in summaries
3. Provide rich context in details
4. Use appropriate durations (e.g. "day" for a presentation, "quarter" for a project phase)`,
      },
      {
        role: 'user',
        content: `Extract achievements from this conversation, using the provided context to properly attribute them to companies and projects:

Context:
${JSON.stringify(context, null, 2)}

Conversation:
${JSON.stringify(conversation.messages, null, 2)}`,
      },
    ],
    schema: achievementSchema,
  });

  return object.achievements.map<Achievement>((a) => ({
    id: uuidv4(),
    userId: conversation.scenario.userId,
    userMessageId: uuidv4(), // Since this is test data, we'll generate a new ID
    createdAt: new Date(),
    updatedAt: new Date(),
    eventStart: a.eventStart ? new Date(a.eventStart) : null,
    eventEnd: a.eventEnd ? new Date(a.eventEnd) : null,
    eventDuration: a.eventDuration,
    title: a.title,
    summary: a.summary,
    details: a.details,
    companyId: a.companyId,
    projectId: a.projectId,
    isArchived: false,
    source: 'llm',
    impact: 2, // Default to medium impact
    impactSource: 'llm',
    impactUpdatedAt: new Date(),
  }));
}

export async function generateTestData(
  template: ScenarioTemplate,
  numTurns = 50,
): Promise<GeneratedTestData> {
  const scenario = await generateScenario(template);
  const conversation = await generateConversation(scenario, numTurns);
  const expectedAchievements = await generateExpectedAchievements(
    conversation,
    scenario,
  );

  return {
    scenario,
    conversation,
    expectedAchievements,
  };
}
