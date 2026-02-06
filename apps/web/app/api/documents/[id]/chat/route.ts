import { getAuthUser } from '@/lib/getAuthUser';
import {
  getChatById,
  saveChat,
  saveMessages,
  getMessagesByChatId,
  updateChatLastContextById,
  getDocumentById,
} from '@bragdoc/database';
import type { User, Message } from '@bragdoc/database';
import { generateUUID } from '@/lib/utils';
import { generateTitleFromUserMessage } from '@/app/(app)/chat/actions';
import {
  createDocument,
  createDocumentWithCreditCheck,
} from '@/lib/ai/tools/create-document';
import {
  updateDocument,
  updateDocumentWithCreditCheck,
} from '@/lib/ai/tools/update-document';
import type { ChatMessage } from '@/lib/types';
import {
  streamText,
  createUIMessageStream,
  convertToModelMessages,
  smoothStream,
  stepCountIs,
  JsonToSseTransformStream,
} from 'ai';
import { routerModel } from '@/lib/ai';
import { systemPrompt } from '@/lib/ai/prompts';
import { hasUnlimitedAccess } from '@/lib/stripe/subscription';
import {
  checkUserChatMessages,
  deductChatMessage,
  logCreditTransaction,
} from '@/lib/credits';

export const maxDuration = 60;

function convertMessagesToChatMessages(messages: Message[]): ChatMessage[] {
  return messages.map((msg) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    parts: msg.parts as any,
  }));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: documentId } = await params;
  const body = await request.json();
  const chatId = body.id as string;

  // Handle both formats: { message } from custom transport and { messages } from default transport
  const message: ChatMessage = body.message || body.messages?.at(-1);

  if (!message) {
    return Response.json({ error: 'No message provided' }, { status: 400 });
  }

  const auth = await getAuthUser(request);

  if (!auth?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = auth.user as User;

  // Fetch the document and verify ownership
  let currentDocument = null;
  try {
    currentDocument = await getDocumentById({ id: documentId });
    if (!currentDocument) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }
    if (currentDocument.userId !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch (error) {
    console.error('Error fetching document:', error);
    return Response.json(
      { error: 'Failed to fetch document' },
      { status: 500 },
    );
  }

  // Chat message gate - skip for paid/demo users
  if (!hasUnlimitedAccess(user)) {
    const { hasMessages, remainingMessages } = checkUserChatMessages(user);

    if (!hasMessages) {
      return Response.json(
        {
          error: 'insufficient_chat_messages',
          message:
            "You've used all 20 free messages. Upgrade for unlimited chat.",
          remaining: 0,
          upgradeUrl: '/pricing',
        },
        { status: 402 },
      );
    }

    // Atomic deduction
    const { success, remaining } = await deductChatMessage(user.id, user.level);
    if (!success) {
      return Response.json(
        {
          error: 'insufficient_chat_messages',
          message: 'Messages exhausted. Upgrade for unlimited chat.',
          remaining: 0,
          upgradeUrl: '/pricing',
        },
        { status: 402 },
      );
    }

    // Log the message deduction (non-blocking)
    logCreditTransaction({
      userId: user.id,
      operation: 'deduct',
      featureType: 'chat_message',
      amount: 1,
      metadata: { documentId, remainingMessages: remaining },
    }).catch((err) =>
      console.error('Failed to log chat message transaction:', err),
    );
  }

  // Check if chat exists
  const chat = await getChatById({ id: chatId });

  if (!chat) {
    // Create new chat
    const title = await generateTitleFromUserMessage({ message });
    await saveChat({ id: chatId, userId: user.id, title });
  } else if (chat.userId !== user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get existing messages and add new user message
  const messagesFromDb = await getMessagesByChatId({ id: chatId });
  const chatMessages = convertMessagesToChatMessages(messagesFromDb);
  const uiMessages = [...chatMessages, message];

  // Save the new user message
  // Ensure we have a valid UUID for the message ID
  const messageId = message.id?.includes('-') ? message.id : generateUUID();

  await saveMessages({
    messages: [
      {
        chatId: chatId,
        id: messageId,
        role: 'user',
        parts: message.parts as any,
        attachments: [],
        createdAt: new Date(),
      },
    ],
  });

  let finalUsage: any;

  // Build system prompt with document context
  const contentPreview = currentDocument.content
    ? currentDocument.content.length > 2000
      ? `${currentDocument.content.substring(0, 2000)}...`
      : currentDocument.content
    : '';

  const enhancedSystemPrompt = `${systemPrompt}

Currently viewing document:
- ID: ${currentDocument.id}
- Title: ${currentDocument.title}
- Content: ${contentPreview}

When the user refers to "this document", "the document", or asks to modify/translate/update content, they are referring to this document. Use the updateDocument tool with ID "${currentDocument.id}" to make changes.`;

  // Create streaming response with document tools
  const stream = createUIMessageStream({
    execute: ({ writer: dataStream }) => {
      const result = streamText({
        model: routerModel,
        system: enhancedSystemPrompt,
        messages: convertToModelMessages(uiMessages),
        stopWhen: stepCountIs(5),
        experimental_transform: smoothStream({ chunking: 'word' }),
        tools: hasUnlimitedAccess(user)
          ? {
              createDocument: createDocument({ user, dataStream }),
              updateDocument: updateDocument({ user, dataStream }),
            }
          : {
              createDocument: createDocumentWithCreditCheck({
                user,
                dataStream,
              }),
              updateDocument: updateDocumentWithCreditCheck({
                user,
                dataStream,
              }),
            },
        experimental_telemetry: {
          isEnabled: true,
          functionId: 'stream-text',
        },
        onFinish: async ({ usage }) => {
          finalUsage = usage;
          dataStream.write({ type: 'data-usage', data: usage });
        },
      });

      result.consumeStream();

      dataStream.merge(
        result.toUIMessageStream({
          sendReasoning: true,
        }),
      );
    },
    generateId: generateUUID,
    onFinish: async ({ messages }) => {
      // Save all assistant messages
      // Ensure all message IDs are valid UUIDs
      await saveMessages({
        messages: messages.map((currentMessage) => {
          const msgId = currentMessage.id?.includes('-')
            ? currentMessage.id
            : generateUUID();
          return {
            id: msgId,
            role: currentMessage.role,
            parts: currentMessage.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: chatId,
          };
        }),
      });

      // Update chat usage tracking
      if (finalUsage) {
        try {
          await updateChatLastContextById({
            chatId: chatId,
            context: {
              promptTokens: finalUsage.promptTokens,
              completionTokens: finalUsage.completionTokens,
              totalTokens: finalUsage.totalTokens,
            },
          });
        } catch (err) {
          console.warn('Unable to persist usage for chat', chatId, err);
        }
      }
    },
    onError: () => {
      return 'Oops, an error occurred!';
    },
  });

  // Return streaming response with proper SSE transformation
  return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
}
