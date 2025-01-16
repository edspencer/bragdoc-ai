import { User } from "@/lib/db/schema";
import { renderExtractAchievementsPrompt } from "./prompts/extract-achievements";
import { achievementResponseSchema, ExtractAchievementsPromptProps, ExtractedAchievement } from "./prompts/types";
import { streamObject, Message } from "ai";
import { extractAchievementsModel } from ".";
import { getProjectsByUserId } from "../db/projects/queries";
import { getCompaniesByUserId } from "../db/queries";

export type PrepareExtractAchievementsPromptData = {
  user: User;
  message: string;
  chatHistory: Message[];
}

export async function preparePromptData(props: PrepareExtractAchievementsPromptData): Promise<ExtractAchievementsPromptProps> {
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

export async function* extractAchievements(input: ExtractAchievementsPromptProps): AsyncGenerator<ExtractedAchievement, void, unknown> {
  const prompt = renderExtractAchievementsPrompt(input);

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
