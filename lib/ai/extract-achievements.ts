import { renderExtractAchievementsPrompt } from "./prompts/extract-achievements";
import { achievementResponseSchema, type ExtractAchievementsFetcherProps, type ExtractAchievementsPromptProps, type ExtractedAchievement } from "./prompts/types";
import { streamObject } from "ai";
import { extractAchievementsModel } from ".";
import { getProjectsByUserId } from "../db/projects/queries";
import { getCompaniesByUserId } from "../db/queries";

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

/**
 * Renders the Extract Achievements Prompt
 * 
 * @param data ExtractAchievementsPromptProps
 * @returns string
 */
export function render(data: ExtractAchievementsPromptProps): string {
  return renderExtractAchievementsPrompt(data);
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
export async function* streamFetchRenderExecute(input: ExtractAchievementsFetcherProps): AsyncGenerator<ExtractedAchievement> {
  const data = await fetch(input);

  for await (const achievement of execute(render(data))) {
    yield achievement;
  }
}

/**
 * Fetches the data, renders the prompt, and executes the prompt, returning the extracted achievements
 * 
 * @param input ExtractAchievementsFetcherProps
 * @returns Promise<ExtractedAchievement[]>
 */
export async function fetchRenderExecute(input: ExtractAchievementsFetcherProps): Promise<ExtractedAchievement[]> {
  const data = await fetch(input);

  return await renderExecute(data);
}

/**
 * Renders the prompt and executes it, returning the extracted achievements
 * 
 * @param data ExtractAchievementsPromptProps
 * @returns Promise<ExtractedAchievement[]>
 */
export async function renderExecute(data: ExtractAchievementsPromptProps): Promise<ExtractedAchievement[]> {
  const achievements: ExtractedAchievement[] = [];
  
  for await (const achievement of execute(render(data))) {
    achievements.push(achievement);
  }

  return achievements;
}
