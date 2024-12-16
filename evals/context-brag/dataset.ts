import { type ExtractBragsInput, type ExtractedBrag } from '../../lib/ai/extract';
import { type GeneratedTestData } from '../conversation-gen/types';

export type ContextBragExample = {
  input: ExtractBragsInput;
  expected: ExtractedBrag[];
};

function findBragsInConversation(conversation: GeneratedTestData['conversation']): string[] {
  // Look for user messages that contain achievements
  const userMessages = conversation.messages.filter(m => m.role === 'user');
  // For now, return all user messages as potential brag sources
  // TODO: Make this smarter by looking for actual achievement content
  return userMessages.map(m => m.content);
}

export function convertGeneratedToEvalExample(data: GeneratedTestData): ContextBragExample[] {
  const examples: ContextBragExample[] = [];
  
  // Find messages that contain brags
  const bragMessages = findBragsInConversation(data.conversation);
  
  // For each message that contains brags
  bragMessages.forEach((message, messageIndex) => {
    // Get the chat history up to this message
    const chatHistory = data.conversation.messages
      .slice(0, messageIndex + 1)
      .map(m => ({ role: m.role, content: m.content }));

    // Find expected brags for this message
    const expectedBrags = data.expectedBrags.filter(brag => {
      // TODO: Add logic to match brags to specific messages
      // For now, associate all brags with the first message
      return messageIndex === 0;
    });

    if (expectedBrags.length > 0) {
      examples.push({
        input: {
          input: message,
          chat_history: chatHistory,
          context: {
            companies: data.scenario.companies,
            projects: data.scenario.projects
          }
        },
        expected: expectedBrags
      });
    }
  });

  return examples;
}

// Load and convert all generated test data
import fs from 'fs';
import path from 'path';

const generatedDir = path.join(__dirname, '../conversation-gen/generated');
export const contextBragExamples = fs
  .readdirSync(generatedDir)
  .filter(f => f.endsWith('.json'))
  .flatMap(file => {
    const data = JSON.parse(
      fs.readFileSync(path.join(generatedDir, file), 'utf-8')
    ) as GeneratedTestData;
    return convertGeneratedToEvalExample(data);
  });
