import { streamObject } from 'ai';

import {extractAchievementsModel} from '@/lib/ai';
import type { Achievement, Company, Project, User } from '../db/schema';
import {achievementResponseSchema } from './llm-object-schema';
import { getCompaniesByUserId } from '../db/queries';
import { getProjectsByUserId } from '../db/projects/queries';

import { renderCompanies, renderProjects } from './renderers';

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

export type PrepareExtractAchievementsPromptData = {
  user: User;
  input: string;
  chatHistory: ChatMessage[];
}

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system' | 'data';
  content: string;
};

export type ExtractAchievementsInput = {
  input: string;
  chatHistory: ChatMessage[];
  companies: Array<Company>;
  projects: Array<Project>;
};

export function renderPrompt(input: ExtractAchievementsInput) {
  const chatStr = input.chatHistory
    .map(({ role, content }) => `${role}: ${content}`)
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
${renderCompanies(input.companies)}
${renderProjects(input.projects)}
</context>

<today>
${today}
</today>

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
message, you should use them to inform your extraction.`;

  return prompt;
}

export async function preparePromptData(props: PrepareExtractAchievementsPromptData): Promise<ExtractAchievementsInput> {
  const {user, input, chatHistory} = props;

  const [projects, companies] = await Promise.all([
    getProjectsByUserId(user.id),
    getCompaniesByUserId({ userId: user.id }),
  ]);

  return {
    input,
    chatHistory,
    companies,
    projects,
  }
}

export async function* extractAchievements(input: ExtractAchievementsInput): AsyncGenerator<ExtractedAchievement, void, unknown> {
  const prompt = renderPrompt(input);

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
