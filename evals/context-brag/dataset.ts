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
  const examples: ContextAchievementExample[] = [];

  // Find messages that contain achievements
  const achievementMessages = findAchievementsInConversation(data.conversation);

  // For each message that contains achievements
  achievementMessages.forEach((message, messageIndex) => {
    // Get the chat history up to this message
    const chatHistory = data.conversation.messages
      .slice(0, messageIndex + 1)
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));

    examples.push({
      input: {
        input: message,
        chat_history: chatHistory as ChatMessage[],
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
    });
  });

  return examples;
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
