import { generateObject, generateText } from 'ai';
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

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const scenarioSchema = z.object({
  description: z.string(),
  companies: z.array(
    z.object({
      id: z.string().regex(uuidRegex),
      name: z.string(),
      role: z.string(),
      domain: z.string().optional(),
      startDate: z.string().datetime(),
      endDate: z.string().datetime().optional(),
    }),
  ),
  projects: z.array(
    z.object({
      id: z.string().regex(uuidRegex),
      name: z.string(),
      companyId: z.string().regex(uuidRegex).optional(),
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

  // Pre-generate UUIDs for companies and projects
  const companyIds = Array(5).fill(null).map(() => uuidv4());
  const projectIds = Array(10).fill(null).map(() => uuidv4());

  const {text: companyNames} = await generateText({
    model,
    maxRetries: 3,
    temperature: 0.9,
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant that generates company names.',
      },
      {
        role: 'user',
        content: 'Generate 5 company names, each on a new line without any other text, characters or markup',
      },
    ],
  });

  console.log(companyNames)

  const { object } = await generateObject({
    model,
    maxRetries: 3,
    temperature: 0.9,
    messages: [
      {
        role: 'system',
        content: `You are a helpful assistant that creates detailed scenarios for testing a brag tracking application. 
        Generate realistic scenarios with specific company names, project names, and dates.
        
        Use these pre-generated UUIDs for companies: ${JSON.stringify(companyIds)}
        Use these pre-generated UUIDs for projects: ${JSON.stringify(projectIds)}

        Use these pre-generated company names:
        ${companyNames}
        
        Use realistic dates within the last 12 months (between ${new Date(
          Date.now() - 365 * 24 * 60 * 60 * 1000,
        ).toISOString()} and ${new Date().toISOString()}).
        
        IMPORTANT: 
        - All dates must be in ISO 8601 format with timezone (e.g. "2024-12-14T00:00:00Z")
        - Do not use "Present" or any other text for dates - use actual dates
        - When referencing a company ID in a project's companyId, use one of the provided company UUIDs
        - Each company and project must use one of the provided UUIDs`,
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
    userId: uuidv4(),
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

export async function generateAchievements(
  scenario: ConversationScenario,
  numAchievements = 3,
): Promise<Achievement[]> {
  const model = openai('gpt-4o');

  console.log('Generating achievements...');

  const { object } = await generateObject({
    model,
    maxRetries: 3,
    temperature: 1,
    messages: [
      {
        role: 'system',
        content: `You are generating realistic professional achievements ("brags") for testing a brag tracking application.
Generate ${numAchievements} achievements that could plausibly come from the given scenario and timeframe.

For each achievement:
1. Make it specific and measurable
2. Include both technical and non-technical aspects
3. Reference real companies and projects from the scenario
4. Use appropriate timeframes within the scenario dates
5. Include quantifiable metrics and qualitative impact

Output a list of achievements, each with:
- title: Concise, action-oriented one-line title
- summary: 1-2 sentence summary focusing on impact and metrics
- details: 2-3 sentence description including challenge, approach, and outcome
- eventStart: Start date in ISO 8601 format with timezone
- eventEnd: End date in ISO 8601 format with timezone
- eventDuration: One of: "day", "week", "month", "quarter", "half year", "year"
- companyId: ID of associated company (if any)
- projectId: ID of associated project (if any)`,
      },
      {
        role: 'user',
        content: `Generate ${numAchievements} achievements for this scenario:
${JSON.stringify(scenario, null, 2)}`,
      },
    ],
    schema: achievementSchema,
  });

  return object.achievements.map<Achievement>((a) => ({
    id: uuidv4(),
    userId: scenario.userId,
    userMessageId: uuidv4(),
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
    impact: 2,
    impactSource: 'llm',
    impactUpdatedAt: new Date(),
  }));
}

export async function generateMessageFromAchievements(
  scenario: ConversationScenario,
  achievements: Achievement[],
): Promise<Conversation> {
  const model = openai('gpt-4o');

  console.log('Generating message from achievements...');

  const { text } = await generateText({
    model,
    maxRetries: 3,
    temperature: 0.9,
    system: `You are generating a natural message from a user to an AI assistant that helps track professional achievements.
The message should naturally describe specific pre-defined achievements in a way that feels like a real user sharing their accomplishments.

Guidelines for the message:
1. Make the message feel natural and conversational
2. Use natural language that a real user would use
3. The user is likely to use this tool many times per month, so they are likely to use short messages without more context than would be needed to figure out which project the company is for. If the user only has a single project, they probably won't mention it.
4. Users typically only work at one company at a time, so are unlikely to mention the company name in their message

Examples of good messages:

<examples>
- I deployed the new Companies CRUD pages to production
- Sped up the MyProject deployment process from 3 hours to 15 minutes
- Fixed 7 UX bugs in the new dashboard for AutoFocus
</examples>
`,
    prompt: `Generate a natural message that covers these achievements:
Scenario: ${JSON.stringify(scenario, null, 2)}
Achievements: ${JSON.stringify(achievements, null, 2)}`,
  });

  // Get the timestamp for the message, ensuring it's within the scenario timeframe
  const messageTime = new Date(
    Math.min(
      Math.max(
        scenario.timeframe.start.getTime(),
        new Date('2025-01-06T11:13:15-05:00').getTime(),
      ),
      scenario.timeframe.end.getTime(),
    ),
  );

  return {
    id: uuidv4(),
    messages: [
      {
        role: 'user',
        content: text,
        timestamp: messageTime,
      },
    ],
    scenario,
  };
}

export async function generateTestData(
  template: ScenarioTemplate,
  numAchievements = 3,
): Promise<GeneratedTestData> {
  const scenario = await generateScenario(template);
  const expectedAchievements = await generateAchievements(scenario, numAchievements);
  const conversation = await generateMessageFromAchievements(
    scenario,
    expectedAchievements,
  );

  return {
    scenario,
    conversation,
    expectedAchievements,
  };
}
