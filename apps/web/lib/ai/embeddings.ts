/**
 * Embeddings Module for Workstreams Feature
 *
 * Manages generation and caching of OpenAI embeddings for achievements
 * using the text-embedding-3-small model.
 */

import { openai } from '@ai-sdk/openai';
import { db, achievement, type Achievement } from '@bragdoc/database';
import { eq } from 'drizzle-orm';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

/**
 * Format achievement data for embedding generation
 * Combines title, summary, and optional details into a single text
 *
 * @param ach - Achievement to format
 * @returns Formatted text for embedding
 */
export function formatAchievementForEmbedding(ach: Achievement): string {
  const parts: string[] = [];

  // Always include title
  if (ach.title) {
    parts.push(ach.title);
  }

  // Include summary if available
  if (ach.summary) {
    parts.push(ach.summary);
  }

  // Include details only if relatively short (< 500 chars)
  if (ach.details && ach.details.length < 500) {
    parts.push(ach.details);
  }

  return parts.join(' ').trim();
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
  // Fetch achievement from database
  const achs = await db
    .select()
    .from(achievement)
    .where(eq(achievement.id, achievementId));

  const ach = achs[0];
  if (!ach) {
    throw new Error(`Achievement not found: ${achievementId}`);
  }

  // Format text for embedding
  const text = formatAchievementForEmbedding(ach);

  if (!text) {
    throw new Error(`Achievement has no text content: ${achievementId}`);
  }

  // Generate embedding using OpenAI
  const embeddingModel = openai.embedding(EMBEDDING_MODEL);
  const result = await embeddingModel.doEmbed({
    values: [text],
  });

  const embeddingObj = result.embeddings[0];

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
      embeddingModel: EMBEDDING_MODEL,
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
 * Generate embeddings for all achievements without them
 * Finds achievements with missing embeddings and generates them
 *
 * @param userId - User ID to scope query
 * @returns Number of embeddings generated
 */
export async function generateMissingEmbeddings(
  userId: string,
): Promise<number> {
  // Find achievements without embeddings
  const achievementsWithoutEmbeddings = await db
    .select()
    .from(achievement)
    .where(
      // This uses Drizzle's filter for null embeddings
      // We need to use raw SQL or multiple conditions
      eq(achievement.userId, userId),
      // Note: isNull(achievement.embedding) would be ideal but embeddings are stored as vector type
      // Drizzle may not properly support isNull for vector type, so we'll fetch all and filter
    );

  // Filter in application layer (as vector type may not be properly nullable in Drizzle)
  const needsEmbedding = achievementsWithoutEmbeddings.filter(
    (ach) => !ach.embedding,
  );

  if (needsEmbedding.length === 0) {
    return 0;
  }

  // Generate embeddings for all
  const ids = needsEmbedding.map((ach) => ach.id);
  await generateEmbeddingsBatch(ids);

  return ids.length;
}
