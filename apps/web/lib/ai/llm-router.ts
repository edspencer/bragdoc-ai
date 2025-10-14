import { getProjectsByUserId } from '@/database/projects/queries';
import {
  createAchievement,
  createUserMessage,
  getCompaniesByUserId,
  getDocumentById,
  saveDocument,
} from '@/database/queries';
import type { User, Company, Project } from '@/database/schema';
import { type JSONValue, streamText, stepCountIs } from 'ai';
import { documentWritingModel, routerModel } from '.';

import path from 'node:path';

const promptPath = path.resolve('./lib/ai/prompts/llm-router.mdx');
import { renderMDXPromptFile } from 'mdx-prompt';
import * as components from './prompts/elements';
import { z } from 'zod/v3';

import { streamFetchRenderExecute as streamFetchRenderExecuteAchievements } from 'lib/ai/extract-achievements';
import { fetchRenderExecute as generateDocument } from 'lib/ai/generate-document';
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

/**
 * Fetches the necessary data for the LLM router prompt.
 *
 * @param {LlmRouterFetchProps} props - The properties including user, chat history, and message.
 * @returns {Promise<LlmRouterPromptProps>} The fetched data including user details, companies, projects, chat history, message, and event callback.
 */
export async function fetch(
  props: LlmRouterFetchProps,
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

/**
 * Renders the LLM router prompt using the provided data.
 *
 * @param {LlmRouterPromptProps} data - The data including user details, companies, projects, chat history, message, and event callback.
 * @returns {Promise<string>} The rendered prompt.
 */
export async function render(data: LlmRouterPromptProps) {
  return await renderMDXPromptFile({
    filePath: promptPath,
    data,
    components,
  });
}

export type LlmRouterRenderExecuteProps = {
  streamTextOptions?: Partial<Omit<Parameters<typeof streamText>[0], 'model' | 'prompt' | 'messages' | 'tools' | 'stopWhen'>>;
  data: LlmRouterPromptProps;
  onEvent?: (item: JSONValue) => void;

  tools?: Tools;
};

export type Tools = {
  createDocument?: (
    props: CreateDocumentExecuteProps,
  ) => Promise<CreateDocumentExecuteReturn>;
  updateDocument?: (
    props: { id: string; description: string } & CreateDocumentExecuteProps,
  ) => Promise<CreateDocumentExecuteReturn>;
  extractAchievements?: () => Promise<any>;
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

/**
 * Executes the LLM router with the provided prompt and data.
 *
 * @param {LlmRouterExecuteProps} props - The properties including prompt, stream text options, data, event callback, and tool execute functions.
 * @returns {Promise<JSONValue>} The result of the execution.
 */
export function execute({
  prompt,
  streamTextOptions,
  data,
  onEvent,
  tools,
}: LlmRouterExecuteProps) {
  const eventCallback = data.onEvent || onEvent;

  //the default execute function for the createDocument tool
  const createDocument = async ({
    title,
    days,
    projectId,
    companyId,
  }: CreateDocumentExecuteProps) => {
    const { user, chatHistory, message } = data;

    const id = generateUUID();
    let draftText = '';

    eventCallback?.({
      type: 'id',
      content: id,
    });

    eventCallback?.({
      type: 'title',
      content: title,
    });

    eventCallback?.({
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
        const { text: textDelta } = delta;
        draftText += textDelta;
        eventCallback?.({
          type: 'text-delta',
          content: textDelta,
        });
      }
    }

    eventCallback?.({
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

  //the default execute function for the updateDocument tool
  const updateDocument = async ({
    id,
    description,
  }: {
    id: string;
    description: string;
  }) => {
    const document = await getDocumentById({ id });
    const { user, onEvent } = data;

    if (!document) {
      return {
        error: 'Document not found',
      };
    }

    const { content: currentContent } = document;
    let draftText = '';

    eventCallback?.({
      type: 'clear',
      content: document.title,
    });

    const { fullStream } = streamText({
      model: documentWritingModel,
      system:
        'You are a helpful writing assistant. Based on the description, please update the piece of writing.',
      providerOptions: {
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
        {
          role: 'user',
          content: currentContent!,
        },
      ],
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'text-delta') {
        const { text: textDelta } = delta;

        draftText += textDelta;
        eventCallback?.({
          type: 'text-delta',
          content: textDelta,
        });
      }
    }

    eventCallback?.({ type: 'finish', content: '' });

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
  };

  //the default execute function for the extractAchievements tool
  const extractAchievements = async () => {
    const { user, chatHistory, message } = data;

    console.log('Starting achievement extraction for message:', message);

    // First create a user message record
    const [newUserMessage] = await createUserMessage({
      userId: user.id,
      originalText: message,
    });

    if (!newUserMessage) {
      throw new Error('Failed to create user message');
    }

    console.log('\nCreated user message:', newUserMessage.id);

    try {
      console.log('extracting achievements');

      const achievementsStream = streamFetchRenderExecuteAchievements({
        chatHistory,
        message,
        user,
      });

      const savedAchievements = [];

      eventCallback?.({
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

          if (!savedAchievement) {
            throw new Error('Failed to save achievement');
          }

          console.log('Saved achievement:', savedAchievement.id);
          savedAchievements.push(savedAchievement);

          eventCallback?.({
            type: 'achievement',
            content: savedAchievement.title,
          });
        } catch (error) {
          console.error('Error saving achievement:', error);
          throw error;
        }
      }

      console.log('Finished processing all achievements');

      eventCallback?.({
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
      eventCallback?.({
        type: 'error',
        content: 'Failed to process achievements.',
      });
      throw error;
    }
  };

  return streamText({
    prompt,
    stopWhen: stepCountIs(10),
    ...streamTextOptions,
    model: routerModel,

    tools: {
      extractAchievements: {
        description:
          'Extract achievements from the chat to be saved to the database',
        inputSchema: z.object({}),
        execute: tools?.extractAchievements || extractAchievements,
      },

      createDocument: {
        description: "Create a document based on the User's achievements",
        inputSchema: z.object({
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
              "The ID of the company that the user is talking about (use the project's company if not specified and the project has a companyId)",
            ),
        }),
        execute: tools?.createDocument || createDocument,
      },
      updateDocument: {
        description: 'Update a document with the given description',
        inputSchema: z.object({
          id: z.string().describe('The ID of the document to update'),
          description: z
            .string()
            .describe('The description of changes that need to be made'),
        }),
        execute: tools?.updateDocument || updateDocument,
      },
    }
  });
}

/**
 * Renders and executes the LLM router with the provided data.
 *
 * @param {LlmRouterRenderExecuteProps} props - The properties including stream text options, data, event callback, and tool execute functions.
 * @returns {Promise<JSONValue>} The result of the execution.
 */
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
  streamTextOptions?: Partial<Omit<Parameters<typeof streamText>[0], 'model' | 'prompt' | 'messages' | 'tools' | 'stopWhen'>>;
}

/**
 * Fetches, renders, and executes the LLM router with the provided input.
 *
 * @param {LlmRouterFetchExecuteProps} props - The properties including input, event callback, and stream text options.
 * @returns {Promise<JSONValue>} The result of the execution.
 */
export async function streamFetchRenderExecute({
  input,
  onEvent,
  streamTextOptions,
}: LlmRouterFetchExecuteProps) {
  const data = await fetch(input);
  const prompt = await render(data);

  return execute({ prompt, streamTextOptions, data, onEvent });
}
