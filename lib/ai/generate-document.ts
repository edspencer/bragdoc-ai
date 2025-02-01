import { getProjectById } from '@/lib/db/projects/queries';
import { getAchievements, getCompanyById, } from '@/lib/db/queries';
import { streamText } from 'ai';
import { documentWritingModel } from '.';

import type { GenerateDocumentFetcherProps, GenerateDocumentPromptProps } from './prompts/types';

import path from "node:path";

const promptPath = path.resolve("./lib/ai/prompts/generate-document.mdx");
import { renderMDXPromptFile } from "mdx-prompt";
import * as components from './prompts/elements';

/**
 * Fetches all the data needed to generate a document based on the parameters
 * provided by the LLM. This function is expected to be fed by an LLM tool call,
 * with just the user object being passed from the session
 * @returns The GenerateDocumentPromptProps that can then be used to generate the document
 */
export async function fetch({
  title,
  days = 7,
  user,
  projectId,
  companyId,
  chatHistory
}: GenerateDocumentFetcherProps): Promise<GenerateDocumentPromptProps> {
  const userId = user.id;

  const [project, company, achievements] = await Promise.all([
    projectId ? getProjectById(projectId, userId) : null,
    companyId ? getCompanyById({ id: companyId, userId }) : null,
    getAchievements({
      userId,
      projectId,
      startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      limit: 200
    })
  ])

  const userInstructions = user.preferences.documentInstructions || '';

  return {
    docTitle: title,
    days,
    user,
    project: project || undefined,
    company: company || undefined,
    achievements: achievements.achievements,
    userInstructions,
    chatHistory
  }
}

export async function fetchRenderExecute(input: GenerateDocumentFetcherProps, streamTextOptions?: Parameters<typeof streamText>[0]) {
  const data = await fetch(input);

  return await renderExecute(data, streamTextOptions);
}

export async function fetchRender(input: GenerateDocumentFetcherProps): Promise<string> {
  const data = await fetch(input);
  return await render(data);
}

export async function renderExecute(promptData: GenerateDocumentPromptProps, streamTextOptions?: Parameters<typeof streamText>[0]) {
  const prompt = await render(promptData);

  return streamText({
    model: documentWritingModel,
    prompt,
    ...streamTextOptions
  });
}

/**
 * Renders the prompt that extracts achievements from commit messages
 * 
 * @param data 
 * @returns a string that can be used to execute the prompt
 */
export async function render(data: GenerateDocumentPromptProps): Promise<string> {
  const { renderToString: renderFn } = await import('react-dom/server');

  return await renderMDXPromptFile({
    filePath: promptPath,
    renderFn,
    data,
    components
  });
}