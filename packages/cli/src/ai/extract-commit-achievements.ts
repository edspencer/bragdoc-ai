import {
  achievementResponseSchema,
  type ExtractCommitAchievementsPromptProps,
  type ExtractedAchievement,
} from './prompts/types';
import { streamObject } from 'ai';
import { getExtractionModel } from './llm';
import path from 'node:path';
import { renderMDXPromptFile } from 'mdx-prompt';
import * as components from './prompts/elements';

// Path to the MDX prompt file
const promptPath = path.resolve(
  __dirname,
  './prompts/extract-commit-achievements.mdx',
);

/**
 * Renders the prompt that extracts achievements from commit messages
 *
 * @param data All data needed to render the prompt
 * @returns a string that can be used to execute the prompt
 */
export async function render(
  data: ExtractCommitAchievementsPromptProps,
): Promise<string> {
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
  prompt: string,
): AsyncGenerator<ExtractedAchievement, void, unknown> {
  const model = await getExtractionModel();

  const { elementStream } = streamObject({
    model,
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

/**
 * renderExecute takes a data argument, renders the prompt with it, then executes
 * the prompt, returning the array of ExtractedAchievement objects.
 *
 * @param data The data to render the prompt with
 * @returns ExtractedAchievement[]
 */
export async function renderExecute(
  data: ExtractCommitAchievementsPromptProps,
): Promise<ExtractedAchievement[]> {
  return await execute(await render(data));
}
