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
  createAchievement,
  getCompaniesByUserId,
} from '@/lib/db/queries';
import {getProjectsByUserId} from '@/lib/db/projects/queries';
import type { Suggestion, User, Message as DBMessage } from '@/lib/db/schema';
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from '@/lib/utils';

import { generateTitleFromUserMessage } from '@/app/(app)/chat/actions';
import { extractAchievements } from '@/lib/ai/extract';
import { prepareAndGenerateDocument, renderCompany, renderProject } from '@/lib/ai/generate-document';

export const maxDuration = 60;

type AllowedTools =
  | 'saveAchievements'
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
const achievementTools: AllowedTools[] = ['saveAchievements'];

const allTools: AllowedTools[] = [
  ...blocksTools,
  ...weatherTools,
  ...achievementTools,
];

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

  const [companies, projects] = await Promise.all([
    getCompaniesByUserId({ userId: session.user.id! }),
    getProjectsByUserId(session.user.id!),
  ]);

  const streamingData = new StreamData();

  streamingData.append({
    type: 'user-message-id',
    content: userMessageId,
  });

  const result = streamText({
    model: customModel(model.apiIdentifier),
    system: `${systemPrompt}
The user has the following projects defined:

<projects>
${projects.map(renderProject).join('\n')}
</projects>

The user has the following companies defined:

<companies>
${companies.map(renderCompany).join('\n')}
</companies>
    `,
    messages: coreMessages,
    maxSteps: 10,
    experimental_activeTools: allTools,
    tools: {
      saveAchievements: {
        description:
          'Saves detected achievements to the database. Takes no parameters. Only call once.',
        parameters: z.object({}),
        execute: async () => {
          const message = userMessage.content as string;

          console.log('Starting achievement extraction for message:', message);

          // First create a user message record
          const [newUserMessage] = await createUserMessage({
            userId: session.user.id!,
            originalText: message,
          });

          console.log('\nCreated user message:', newUserMessage.id);

          try {
            console.log('extracting achievements');

            const achievementsStream = extractAchievements({
              chat_history: messages
                .filter((m) => m.role === 'user')
                .map(({ role, content }) => ({
                  role,
                  content,
                })),
              input: message,
              context: {
                companies: companies as any,
                projects: projects as any,
              },
            });

            const savedAchievements = [];

            streamingData.append({
              type: 'status',
              content: 'Analyzing your achievements...',
            });

            // Process each achievement as it comes in
            for await (const achievement of achievementsStream) {
              console.log('Processing achievement:', achievement.title);

              try {
                const [savedAchievement] = await createAchievement({
                  userId: session.user.id!,
                  userMessageId: newUserMessage.id,
                  title: achievement.title,
                  summary: achievement.summary,
                  details: achievement.details,
                  eventDuration: achievement.eventDuration as any,
                  eventStart: achievement.eventStart || null,
                  eventEnd: achievement.eventEnd || null,
                  companyId: achievement.companyId,
                  projectId: achievement.projectId,
                });

                console.log('Saved achievement:', savedAchievement.id);
                savedAchievements.push(savedAchievement);

                streamingData.append({
                  type: 'achievement',
                  content: savedAchievement.title,
                });
              } catch (error) {
                console.error('Error saving achievement:', error);
                throw error;
              }
            }

            console.log('Finished processing all achievements');

            streamingData.append({
              type: 'complete',
              content: `Successfully processed ${savedAchievements.length} achievement${savedAchievements.length === 1 ? '' : 's'}.`,
            });

            return {
              id: newUserMessage.id,
              achievements: savedAchievements,
              content: `Successfully processed ${savedAchievements.length} achievement${savedAchievements.length === 1 ? '' : 's'}.`,
            };
          } catch (error) {
            console.error('Error in achievement extraction:', error);
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
        description: "Create a document based on the User's achievements",
        parameters: z.object({
          title: z.string().describe('The title of the document'),
          days: z
            .number()
            .int()
            .min(1)
            .max(720)
            .describe('The number of days ago to load Achievements from'),
          projectId: z.string().optional().describe('The ID of the project that the user is talking about'),
          companyId: z.string().optional().describe('The ID of the company that the user is talking about (use the project\'s company if not specified and the project has a companyId)'),
        }),
        execute: async ({ title, days, projectId, companyId }) => {
          const id = generateUUID();
          let draftText = '';

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

          const { fullStream }  = await prepareAndGenerateDocument({
            user: session.user as User,
            projectId: projectId ?? undefined,
            companyId: companyId ?? undefined,
            title,
            days,
            chatHistory: messages as DBMessage[]
          })

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

          console.log('Chat endpoint onFinish');
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
          console.log(error);
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
