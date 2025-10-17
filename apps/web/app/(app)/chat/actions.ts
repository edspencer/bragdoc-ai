'use server';

import { generateText } from 'ai';
import { routerModel } from '@/lib/ai';
import type { ChatMessage } from '@/lib/types';
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
} from '@bragdoc/database';

export async function generateTitleFromUserMessage({
  message,
}: {
  message: ChatMessage;
}): Promise<string> {
  try {
    // Extract text from message parts
    let messageText = '';
    for (const part of message.parts) {
      if (part.type === 'text' && 'text' in part) {
        messageText += part.text + ' ';
      }
    }

    if (!messageText.trim()) {
      return 'New Chat';
    }

    const { text: title } = await generateText({
      model: routerModel,
      prompt: `Generate a short, concise title (3-5 words) for a chat that starts with this message: "${messageText.trim()}".

      Return ONLY the title text, nothing else. Do not use quotes.`,
    });

    return title.trim() || 'New Chat';
  } catch (error) {
    console.error('Error generating title:', error);
    return 'New Chat';
  }
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  try {
    const [message] = await getMessageById({ id });

    if (!message) {
      return;
    }

    await deleteMessagesByChatIdAfterTimestamp({
      chatId: message.chatId,
      timestamp: message.createdAt,
    });
  } catch (error) {
    console.error('Error deleting trailing messages:', error);
    throw error;
  }
}

export async function saveChatModelAsCookie(_modelId: string) {
  // Note: Model selection is handled by our LLM router automatically
  // This function is a no-op placeholder for compatibility with the UI
  // TODO: Remove model selector UI in Phase 10 as per plan
  return;
}
