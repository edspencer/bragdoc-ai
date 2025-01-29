import { achievementResponseSchema, type ExtractAchievementsFetcherProps, type ExtractAchievementsPromptProps, type ExtractedAchievement } from "./prompts/types";
import { streamObject } from "ai";
import { extractAchievementsModel } from ".";
import { getProjectsByUserId } from "../db/projects/queries";
import { getCompaniesByUserId } from "../db/queries";

import path from "path";

const promptPath = path.resolve("./lib/ai/prompts/extract-achievements.mdx");
import { renderMDXPromptFile } from "./mdx-prompt";

/**
 * Fetches the data necessary to render the Extract Achievements Prompt.
 * Given a minimal set of data, prepares the rest of the data required 
 * for the achievements extraction prompt
 * 
 * @param props ExtractAchievementsFetcherProps
 * @returns ExtractAchievementsPromptProps
 */
export async function fetch(props: ExtractAchievementsFetcherProps): Promise<ExtractAchievementsPromptProps> {
  const {user, message, chatHistory} = props;

  const [projects, companies] = await Promise.all([
    getProjectsByUserId(user.id),
    getCompaniesByUserId({ userId: user.id }),
  ]);

  return {
    message,
    chatHistory,
    companies,
    projects,
    user
  }
}

export type RunOptions = {
  renderFn: Function;
};

/**
 * Renders the Extract Achievements Prompt
 * 
 * @param data ExtractAchievementsPromptProps
 * @param options RenderOptions
 * @returns string
 */
export async function render(data: ExtractAchievementsPromptProps, options?: RunOptions): Promise<string> {
  const { renderToStaticMarkup: renderFn } = await import('react-dom/server');

  const res = await renderMDXPromptFile({
    filePath: promptPath,
    renderFn,
    data,
  });

  console.log(res)
  return res; 

}

/**
 * Executes the rendered prompt and yields the extracted achievements
 * 
 * @param prompt string
 * @returns AsyncGenerator<ExtractedAchievement, void, unknown>
 */
export async function* execute(prompt: string): AsyncGenerator<ExtractedAchievement, void, unknown> {
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
 * Fetches the data, renders the prompt, and executes the prompt, yielding the extracted achievements
 * 
 * @param input ExtractAchievementsFetcherProps
 * @returns AsyncGenerator<ExtractedAchievement>
 */
export async function* streamFetchRenderExecute(input: ExtractAchievementsFetcherProps, options?: RunOptions): AsyncGenerator<ExtractedAchievement> {
  const data = await fetch(input);

  for await (const achievement of execute(await render(data, options))) {
    yield achievement;
  }
}

export async function fetchRender(input: ExtractAchievementsFetcherProps, options?: RunOptions): Promise<string> {
  const data = await fetch(input);
  return await render(data, options);
}

/**
 * Fetches the data, renders the prompt, and executes the prompt, returning the extracted achievements
 * 
 * @param input ExtractAchievementsFetcherProps
 * @returns Promise<ExtractedAchievement[]>
 */
export async function fetchRenderExecute(input: ExtractAchievementsFetcherProps, options?: RunOptions): Promise<ExtractedAchievement[]> {
  const data = await fetch(input);

  return await renderExecute(data, options);
}

/**
 * Renders the prompt and executes it, returning the extracted achievements
 * 
 * @param data ExtractAchievementsPromptProps
 * @returns Promise<ExtractedAchievement[]>
 */
export async function renderExecute(data: ExtractAchievementsPromptProps, options?: RunOptions): Promise<ExtractedAchievement[]> {
  const achievements: ExtractedAchievement[] = [];
  
  for await (const achievement of execute(await render(data, options))) {
    achievements.push(achievement);
  }

  return achievements;
}
