'use server';

import { auth } from '@/lib/better-auth/server';
import { headers } from 'next/headers';
import { db } from '@/database/index';
import { document, chat, message } from '@/database/schema';
import { eq, and } from 'drizzle-orm';
import { generateUUID } from '@/lib/utils';
import { generateTitleFromUserMessage } from '@/app/(app)/chat/actions';
import type { ChatMessage } from '@/lib/types';
import { revalidatePath } from 'next/cache';

/**
 * Creates a new document with an associated chat in a single transaction.
 * This ensures that either both are created or neither are created (atomicity).
 *
 * @param title - The title of the document
 * @returns Object with documentId and chatId, or error
 */
export async function createDocumentWithChat(
  title: string,
): Promise<
  | { success: true; documentId: string; chatId: string }
  | { success: false; error: string }
> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!title.trim()) {
      return { success: false, error: 'Document title is required' };
    }

    const documentId = generateUUID();
    const chatId = generateUUID();
    const messageId = generateUUID();

    // Create initial user message for title generation
    const initialMessage: ChatMessage = {
      id: messageId,
      role: 'user',
      parts: [
        {
          type: 'text',
          text: `I want to create a document titled "${title.trim()}". Help me write it.`,
        },
      ],
    };

    // Generate chat title from the message
    const chatTitle = await generateTitleFromUserMessage({
      message: initialMessage,
    });

    // Execute operations sequentially (neon-http doesn't support transactions)
    try {
      // Create the chat first
      await db.insert(chat).values({
        id: chatId,
        createdAt: new Date(),
        userId: session.user.id,
        title: chatTitle,
      });

      // Create the initial message
      await db.insert(message).values({
        id: messageId,
        chatId: chatId,
        role: 'user',
        parts: initialMessage.parts as any,
        attachments: [],
        createdAt: new Date(),
      });

      // Create the document with the chatId reference
      await db.insert(document).values({
        id: documentId,
        title: title.trim(),
        content: '',
        kind: 'text',
        userId: session.user.id,
        chatId: chatId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Revalidate the reports page to show the new document
      revalidatePath('/reports');

      return { success: true, documentId, chatId };
    } catch (insertError) {
      // Cleanup on failure
      console.error('Error creating document with chat:', insertError);
      try {
        await db.delete(message).where(eq(message.id, messageId));
        await db.delete(chat).where(eq(chat.id, chatId));
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
      throw insertError;
    }
  } catch (error) {
    console.error('Error creating document with chat:', error);
    return {
      success: false,
      error: 'Failed to create document. Please try again.',
    };
  }
}

/**
 * Links an existing document to a chat by updating the chatId field.
 * Used when loading a document that doesn't have an associated chat yet.
 *
 * @param documentId - The ID of the document to update
 * @param chatId - The ID of the chat to link
 * @returns Success or error
 */
export async function linkDocumentToChat(
  documentId: string,
  chatId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // Update document with chatId, but only if it belongs to the user
    const result = await db
      .update(document)
      .set({ chatId, updatedAt: new Date() })
      .where(
        and(eq(document.id, documentId), eq(document.userId, session.user.id)),
      )
      .returning();

    if (!result || result.length === 0) {
      return { success: false, error: 'Document not found or unauthorized' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error linking document to chat:', error);
    return { success: false, error: 'Failed to link document to chat' };
  }
}
