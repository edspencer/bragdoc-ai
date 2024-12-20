import type { ExtractAchievementsInput, ExtractedAchievement } from '../../lib/ai/extract';
import type { GeneratedTestData } from '../conversation-gen/types';
import type { ContextAchievementExample } from './types';

export type ContextAchievementExample = {
  input: ExtractAchievementsInput;
  expected: ExtractedAchievement[];
};

function findAchievementsInConversation(conversation: GeneratedTestData['conversation']): string[] {
  // Look for user messages that contain achievements
  const userMessages = conversation.messages.filter(m => m.role === 'user');
  // For now, return all user messages as potential achievement sources
  // TODO: Make this smarter by looking for actual achievement content
  return userMessages.map(m => m.content);
}

export function convertGeneratedToEvalExample(data: GeneratedTestData): ContextAchievementExample[] {
  const examples: ContextAchievementExample[] = [];
  
  // Find messages that contain achievements
  const achievementMessages = findAchievementsInConversation(data.conversation);
  
  // For each message that contains achievements
  achievementMessages.forEach((message, messageIndex) => {
    // Get the chat history up to this message
    const chatHistory = data.conversation.messages
      .slice(0, messageIndex + 1)
      .map(m => ({ role: m.role, content: m.content }));

    // Find expected achievements for this message
    const expectedAchievements = data.expectedAchievements.filter(achievement => {
      // TODO: Add logic to match achievements to specific messages
      // For now, associate all achievements with the first message
      return messageIndex === 0;
    });

    if (expectedAchievements.length > 0) {
      examples.push({
        input: {
          input: message,
          chat_history: chatHistory,
          context: {
            companies: data.scenario.companies,
            projects: data.scenario.projects
          }
        },
        expected: expectedAchievements
      });
    }
  });

  return examples;
}

// Load and convert all generated test data
import fs from 'node:fs';
import path from 'node:path';

const generatedDir = path.join(__dirname, '../conversation-gen/generated');
export const contextAchievementExamples = fs
  .readdirSync(generatedDir)
  .filter(f => f.endsWith('.json'))
  .flatMap(file => {
    const data = JSON.parse(
      fs.readFileSync(path.join(generatedDir, file), 'utf-8')
    ) as GeneratedTestData;
    return convertGeneratedToEvalExample(data);
  });
