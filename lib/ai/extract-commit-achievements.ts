import type { User } from "@/lib/db/schema";
import { renderExtractCommitAchievementsPrompt } from "./prompts/extract-commit-achievements";
import { achievementResponseSchema, type ExtractCommitAchievementsPromptProps, type ExtractedAchievement, type Commit, type Repository } from "./prompts/types";
import { streamObject } from "ai";
import { extractAchievementsModel } from ".";
import { getProjectsByUserId } from "../db/projects/queries";
import { getCompaniesByUserId } from "../db/queries";

export type FetchExtractCommitAchievementsPromptProps = {
  user: User;
  commits: Commit[];
  repository: Repository;
}

export async function fetch(props: FetchExtractCommitAchievementsPromptProps): Promise<ExtractCommitAchievementsPromptProps> {
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

export function render(data: ExtractCommitAchievementsPromptProps): string {
  return renderExtractCommitAchievementsPrompt(data);
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

export async function fetchRenderExecute(input: FetchExtractCommitAchievementsPromptProps): Promise<ExtractedAchievement[]> {
  const data = await fetch(input);
  
  return await renderExecute(data);
} 

export async function renderExecute(data: ExtractCommitAchievementsPromptProps): Promise<ExtractedAchievement[]> {
  const achievements: ExtractedAchievement[] = [];

  for await (const achievement of execute(render(data))) {
    achievements.push(achievement);
  }

  return achievements;
}