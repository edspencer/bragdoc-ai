import type {
  ExtractAchievementsInput,
  ExtractedAchievement,
  ChatMessage,
} from '../../lib/ai/extract';
import type { GeneratedTestData } from '../conversation-gen/types';

export type ContextAchievementExample = {
  input: ExtractAchievementsInput;
  expected: ExtractedAchievement[];
};

function findAchievementsInConversation(
  conversation: GeneratedTestData['conversation'],
): string[] {
  // Look for user messages that contain achievements
  const userMessages = conversation.messages.filter((m) => m.role === 'user');
  // For now, return all user messages as potential achievement sources
  // TODO: Make this smarter by looking for actual achievement content
  return userMessages.map((m) => m.content);
}

export function convertGeneratedToEvalExample(
  data: GeneratedTestData,
): ContextAchievementExample[] {
  return [{
    input: {
      input: data.conversation.messages[data.conversation.messages.length - 1].content,
      chat_history: data.conversation.messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })) as ChatMessage[],
      context: {
        companies: data.scenario.companies.map((c) => ({
          id: c.id,
          name: c.name,
          role: c.role,
          domain: c.domain,
          startDate: c.startDate,
          endDate: c.endDate,
        })),
        projects: data.scenario.projects.map((p) => ({
          id: p.id,
          name: p.name,
          companyId: p.companyId,
          description: p.description,
          startDate: p.startDate,
          endDate: p.endDate,
        })),
      },
    },
    expected: data.expectedAchievements,
  }];
}

// Load and convert all generated test data
import fs from 'node:fs';
import path from 'node:path';

const generatedDir = path.join(__dirname, '../conversation-gen/generated');

function parseDate(dateStr: string | undefined): Date | undefined {
  return dateStr ? new Date(dateStr) : undefined;
}

function parseGeneratedTestData(data: any): GeneratedTestData {
  return {
    scenario: {
      ...data.scenario,
      companies: data.scenario.companies.map((c: any) => ({
        ...c,
        startDate: parseDate(c.startDate)!,
        endDate: parseDate(c.endDate),
      })),
      projects: data.scenario.projects.map((p: any) => ({
        ...p,
        startDate: parseDate(p.startDate),
        endDate: parseDate(p.endDate),
      })),
    },
    conversation: {
      ...data.conversation,
      messages: data.conversation.messages.map((m: any) => ({
        ...m,
        timestamp: parseDate(m.timestamp)!,
      })),
    },
    expectedAchievements: data.expectedAchievements || [],
  };
}

export const contextAchievementExamples = fs
  .readdirSync(generatedDir)
  .filter((f) => f.endsWith('.json'))
  .flatMap((file) => {
    const rawData = JSON.parse(
      fs.readFileSync(path.join(generatedDir, file), 'utf-8'),
    );
    const data = parseGeneratedTestData(rawData);

    return convertGeneratedToEvalExample(data);
  });
