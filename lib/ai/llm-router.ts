import { getProjectsByUserId } from '../db/projects/queries';
import {
  createAchievement,
  createUserMessage,
  getCompaniesByUserId,
  getDocumentById,
  saveDocument,
  saveSuggestions,
} from '../db/queries';
import type { User, Company, Project, Suggestion } from '../db/schema';
import { type JSONValue, streamObject, streamText } from 'ai';
import { documentWritingModel, routerModel } from '.';

import path from 'node:path';

const promptPath = path.resolve('./lib/ai/prompts/llm-router.mdx');
import { renderMDXPromptFile } from 'mdx-prompt';
import * as components from './prompts/elements';
import { z } from 'zod';

import { streamFetchRenderExecute as streamFetchRenderExecuteAchievements } from '@/lib/ai/extract-achievements';
import { fetchRenderExecute as generateDocument } from '@/lib/ai/generate-document';
import { generateUUID } from '../utils';

export type LlmRouterFetchProps = {
  user: User;
  chatHistory: any[];
  message: string;

  onEvent?: (item: JSONValue) => void;
};

export type LlmRouterPromptProps = LlmRouterFetchProps & {
  companies: Company[];
  projects: Project[];
};

export async function fetch(
  props: LlmRouterFetchProps
): Promise<LlmRouterPromptProps> {
  const { user, chatHistory, message, onEvent } = props;

  const [companies, projects] = await Promise.all([
    getCompaniesByUserId({ userId: user.id }),
    getProjectsByUserId(user.id),
  ]);

  return {
    user,
    companies,
    projects,
    chatHistory,
    message,
    onEvent,
  };
}

export async function render(data: LlmRouterPromptProps) {
  return await renderMDXPromptFile({
    filePath: promptPath,
    data,
    components,
  });
}

export type LlmRouterRenderExecuteProps = {
  streamTextOptions?: Partial<Parameters<typeof streamText>[0]>;
  data: LlmRouterPromptProps;
  onEvent?: (item: JSONValue) => void;

  createDocumentToolExecute?: (
    props: CreateDocumentExecuteProps
  ) => Promise<CreateDocumentExecuteReturn>;
  extractAchievementsToolExecute?: () => Promise<any>;
};

export type LlmRouterExecuteProps = LlmRouterRenderExecuteProps & {
  prompt: string;
};

export interface CreateDocumentExecuteProps {
  title: string;
  days: number;
  projectId?: string;
  companyId?: string;
}

export interface CreateDocumentExecuteReturn {
  id: string;
  title: string;
  content: string;
}

export function execute({
  prompt,
  streamTextOptions,
  data,
  onEvent,
  createDocumentToolExecute,
  extractAchievementsToolExecute,
}: LlmRouterExecuteProps) {
  //the default execute function for createDocument
  const createDocumentExecuteDefault = async ({
    title,
    days,
    projectId,
    companyId,
  }: CreateDocumentExecuteProps) => {
    const { user, chatHistory, message, onEvent } = data;

    const id = generateUUID();
    let draftText = '';

    onEvent?.({
      type: 'id',
      content: id,
    });

    onEvent?.({
      type: 'title',
      content: title,
    });

    onEvent?.({
      type: 'clear',
      content: '',
    });

    const { fullStream } = await generateDocument({
      user,
      projectId: projectId ?? undefined,
      companyId: companyId ?? undefined,
      title,
      days,
      chatHistory,
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'text-delta') {
        const { textDelta } = delta;
        draftText += textDelta;
        onEvent?.({
          type: 'text-delta',
          content: textDelta,
        });
      }
    }

    onEvent?.({
      type: 'finish',
      content: '',
    });

    if (user.id) {
      await saveDocument({
        id,
        title,
        content: draftText,
        userId: user.id,
      });
    }

    return {
      id,
      title,
      content: 'A document was created and is now visible to the user.',
    };
  };

  //the default execute function for extractAchievements
  const extractAchievementsExecuteDefault = async () => {
    const { user, chatHistory, message } = data;

    console.log('Starting achievement extraction for message:', message);

    // First create a user message record
    const [newUserMessage] = await createUserMessage({
      userId: user.id,
      originalText: message,
    });

    console.log('\nCreated user message:', newUserMessage.id);

    try {
      console.log('extracting achievements');

      const achievementsStream = streamFetchRenderExecuteAchievements({
        chatHistory,
        message,
        user,
      });

      const savedAchievements = [];

      onEvent?.({
        type: 'status',
        content: 'Analyzing your achievements...',
      });

      // Process each achievement as it comes in
      for await (const achievement of achievementsStream) {
        console.log('Processing achievement:', achievement.title);

        try {
          const [savedAchievement] = await createAchievement({
            userId: user.id,
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

          onEvent?.({
            type: 'achievement',
            content: savedAchievement.title,
          });
        } catch (error) {
          console.error('Error saving achievement:', error);
          throw error;
        }
      }

      console.log('Finished processing all achievements');

      onEvent?.({
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
      onEvent?.({
        type: 'error',
        content: 'Failed to process achievements.',
      });
      throw error;
    }
  };

  return streamText({
    prompt,
    maxSteps: 10,
    ...streamTextOptions,
    model: routerModel,

    tools: {
      extractAchievements: {
        description:
          'Extract achievements from the chat to be saved to the database',
        parameters: z.object({}),
        execute:
          extractAchievementsToolExecute || extractAchievementsExecuteDefault,
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
          projectId: z
            .string()
            .optional()
            .describe('The ID of the project that the user is talking about'),
          companyId: z
            .string()
            .optional()
            .describe(
              "The ID of the company that the user is talking about (use the project's company if not specified and the project has a companyId)"
            ),
        }),
        execute: createDocumentToolExecute || createDocumentExecuteDefault,
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
          const { user, onEvent } = data;

          if (!document) {
            return {
              error: 'Document not found',
            };
          }

          const { content: currentContent } = document;
          let draftText = '';

          onEvent?.({
            type: 'clear',
            content: document.title,
          });

          const { fullStream } = streamText({
            model: documentWritingModel,
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
              onEvent?.({
                type: 'text-delta',
                content: textDelta,
              });
            }
          }

          onEvent?.({ type: 'finish', content: '' });

          if (user.id) {
            await saveDocument({
              id,
              title: document.title,
              content: draftText,
              userId: user.id,
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
          const { user, onEvent } = data;

          if (!document || !document.content) {
            return {
              error: 'Document not found',
            };
          }

          const suggestions: Array<
            Omit<Suggestion, 'userId' | 'createdAt' | 'documentCreatedAt'>
          > = [];

          const { elementStream } = streamObject({
            model: documentWritingModel,
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

            onEvent?.({
              type: 'suggestion',
              content: suggestion,
            });

            suggestions.push(suggestion);
          }

          if (user.id) {
            const userId = user.id;

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
  });
}

export async function renderExecute(props: LlmRouterRenderExecuteProps) {
  const prompt = await render(props.data);

  return execute({
    ...props,
    prompt,
  });
}

export interface LlmRouterFetchExecuteProps {
  input: LlmRouterFetchProps;
  onEvent?: (item: JSONValue) => void;
  streamTextOptions?: Partial<Parameters<typeof streamText>[0]>;
}

export async function streamFetchRenderExecute({
  input,
  onEvent,
  streamTextOptions,
}: LlmRouterFetchExecuteProps) {
  const data = await fetch(input);
  const prompt = await render(data);

  return execute({ prompt, streamTextOptions, data, onEvent });
}
