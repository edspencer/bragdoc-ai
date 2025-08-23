import { Eval } from 'braintrust';
import {
  renderExecute,
  type LlmRouterRenderExecuteProps,
} from '@/lib/ai/llm-router';
import { RouterScorer } from './scorers/llm-router-scorer';
import type { User } from '@/lib/db/schema';
import type { StepResult, ToolCallPart } from 'ai';

const callRouter = async (
  input: LlmRouterRenderExecuteProps
): Promise<Partial<StepResult<any>>> => {
  let toolCalls: ToolCallPart[] = [];

  const { fullStream, finishReason } = await renderExecute({
    data: input.data,
    streamTextOptions: {
      onStepFinish: (event) => {
        toolCalls = event.toolCalls;
      },

      onFinish: (event) => {
        toolCalls = event.toolCalls;
      },
    },
    tools: {
      createDocument: async () => {
        throw Error('Intentionally throwing to halt execution');
      },
      extractAchievements: async () => {
        throw Error('Intentionally throwing to halt execution');
      },
      updateDocument: async () => {
        throw Error('Intentionally throwing to halt execution');
      },
    },
  });
  let docText = '';

  for await (const delta of fullStream) {
    const { type } = delta;

    if (type === 'text-delta') {
      const { textDelta } = delta;

      docText += textDelta;
    }
  }

  return {
    finishReason: await finishReason,
    toolCalls,
    text: docText,
  };
};

export type Experiment = {
  input: LlmRouterRenderExecuteProps;
  expected: Partial<StepResult<any>>;
};

export const company = {
  name: 'Acme Corp',
  id: '1234',
  startDate: new Date('2023-01-01'),
  endDate: new Date('2023-01-01'),
  userId: '1234',
  role: 'Engineer',
  domain: 'www.boo.com',
};

export const projectX = {
  name: 'Project X',
  description: 'Description of Project X',
  startDate: new Date('2023-01-01'),
  endDate: new Date('2023-06-30'),
  id: '1234',
  companyId: '1234',
  status: 'active',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  userId: '1234',
  repoRemoteUrl: null,
};

export const projectBragdoc = {
  name: 'Bragdoc',
  description: 'Bragdoc is a project',
  startDate: new Date('2025-01-01'),
  endDate: null,
  id: '5678',
  companyId: '1234',
  status: 'active',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  userId: '1234',
  repoRemoteUrl: null,
};

export const user = {
  name: 'Ed Spencer',
  preferences: {
    documentInstructions: 'Always use the title "Weekly Summary"',
    language: 'en',
    hasSeenWelcome: true,
  },
  id: '1234',
  email: 'Q3Sd2@example.com',
};

export const chatHistory: any[] = [];

export const experimentData: Experiment[] = [
  //tests we can make a weekly summary document for the right project
  {
    input: {
      data: {
        user: user as User,
        chatHistory,
        message: 'Generate a weekly summary document for Bragdoc',
        companies: [company],
        projects: [projectX, projectBragdoc],
      },
    },
    expected: {
      finishReason: 'tool-calls',
      toolCalls: [
        {
          toolName: 'createDocument',
          args: {
            title: 'Weekly Summary for Bragdoc',
            days: 7,
            projectId: '5678',
            companyId: '1234',
          },
          type: 'tool-call',
          toolCallId: '123',
        },
      ],
    },
  },

  //tests we can make a monthly summary document for the right project
  {
    input: {
      data: {
        user: user as User,
        chatHistory,
        message: 'Generate a monthly summary document for Project X',
        companies: [company],
        projects: [projectX, projectBragdoc],
      },
    },
    expected: {
      finishReason: 'tool-calls',
      toolCalls: [
        {
          toolName: 'createDocument',
          args: {
            title: 'Monthly Summary for Project X',
            days: 30,
            projectId: '1234',
            companyId: '1234',
          },
          type: 'tool-call',
          toolCallId: '123',
        },
      ],
    },
  },

  //tests that  extractAchievements is called properly
  {
    input: {
      data: {
        user: user as User,
        chatHistory,
        message:
          'I fixed the login bugs for Bragdoc so that Github users can log in again',
        companies: [company],
        projects: [projectX, projectBragdoc],
      },
    },
    expected: {
      finishReason: 'tool-calls',
      toolCalls: [
        {
          toolName: 'extractAchievements',
          args: {},
          type: 'tool-call',
          toolCallId: '123',
        },
      ],
    },
  },

  //tests that updateDocument is called properly
  {
    input: {
      data: {
        user: user as User,
        chatHistory: [
          {
            role: 'user',
            content:
              'Write a report of all the stuff I did on Bragdoc over the last 3 months',
          },
          {
            role: 'assistant',
            content: JSON.stringify(
              [
                {
                  type: 'text',
                  text: '',
                },
                {
                  type: 'tool-call',
                  toolCallId: 'call_4rrSuLQ5CoH6bhXw8vB3yx6N',
                  toolName: 'createDocument',
                  args: {
                    title: 'Bragdoc Work Report',
                    days: 90,
                    projectId: '0b0c4b53-b299-4f70-9e9a-8f16a508974a',
                  },
                },
              ],
              null,
              2
            ),
          },
          {
            role: 'tool',
            content: JSON.stringify(
              [
                {
                  type: 'tool-result',
                  toolCallId: 'call_4rrSuLQ5CoH6bhXw8vB3yx6N',
                  toolName: 'createDocument',
                  result: {
                    id: 'document-12345',
                    title: 'Bragdoc Work Report',
                    content:
                      'A document was created and is now visible to the user.',
                  },
                },
              ],
              null,
              2
            ),
          },
          {
            role: 'assistant',
            content: JSON.stringify(
              [
                {
                  type: 'text',
                  text: "I've created the report for all the work you did on Bragdoc over the last 3 months. You can now view it! If you need any changes or additional information, just let me know.",
                },
              ],
              null,
              2
            ),
          },
        ],
        message: 'Can you remove the Payment and Integration bit?',
        companies: [company],
        projects: [projectX, projectBragdoc],
      },
    },
    expected: {
      finishReason: 'tool-calls',
      toolCalls: [
        {
          toolName: 'updateDocument',
          args: {
            id: 'document-12345',
            description: `Remove the Payment and Integration section`,
          },
          type: 'tool-call',
          toolCallId: '123',
        },
      ],
    },
  },
];

// Create the evaluation
Eval('llm-router', {
  data: experimentData,
  task: callRouter,
  scores: [RouterScorer],
  trialCount: 1,
  metadata: {
    model: 'gpt-4',
    description:
      'Evaluating how well the LLM Router dispatches to the correct tool',
    owner: 'ed',
  },
});
