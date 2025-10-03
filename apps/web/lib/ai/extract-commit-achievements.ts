import {
  achievementResponseSchema,
  type ExtractCommitAchievementsPromptProps,
  type ExtractedAchievement,
  type FetchExtractCommitAchievementsPromptProps,
} from './prompts/types';
import { streamObject } from 'ai';
import { extractAchievementsModel } from '.';
import { getProjectsByUserId } from '@/database/projects/queries';
import { getCompaniesByUserId } from '@/database/queries';

import { renderMDXPromptFile } from 'mdx-prompt';
import * as components from './prompts/elements';
import { join } from 'node:path';

/**
 * Fetches data necessary to render the Extract Commit Achievements Prompt
 *
 * @param props FetchExtractCommitAchievementsPromptProps
 * @returns all the data required to render the prompt
 */
export async function fetch(
  props: FetchExtractCommitAchievementsPromptProps
): Promise<ExtractCommitAchievementsPromptProps> {
  const { user, commits, repository } = props;

  const [projects, companies] = await Promise.all([
    getProjectsByUserId(user.id),
    getCompaniesByUserId({ userId: user.id }),
  ]);

  return {
    commits,
    repository,
    companies,
    projects,
    user,
  };
}

/**
 * Renders the prompt that extracts achievements from commit messages
 *
 * @param data
 * @returns a string that can be used to execute the prompt
 */
export async function render(
  data: ExtractCommitAchievementsPromptProps
): Promise<string> {
  // Use absolute path from process.cwd() for better compatibility
  const promptPath = join(
    process.cwd(),
    'lib/ai/prompts/extract-commit-achievements.mdx'
  );

  console.log('promptPath:', promptPath);
  console.log('cwd:', process.cwd());

  return await renderMDXPromptFile({
    filePath: promptPath,
    data,
    components,
  });
}

/**
 * executeStream takes a prompt and returns an async generator that yields
 * an ExtractedAchievement object for each achievement in the prompt.
 *
 * @param prompt The prompt to extract achievements from
 */
export async function* executeStream(
  prompt: string
): AsyncGenerator<ExtractedAchievement, void, unknown> {
  const { elementStream } = streamObject({
    model: extractAchievementsModel,
    prompt,
    temperature: 0,
    output: 'array',
    schema: achievementResponseSchema,
  });

  for await (const element of elementStream) {
    yield {
      ...element,
      summary: element.summary || '',
      details: element.details || '',
      eventStart: element.eventStart ? new Date(element.eventStart) : null,
      eventEnd: element.eventEnd ? new Date(element.eventEnd) : null,
      impactSource: 'llm',
      impactUpdatedAt: new Date(),
    };
  }
}

/**
 * Executes a pre-rendered prompt string and returns an array of ExtractedAchievement objects
 *
 * @param prompt The prompt to extract achievements from
 */
export async function execute(prompt: string): Promise<ExtractedAchievement[]> {
  const achievements: ExtractedAchievement[] = [];

  for await (const achievement of executeStream(prompt)) {
    achievements.push(achievement);
  }

  return achievements;
}

export async function fetchRender(
  input: FetchExtractCommitAchievementsPromptProps
): Promise<string> {
  const data = await fetch(input);
  return await render(data);
}

/**
 * First fetches data necessary to render the prompt from, renders the prompt, and executes
 * the rendered prompt.
 *
 * @param input FetchExtractCommitAchievementsPromptProps
 * @returns ExtractedAchievement[]
 */
export async function fetchRenderExecute(
  input: FetchExtractCommitAchievementsPromptProps
): Promise<ExtractedAchievement[]> {
  return await execute(await render(await fetch(input)));
}

/**
 * renderExecute takes a data argument, renders the prompt with it, then executes
 * the prompt, returning the array of ExtractedAchievement objects.
 *
 * @param data The prompt to extract achievements from
 * @returns ExtractedAchievement[]
 */
export async function renderExecute(
  data: ExtractCommitAchievementsPromptProps
): Promise<ExtractedAchievement[]> {
  return await execute(await render(data));
}
