import { renderExtractAchievementsPrompt } from "./prompts/extract-achievements";
import { achievementResponseSchema, type ExtractAchievementsFetcherProps, type ExtractAchievementsPromptProps, type ExtractedAchievement } from "./prompts/types";
import { streamObject } from "ai";
import { extractAchievementsModel } from ".";
import { getProjectsByUserId } from "../db/projects/queries";
import { getCompaniesByUserId } from "../db/queries";

//given a minimal set of data, prepare the rest of the data required for the achievements extraction prompt
//This allows multiple LLM entrypoints to benefit from the same prompt prep
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

export function render(data: ExtractAchievementsPromptProps): string {
  return renderExtractAchievementsPrompt(data);
}

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


export async function* streamFetchRenderExecute(input: ExtractAchievementsFetcherProps): AsyncGenerator<ExtractedAchievement> {
  const data = await fetch(input);

  for await (const achievement of execute(render(data))) {
    yield achievement;
  }
}

export async function fetchRenderExecute(input: ExtractAchievementsFetcherProps): Promise<ExtractedAchievement[]> {
  const data = await fetch(input);

  return await renderExecute(data);
}

export async function renderExecute(data: ExtractAchievementsPromptProps): Promise<ExtractedAchievement[]> {
  const achievements: ExtractedAchievement[] = [];
  
  for await (const achievement of execute(render(data))) {
    achievements.push(achievement);
  }

  return achievements;
}
