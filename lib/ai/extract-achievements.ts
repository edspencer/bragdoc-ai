import React from "react";
import { renderExtractAchievementsPrompt } from "./prompts/extract-achievements";
import { achievementResponseSchema, ExtractAchievementsFetcherProps, ExtractAchievementsPromptProps, ExtractedAchievement } from "./prompts/types";
import { streamObject } from "ai";
import { extractAchievementsModel } from ".";
import { getProjectsByUserId } from "../db/projects/queries";
import { getCompaniesByUserId } from "../db/queries";

//given a minimal set of data, prepare the rest of the data required for the achievements extraction prompt
//This allows multiple LLM entrypoints to benefit from the same prompt prep
export async function fetchPromptData(props: ExtractAchievementsFetcherProps): Promise<ExtractAchievementsPromptProps> {
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

export async function fetchAndExtractAchievements(input: ExtractAchievementsFetcherProps): Promise<ExtractedAchievement[]> {
  const data = await fetchPromptData(input);

  return await extractAchievements(data);
}

export async function extractAchievements(data: ExtractAchievementsPromptProps): Promise<ExtractedAchievement[]> {
  const prompt = renderExtractAchievementsPrompt(data);
  const achievements: ExtractedAchievement[] = [];
  
  for await (const achievement of executePrompt(prompt)) {
    achievements.push(achievement);
  }

  return achievements;
}


export async function* executePrompt(prompt: string): AsyncGenerator<ExtractedAchievement, void, unknown> {
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
