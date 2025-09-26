import { getProjectById } from 'lib/db/projects/queries';
import { getAchievements, getCompanyById } from 'lib/db/queries';
import { streamText } from 'ai';
import { documentWritingModel } from '.';

import type {
  GenerateDocumentFetcherProps,
  GenerateDocumentPromptProps,
} from './prompts/types';

import path from 'node:path';

const promptPath = path.resolve('./lib/ai/prompts/generate-document.mdx');
import { renderMDXPromptFile } from 'mdx-prompt';
import * as components from './prompts/elements';

/**
 * Fetches all the data needed to generate a document based on the parameters
 * provided by the LLM. This function is expected to be fed by an LLM tool call,
 * with just the user object being passed from the session
 *
 * @param props GenerateDocumentFetcherProps - Input parameters for document generation
 * @param props.title - Title of the document to generate
 * @param props.days - Number of days to look back for achievements (default: 7)
 * @param props.user - User object from the session
 * @param props.projectId - Optional ID of project to filter achievements
 * @param props.companyId - Optional ID of company to filter achievements
 * @param props.chatHistory - Chat history context
 * @returns Promise<GenerateDocumentPromptProps> - Data needed to generate the document
 */
export async function fetch({
  title,
  days = 7,
  user,
  projectId,
  companyId,
  chatHistory,
}: GenerateDocumentFetcherProps): Promise<GenerateDocumentPromptProps> {
  const userId = user.id;

  const [project, company, achievements] = await Promise.all([
    projectId ? getProjectById(projectId, userId) : null,
    companyId ? getCompanyById({ id: companyId, userId }) : null,
    getAchievements({
      userId,
      projectId,
      startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      limit: 200,
    }),
  ]);

  const userInstructions = user.preferences.documentInstructions || '';

  return {
    docTitle: title,
    days,
    user,
    project: project || undefined,
    company: company || undefined,
    achievements: achievements.achievements,
    userInstructions,
    chatHistory,
  };
}

/**
 * Fetches data, renders the prompt, and executes it in a single operation
 *
 * @param input GenerateDocumentFetcherProps - Input parameters for document generation
 * @param streamTextOptions - Optional parameters for text streaming
 * @returns Promise<AsyncIterable<string>> - Stream of generated document text
 */
export async function fetchRenderExecute(
  input: GenerateDocumentFetcherProps,
  streamTextOptions?: Parameters<typeof streamText>[0],
) {
  const data = await fetch(input);

  return await renderExecute(data, streamTextOptions);
}

/**
 * Fetches data and renders the prompt without executing it
 *
 * @param input GenerateDocumentFetcherProps - Input parameters for document generation
 * @returns Promise<string> - Rendered prompt string
 */
export async function fetchRender(
  input: GenerateDocumentFetcherProps,
): Promise<string> {
  const data = await fetch(input);
  return await render(data);
}

/**
 * Renders the prompt and executes it to generate the document
 *
 * @param promptData GenerateDocumentPromptProps - Data needed to generate the document
 * @param streamTextOptions - Optional parameters for text streaming
 * @returns Promise<AsyncIterable<string>> - Stream of generated document text
 */
export async function renderExecute(
  promptData: GenerateDocumentPromptProps,
  streamTextOptions?: Parameters<typeof streamText>[0],
) {
  const prompt = await render(promptData);

  return execute(prompt, streamTextOptions);
}

/**
 * Executes the rendered prompt to generate the document
 *
 * @param prompt string - The rendered prompt to execute
 * @param streamTextOptions - Optional parameters for text streaming
 * @returns Promise<AsyncIterable<string>> - Stream of generated document text
 */
export async function execute(
  prompt: string,
  streamTextOptions?: Parameters<typeof streamText>[0],
) {
  return streamText({
    model: documentWritingModel,
    prompt,
    ...streamTextOptions,
  });
}

/**
 * Renders the document generation prompt using the provided data
 *
 * @param data GenerateDocumentPromptProps - Data needed to generate the document
 * @returns Promise<string> - Rendered prompt string ready for execution
 */
export async function render(
  data: GenerateDocumentPromptProps,
): Promise<string> {
  return await renderMDXPromptFile({
    filePath: promptPath,
    data,
    components,
  });
}
