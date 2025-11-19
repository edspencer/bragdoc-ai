#!/usr/bin/env tsx
/**
 * Generate Embeddings for Demo Data
 *
 * This script pre-generates embeddings for all achievements in demo-data.json
 * to avoid regenerating them every time a demo account is created.
 *
 * Usage:
 *   npx tsx scripts/generate-demo-embeddings.ts
 *
 * Requirements:
 *   - OPENAI_API_KEY environment variable must be set
 *   - demo-data.json must exist at lib/ai/demo-data.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { openai } from '@ai-sdk/openai';
import {
  exportDataSchema,
  type ExportData,
  type ExportAchievement,
} from '../lib/export-import-schema';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_MODEL_VERSION = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const DEMO_DATA_PATH = path.join(process.cwd(), 'lib', 'ai', 'demo-data.json');

/**
 * Format achievement data for embedding generation
 * This MUST match the logic in lib/ai/embeddings.ts
 */
function formatAchievementForEmbedding(
  achievement: ExportAchievement,
  projectName?: string | null,
): string {
  const parts: string[] = [];

  // Include project context first (helps with clustering)
  if (projectName) {
    parts.push(`Project: ${projectName}`);
  }

  // Always include title
  if (achievement.title) {
    parts.push(achievement.title);
  }

  // Include summary if available
  if (achievement.summary) {
    parts.push(achievement.summary);
  }

  // Include details only if relatively short (< 500 chars)
  if (achievement.details && achievement.details.length < 500) {
    parts.push(achievement.details);
  }

  // Use proper separators to maintain semantic boundaries
  return parts.join('. ').trim();
}

/**
 * Generate embedding for a single achievement
 */
async function generateEmbedding(
  achievement: ExportAchievement,
  projectName?: string | null,
): Promise<number[]> {
  const text = formatAchievementForEmbedding(achievement, projectName);

  if (!text) {
    throw new Error(
      `Achievement has no text content: ${achievement.id} (${achievement.title})`,
    );
  }

  console.log(
    `  Generating embedding for: ${achievement.title.substring(0, 60)}...`,
  );

  const embeddingModel = openai.embedding(EMBEDDING_MODEL);
  const embeddingResult = await embeddingModel.doEmbed({
    values: [text],
  });

  const embeddingObj = embeddingResult.embeddings[0];

  if (!embeddingObj) {
    throw new Error('Failed to generate embedding: no result returned');
  }

  const embeddingVector = embeddingObj as unknown as number[];

  if (
    !Array.isArray(embeddingVector) ||
    embeddingVector.length !== EMBEDDING_DIMENSIONS
  ) {
    throw new Error(
      `Invalid embedding dimension: expected ${EMBEDDING_DIMENSIONS}, got ${Array.isArray(embeddingVector) ? embeddingVector.length : typeof embeddingVector}`,
    );
  }

  return embeddingVector;
}

/**
 * Main function
 */
async function main() {
  console.log('Demo Data Embedding Generator\n');

  // Check for OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is not set');
    process.exit(1);
  }

  // Check if demo data file exists
  if (!fs.existsSync(DEMO_DATA_PATH)) {
    console.error(`Error: Demo data file not found at ${DEMO_DATA_PATH}`);
    process.exit(1);
  }

  // Read and parse demo data
  console.log(`Reading demo data from: ${DEMO_DATA_PATH}`);
  const demoDataRaw = fs.readFileSync(DEMO_DATA_PATH, 'utf-8');
  const demoDataJson = JSON.parse(demoDataRaw);

  // Validate against schema
  const result = exportDataSchema.safeParse(demoDataJson);
  if (!result.success) {
    console.error('Error: Invalid demo data format');
    console.error(JSON.stringify(result.error.errors, null, 2));
    process.exit(1);
  }

  const demoData: ExportData = result.data;

  console.log(`\nFound ${demoData.achievements.length} achievements`);
  console.log(`Found ${demoData.projects.length} projects`);

  // Create a map of project ID to project name for context
  const projectMap = new Map<string, string>();
  for (const project of demoData.projects) {
    projectMap.set(project.id, project.name);
  }

  // Check how many already have embeddings
  const achievementsWithEmbeddings = demoData.achievements.filter(
    (a) => a.embedding && a.embedding.length > 0,
  );
  const achievementsNeedingEmbeddings = demoData.achievements.filter(
    (a) => !a.embedding || a.embedding.length === 0,
  );

  console.log(
    `Achievements with embeddings: ${achievementsWithEmbeddings.length}`,
  );
  console.log(
    `Achievements needing embeddings: ${achievementsNeedingEmbeddings.length}`,
  );

  if (achievementsNeedingEmbeddings.length === 0) {
    console.log('\nAll achievements already have embeddings! Nothing to do.');
    return;
  }

  console.log(
    `\nGenerating embeddings for ${achievementsNeedingEmbeddings.length} achievements...\n`,
  );

  let successCount = 0;
  let errorCount = 0;

  // Process achievements in batches to avoid rate limits
  const BATCH_SIZE = 10;
  const DELAY_MS = 1000; // 1 second delay between batches

  for (let i = 0; i < achievementsNeedingEmbeddings.length; i += BATCH_SIZE) {
    const batch = achievementsNeedingEmbeddings.slice(i, i + BATCH_SIZE);

    console.log(
      `\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1} (achievements ${i + 1}-${Math.min(i + BATCH_SIZE, achievementsNeedingEmbeddings.length)})`,
    );

    // Process batch in parallel
    const promises = batch.map(async (achievement) => {
      try {
        const projectName = achievement.projectId
          ? projectMap.get(achievement.projectId)
          : null;
        const embedding = await generateEmbedding(achievement, projectName);

        // Update achievement with embedding
        achievement.embedding = embedding;
        achievement.embeddingModel = EMBEDDING_MODEL_VERSION;
        achievement.embeddingGeneratedAt = new Date().toISOString();

        successCount++;
      } catch (error) {
        console.error(
          `  ERROR generating embedding for ${achievement.id}: ${error}`,
        );
        errorCount++;
      }
    });

    await Promise.all(promises);

    // Delay between batches to avoid rate limits
    if (i + BATCH_SIZE < achievementsNeedingEmbeddings.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  console.log('\n\n=== Summary ===');
  console.log(`Total achievements: ${demoData.achievements.length}`);
  console.log(`Successfully generated: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(
    `Total with embeddings: ${achievementsWithEmbeddings.length + successCount}`,
  );

  if (successCount > 0) {
    // Write updated data back to file
    console.log(`\nWriting updated data to: ${DEMO_DATA_PATH}`);
    const updatedJson = JSON.stringify(demoData, null, 2);
    fs.writeFileSync(DEMO_DATA_PATH, updatedJson, 'utf-8');
    console.log('Done!');
  } else {
    console.log('\nNo changes made to demo data file.');
  }

  if (errorCount > 0) {
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
