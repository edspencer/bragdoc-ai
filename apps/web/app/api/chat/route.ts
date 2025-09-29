import { type Message, StreamData, convertToCoreMessages } from 'ai';
import { auth } from 'app/(auth)/auth';
import {
  getChatById,
  saveChat,
  saveMessages,
  deleteChatById,
} from '@/database/queries';
import type { User } from '@/database/schema';
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from '@/lib/utils';

import { generateTitleFromUserMessage } from '@/app/(app)/chat/actions';
import { streamFetchRenderExecute } from '@/lib/ai/llm-router';

export const maxDuration = 60;

export async function POST(request: Request) {
  const { id, messages }: { id: string; messages: Array<Message> } =
    await request.json();

  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const coreMessages = convertToCoreMessages(messages);
  const userMessage = getMostRecentUserMessage(coreMessages);

  if (!userMessage) {
    return new Response('No user message found', { status: 400 });
  }

  const chat = await getChatById({ id });

  if (!chat) {
    const title = await generateTitleFromUserMessage({ message: userMessage });
    await saveChat({ id, userId: session.user.id, title });
  }

  const userMessageId = generateUUID();

  await saveMessages({
    messages: [
      { ...userMessage, id: userMessageId, createdAt: new Date(), chatId: id },
    ],
  });

  const streamingData = new StreamData();

  streamingData.append({
    type: 'user-message-id',
    content: userMessageId,
  });

  const result = await streamFetchRenderExecute({
    input: {
      user: session.user as User,
      chatHistory: coreMessages,
      message: userMessage.content as string,
    },
    //onEvent is our own custom callback, implemented in streamFetchRenderExecute,
    //where each message is JSON suitable to be streamed back to the client
    onEvent: (item: any) => {
      streamingData.append(item);
    },
    streamTextOptions: {
      onFinish: async ({ response }) => {
        if (session.user?.id) {
          try {
            const responseMessagesWithoutIncompleteToolCalls =
              sanitizeResponseMessages(response.messages);

            console.log('Chat endpoint onFinish');
            console.log(JSON.stringify(response, null, 4));
            await saveMessages({
              messages: responseMessagesWithoutIncompleteToolCalls.map(
                (message) => {
                  const messageId = generateUUID();

                  if (message.role === 'assistant') {
                    streamingData.appendMessageAnnotation({
                      messageIdFromServer: messageId,
                    });
                  }

                  return {
                    id: messageId,
                    chatId: id,
                    role: message.role,
                    content: message.content,
                    createdAt: new Date(),
                  };
                }
              ),
            });
          } catch (error) {
            console.error('Failed to save chat');
            console.log(error);
          }
        }

        streamingData.close();
      },
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'stream-text',
      },
    },
  });

  return result.toDataStreamResponse({
    data: streamingData,
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (!chat) {
      return new Response('Not Found', { status: 404 });
    }

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request', {
      status: 500,
    });
  }
}
