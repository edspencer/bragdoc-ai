import {
  type Message,
  StreamData,
  convertToCoreMessages,
  streamObject,
  streamText,
} from 'ai';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';
import { customModel } from '@/lib/ai';
import { models } from '@/lib/ai/models';
import { systemPrompt } from '@/lib/ai/prompts';
import {
  deleteChatById,
  getChatById,
  getDocumentById,
  saveChat,
  saveDocument,
  saveMessages,
  saveSuggestions,
  createUserMessage,
  createBrag,
  getBragsByUserId,
} from '@/lib/db/queries';
import type { Suggestion } from '@/lib/db/schema';
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from '@/lib/utils';

import { generateTitleFromUserMessage } from '../../chat/actions';
import { extractBrags } from '@/lib/ai/extract';

export const maxDuration = 60;

type AllowedTools =
  | 'saveBrags'
  | 'createDocument'
  | 'updateDocument'
  | 'requestSuggestions'
  | 'getWeather';

const blocksTools: AllowedTools[] = [
  'createDocument',
  'updateDocument',
  'requestSuggestions',
];

const weatherTools: AllowedTools[] = ['getWeather'];
const bragTools: AllowedTools[] = ['saveBrags'];

const allTools: AllowedTools[] = [...blocksTools, ...weatherTools, ...bragTools];

export async function POST(request: Request) {
  const {
    id,
    messages,
    modelId,
  }: { id: string; messages: Array<Message>; modelId: string } =
    await request.json();

  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const model = models.find((model) => model.id === modelId);

  if (!model) {
    return new Response('Model not found', { status: 404 });
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

  const result = streamText({
    model: customModel(model.apiIdentifier),
    system: systemPrompt,
    messages: coreMessages,
    maxSteps: 10,
    experimental_activeTools: allTools,
    tools: {
      saveBrags: {
        description: 'Saves detected achievements to the database. Takes no parameters. Only call once.',
        parameters: z.object({}),
        execute: async () => {
          const message = userMessage.content as string

          console.log('Starting brag extraction for message:', message)

          // First create a user message record
          const [newUserMessage] = await createUserMessage({
            userId: session.user.id!,
            originalText: message
          });

          console.log('\nCreated user message:', newUserMessage.id);

          try {
            console.log('extracting brags');
            const bragsStream = extractBrags({
              chat_history: messages.filter(m => m.role === 'user').map(({ role, content }) => ({
                role,
                content,
              })),
              input: message,
              context: {
                companies: [],
                projects: [],
              },
            });

            const savedBrags = [];

            streamingData.append({
              type: 'status',
              content: 'Analyzing your achievements...',
            });

            // Process each brag as it comes in
            for await (const brag of bragsStream) {
              console.log('Processing brag:', brag.title);

              try {
                const [savedBrag] = await createBrag({
                  userId: session.user.id!,
                  userMessageId: newUserMessage.id,
                  title: brag.title,
                  summary: brag.summary,
                  details: brag.details,
                  eventDuration: brag.eventDuration as any,
                  eventStart: brag.eventStart || null,
                  eventEnd: brag.eventEnd || null,
                  companyId: brag.companyId,
                  projectId: brag.projectId,
                });

                console.log('Saved brag:', savedBrag.id);
                savedBrags.push(savedBrag);

                streamingData.append({
                  type: 'brag',
                  content: savedBrag.title,
                });
              } catch (error) {
                console.error('Error saving brag:', error);
                throw error;
              }
            }

            console.log('Finished processing all brags');

            streamingData.append({
              type: 'complete',
              content: `Successfully processed ${savedBrags.length} brag${savedBrags.length === 1 ? '' : 's'}.`,
            });

            return {
              id: newUserMessage.id,
              brags: savedBrags,
              content: `Successfully processed ${savedBrags.length} brag${savedBrags.length === 1 ? '' : 's'}.`,
            };
          } catch (error) {
            console.error('Error in brag extraction:', error);
            streamingData.append({
              type: 'error',
              content: 'Failed to process achievements.',
            });
            throw error;
          }
        },
      },
      getWeather: {
        description: 'Get the current weather at a location',
        parameters: z.object({
          latitude: z.number(),
          longitude: z.number(),
        }),
        execute: async ({ latitude, longitude }) => {
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
          );

          const weatherData = await response.json();
          return weatherData;
        },
      },
      createDocument: {
        description: 'Create a document based on the User\'s achievements',
        parameters: z.object({
          title: z.string().describe('The title of the document'),
        }),
        execute: async ({ title }) => {
          const id = generateUUID();
          let draftText = '';

          // Fetch user's brags to provide context for document creation
          const userBrags = await getBragsByUserId({ 
            userId: session.user.id!,
            limit: 50  // Get the 50 most recent brags
          });

          streamingData.append({
            type: 'id',
            content: id,
          });

          streamingData.append({
            type: 'title',
            content: title,
          });

          streamingData.append({
            type: 'clear',
            content: '',
          });

          const { fullStream } = streamText({
            model: customModel(model.apiIdentifier),
            system:
              `Write about the given topic. Markdown is supported. Use headings wherever appropriate.
              When asked to write a report, put the current date at the top of the report.`,
            prompt: `
Document title: ${title}
Today's date: ${new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}

Recent achievements: ${userBrags.map((brag) => `${brag.title}: ${brag.summary}`).join('\n')}
            `,
          });

          for await (const delta of fullStream) {
            const { type } = delta;

            if (type === 'text-delta') {
              const { textDelta } = delta;

              draftText += textDelta;
              streamingData.append({
                type: 'text-delta',
                content: textDelta,
              });
            }
          }

          streamingData.append({ type: 'finish', content: '' });

          if (session.user?.id) {
            await saveDocument({
              id,
              title,
              content: draftText,
              userId: session.user.id,
            });
          }

          return {
            id,
            title,
            content: 'A document was created and is now visible to the user.',
          };
        },
      },
      updateDocument: {
        description: 'Update a document with the given description',
        parameters: z.object({
          id: z.string().describe('The ID of the document to update'),
          description: z
            .string()
            .describe('The description of changes that need to be made'),
        }),
        execute: async ({ id, description }) => {
          const document = await getDocumentById({ id });

          if (!document) {
            return {
              error: 'Document not found',
            };
          }

          const { content: currentContent } = document;
          let draftText = '';

          streamingData.append({
            type: 'clear',
            content: document.title,
          });

          const { fullStream } = streamText({
            model: customModel(model.apiIdentifier),
            system:
              'You are a helpful writing assistant. Based on the description, please update the piece of writing.',
            experimental_providerMetadata: {
              openai: {
                prediction: {
                  type: 'content',
                  content: currentContent,
                },
              },
            },
            messages: [
              {
                role: 'user',
                content: description,
              },
              { role: 'user', content: currentContent },
            ],
          });

          for await (const delta of fullStream) {
            const { type } = delta;

            if (type === 'text-delta') {
              const { textDelta } = delta;

              draftText += textDelta;
              streamingData.append({
                type: 'text-delta',
                content: textDelta,
              });
            }
          }

          streamingData.append({ type: 'finish', content: '' });

          if (session.user?.id) {
            await saveDocument({
              id,
              title: document.title,
              content: draftText,
              userId: session.user.id,
            });
          }

          return {
            id,
            title: document.title,
            content: 'The document has been updated successfully.',
          };
        },
      },
      requestSuggestions: {
        description: 'Request suggestions for a document',
        parameters: z.object({
          documentId: z
            .string()
            .describe('The ID of the document to request edits'),
        }),
        execute: async ({ documentId }) => {
          const document = await getDocumentById({ id: documentId });

          if (!document || !document.content) {
            return {
              error: 'Document not found',
            };
          }

          const suggestions: Array<
            Omit<Suggestion, 'userId' | 'createdAt' | 'documentCreatedAt'>
          > = [];

          const { elementStream } = streamObject({
            model: customModel(model.apiIdentifier),
            system:
              'You are a help writing assistant. Given a piece of writing, please offer suggestions to improve the piece of writing and describe the change. It is very important for the edits to contain full sentences instead of just words. Max 5 suggestions.',
            prompt: document.content,
            output: 'array',
            schema: z.object({
              originalSentence: z.string().describe('The original sentence'),
              suggestedSentence: z.string().describe('The suggested sentence'),
              description: z
                .string()
                .describe('The description of the suggestion'),
            }),
          });

          for await (const element of elementStream) {
            const suggestion = {
              originalText: element.originalSentence,
              suggestedText: element.suggestedSentence,
              description: element.description,
              id: generateUUID(),
              documentId: documentId,
              isResolved: false,
            };

            streamingData.append({
              type: 'suggestion',
              content: suggestion,
            });

            suggestions.push(suggestion);
          }

          if (session.user?.id) {
            const userId = session.user.id;

            await saveSuggestions({
              suggestions: suggestions.map((suggestion) => ({
                ...suggestion,
                userId,
                createdAt: new Date(),
                documentCreatedAt: document.createdAt,
              })),
            });
          }

          return {
            id: documentId,
            title: document.title,
            message: 'Suggestions have been added to the document',
          };
        },
      },
    },
    onFinish: async ({ response }) => {
      if (session.user?.id) {
        try {
          const responseMessagesWithoutIncompleteToolCalls =
            sanitizeResponseMessages(response.messages);

          console.log('onFinish');
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
              },
            ),
          });
        } catch (error) {
          console.error('Failed to save chat');
          console.log(error)
        }
      }

      streamingData.close();
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'stream-text',
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
