/**
 * Embeddings Module for Workstreams Feature
 *
 * Manages generation and caching of OpenAI embeddings for achievements
 * using the text-embedding-3-small model.
 */

import { openai } from '@ai-sdk/openai';
import { db, achievement, project, type Achievement } from '@bragdoc/database';
import { eq } from 'drizzle-orm';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_MODEL_VERSION = 'text-embedding-3-small'; // Version tracking for embedding format changes
const EMBEDDING_DIMENSIONS = 1536;

/**
 * Format achievement data for embedding generation
 * Combines title, summary, optional details, and project context into a single text
 *
 * Note: This format is optimized for semantic similarity matching.
 * Project context helps cluster related achievements together.
 *
 * @param ach - Achievement to format
 * @param projectName - Optional project name for context
 * @returns Formatted text for embedding
 */
export function formatAchievementForEmbedding(
  ach: Achievement,
  projectName?: string | null,
): string {
  const parts: string[] = [];

  // Include project context first (helps with clustering)
  if (projectName) {
    parts.push(`Project: ${projectName}`);
  }

  // Always include title
  if (ach.title) {
    parts.push(ach.title);
  }

  // Include summary if available
  if (ach.summary) {
    parts.push(ach.summary);
  }

  // Include details only if relatively short (< 500 chars)
  // Longer details add noise and exceed optimal embedding length
  if (ach.details && ach.details.length < 500) {
    parts.push(ach.details);
  }

  // Use proper separators to maintain semantic boundaries
  return parts.join('. ').trim();
}

/**
 * Generate embedding for a single achievement
 * Fetches from database, generates embedding using OpenAI,
 * saves back to database, and returns the embedding
 *
 * @param achievementId - ID of achievement to generate embedding for
 * @returns The generated embedding vector
 * @throws Error if achievement not found or API fails
 */
export async function generateAchievementEmbedding(
  achievementId: string,
): Promise<number[]> {
  // Fetch achievement with project context using LEFT JOIN
  const results = await db
    .select({
      achievement: achievement,
      projectName: project.name,
    })
    .from(achievement)
    .leftJoin(project, eq(achievement.projectId, project.id))
    .where(eq(achievement.id, achievementId));

  const result = results[0];
  if (!result) {
    throw new Error(`Achievement not found: ${achievementId}`);
  }

  const ach = result.achievement;
  const projectName = result.projectName;

  // Format text for embedding with project context
  const text = formatAchievementForEmbedding(ach, projectName);

  if (!text) {
    throw new Error(`Achievement has no text content: ${achievementId}`);
  }

  // Debug: log first few achievement texts to see what we're embedding
  if (Math.random() < 0.05) {
    // Log ~5% of achievements
    console.log('[Embedding Debug] Sample text:', text.substring(0, 200));
  }

  // Generate embedding using OpenAI
  const embeddingModel = openai.embedding(EMBEDDING_MODEL);
  const embeddingResult = await embeddingModel.doEmbed({
    values: [text],
  });

  const embeddingObj = embeddingResult.embeddings[0];

  if (!embeddingObj) {
    throw new Error('Failed to generate embedding: no result returned');
  }

  // The embedding object contains the vector directly
  const embeddingVector = embeddingObj as unknown as number[];

  if (
    !Array.isArray(embeddingVector) ||
    embeddingVector.length !== EMBEDDING_DIMENSIONS
  ) {
    throw new Error(
      `Invalid embedding dimension: expected ${EMBEDDING_DIMENSIONS}, got ${Array.isArray(embeddingVector) ? embeddingVector.length : typeof embeddingVector}`,
    );
  }

  // Save embedding to database
  const now = new Date();
  await db
    .update(achievement)
    .set({
      embedding: embeddingVector as unknown as any,
      embeddingModel: EMBEDDING_MODEL_VERSION, // Store version instead of raw model name
      embeddingGeneratedAt: now,
      updatedAt: now,
    })
    .where(eq(achievement.id, achievementId));

  return embeddingVector;
}

/**
 * Generate embeddings for multiple achievements in parallel
 * Handles errors gracefully by logging and continuing
 *
 * @param achievementIds - IDs of achievements to embed
 * @returns Map of achievementId to embedding vector
 */
export async function generateEmbeddingsBatch(
  achievementIds: string[],
): Promise<Map<string, number[]>> {
  const result = new Map<string, number[]>();

  // Process in parallel with Promise.all
  const promises = achievementIds.map(async (id) => {
    try {
      const embedding = await generateAchievementEmbedding(id);
      result.set(id, embedding);
    } catch (error) {
      console.error(
        `Failed to generate embedding for achievement ${id}:`,
        error,
      );
      // Continue processing other achievements
    }
  });

  await Promise.all(promises);

  return result;
}

/**
 * Generate embeddings for all achievements without them or with outdated versions
 * Finds achievements with missing/outdated embeddings and regenerates them
 *
 * @param userId - User ID to scope query
 * @returns Number of embeddings generated
 */
export async function generateMissingEmbeddings(
  userId: string,
): Promise<number> {
  // Find all achievements for user
  const allAchievements = await db
    .select()
    .from(achievement)
    .where(eq(achievement.userId, userId));

  // Filter for achievements needing embeddings:
  // 1. No embedding at all, OR
  // 2. Embedding with old version (different from current EMBEDDING_MODEL_VERSION)
  const needsEmbedding = allAchievements.filter(
    (ach) => !ach.embedding || ach.embeddingModel !== EMBEDDING_MODEL_VERSION,
  );

  if (needsEmbedding.length === 0) {
    return 0;
  }

  console.log(
    `[Embeddings] Regenerating ${needsEmbedding.length} embeddings with model ${EMBEDDING_MODEL_VERSION}`,
  );

  // Generate embeddings for all
  const ids = needsEmbedding.map((ach) => ach.id);
  await generateEmbeddingsBatch(ids);

  return ids.length;
}
