import { generateObject } from 'ai';
import { findExistingProjectModel } from 'lib/ai';
import { z } from 'zod';
import type { Project } from 'lib/db/schema';

/**
 * Schema for LLM response when matching repository to project
 */
const projectMatchResponseSchema = z.object({
  projectId: z
    .string()
    .nullable()
    .describe('ID of the matching project, or null if no match found'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence score between 0 and 1'),
  reasoning: z
    .string()
    .describe(
      'Explanation of why this project matches or why no match was found',
    ),
});

/**
 * Fuzzy match a repository to an existing project. If a match is found, return the project ID.
 * If no match is found, return null. Maybe this is not such a great thing for an LLM to do. Oh well.
 */
export async function fuzzyFindProject(
  repositoryName: string,
  projects: Project[],
): Promise<string | null> {
  console.log('Fuzzy finding project for repository:', repositoryName);

  const { object } = await generateObject({
    model: findExistingProjectModel,
    maxRetries: 3,
    temperature: 0.9,
    messages: [
      {
        role: 'system',
        content: `You are helping to match a Git repository to an existing project. The repository name is "${repositoryName}". You will be given a list of projects, and you need to determine if any of them are likely to be the same project as this repository.

Consider:
1. Name similarity
2. Project description relevance
3. Project dates (if available)

Respond with:
- projectId: ID of the matching project, or null if no good match
- confidence: How confident you are in the match (0-1)
- reasoning: Explain why you think it's a match or why no match was found`,
      },
      {
        role: 'user',
        content: JSON.stringify(
          projects.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            startDate: p.startDate,
            endDate: p.endDate,
          })),
        ),
      },
    ],
    schema: projectMatchResponseSchema,
  });

  if (object.projectId && object.confidence > 0.8) {
    return object.projectId;
  } else {
    return null;
  }
}
