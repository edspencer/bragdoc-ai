import {
  achievementResponseSchema,
  type ExtractCommitAchievementsPromptProps,
  type ExtractedAchievement,
} from './prompts/types';
import { streamObject, type LanguageModel } from 'ai';
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
 * Options for extraction execution
 */
export interface ExecuteOptions {
  /** Optional custom model to use. If not provided, uses getExtractionModel() */
  model?: LanguageModel;
}

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
 * @param options Optional execution options including custom model
 */
export async function* executeStream(
  prompt: string,
  options?: ExecuteOptions,
): AsyncGenerator<ExtractedAchievement, void, unknown> {
  const model = options?.model ?? (await getExtractionModel());

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
 * @param options Optional execution options including custom model
 */
export async function execute(
  prompt: string,
  options?: ExecuteOptions,
): Promise<ExtractedAchievement[]> {
  const achievements: ExtractedAchievement[] = [];

  for await (const achievement of executeStream(prompt, options)) {
    achievements.push(achievement);
  }

  return achievements;
}

/**
 * renderExecute takes a data argument, renders the prompt with it, then executes
 * the prompt, returning the array of ExtractedAchievement objects.
 *
 * @param data The data to render the prompt with
 * @param options Optional execution options including custom model
 * @returns ExtractedAchievement[]
 */
export async function renderExecute(
  data: ExtractCommitAchievementsPromptProps,
  options?: ExecuteOptions,
): Promise<ExtractedAchievement[]> {
  return await execute(await render(data), options);
}
