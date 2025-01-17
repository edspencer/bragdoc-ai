import { User } from "@/lib/db/schema";
import { renderExtractCommitAchievementsPrompt } from "./prompts/extract-commit-achievements";
import { achievementResponseSchema, ExtractCommitAchievementsPromptProps, ExtractedAchievement } from "./prompts/types";
import { streamObject } from "ai";
import { extractAchievementsModel } from ".";
import { getProjectsByUserId } from "../db/projects/queries";
import { getCompaniesByUserId } from "../db/queries";
import { Commit, Repository } from "./prompts/types";

export type FetchExtractCommitAchievementsPromptProps = {
  user: User;
  commits: Commit[];
  repository: Repository;
}

export async function fetchPromptData(props: FetchExtractCommitAchievementsPromptProps): Promise<ExtractCommitAchievementsPromptProps> {
  const {user, commits, repository} = props;

  const [projects, companies] = await Promise.all([
    getProjectsByUserId(user.id),
    getCompaniesByUserId({ userId: user.id }),
  ]);

  return {
    commits,
    repository,
    companies,
    projects,
    user
  }
}

export async function fetchExtractCommitAchievements(input: FetchExtractCommitAchievementsPromptProps): Promise<ExtractedAchievement[]> {
  const data = await fetchPromptData(input);
  const prompt = renderExtractCommitAchievementsPrompt(data);
  const achievements: ExtractedAchievement[] = [];
  for await (const achievement of extractCommitAchievements(prompt)) {
    achievements.push(achievement);
  }

  return achievements;
}

export async function* extractCommitAchievements(prompt: string): AsyncGenerator<ExtractedAchievement, void, unknown> {
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
