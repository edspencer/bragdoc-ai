import { type ContextBragExample } from './types';
import { type GeneratedTestData } from '../conversation-gen/types';

function findBragInConversation(conversation: GeneratedTestData['conversation']): string | undefined {
  // Look for user messages that contain achievements
  const userMessages = conversation.messages.filter(m => m.role === 'user');
  // For now, just return the first user message
  // TODO: Make this smarter by looking for actual achievement content
  return userMessages[0]?.content;
}

export function convertGeneratedToEvalExample(data: GeneratedTestData): ContextBragExample[] {
  const examples: ContextBragExample[] = [];
  
  // Find user messages that contain brags
  const bragMessage = findBragInConversation(data.conversation);
  if (!bragMessage) return examples;

  // Get the chat history leading up to this message
  const chatHistory = data.conversation.messages
    .map(m => ({ role: m.role, content: m.content }));

  // For each expected brag, create an example
  data.expectedBrags.forEach(brag => {
    examples.push({
      input: {
        input: bragMessage,
        chat_history: chatHistory,
        context: {
          companies: data.scenario.companies,
          projects: data.scenario.projects
        }
      },
      expected: {
        brag,
        companyId: brag.companyId,
        projectId: brag.projectId,
        suggestNewProject: false // TODO: Infer from context
      }
    });
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
