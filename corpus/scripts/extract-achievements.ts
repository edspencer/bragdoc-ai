#!/usr/bin/env npx ts-node
/**
 * Extract Achievements from Corpus Repository
 *
 * This script extracts achievements from commits in a corpus repository using
 * the same LLM extraction logic as the bragdoc CLI. It's designed to be called
 * from generate-snapshot.sh to populate snapshots with actual extracted achievements.
 *
 * Usage:
 *   npx ts-node corpus/scripts/extract-achievements.ts <commits-json-file> <repo-info-json>
 *
 * Arguments:
 *   commits-json-file  Path to JSON file containing commit array from snapshot
 *   repo-info-json     Path to JSON file with repository info
 *
 * Environment:
 *   OPENAI_API_KEY (or other LLM key) - Required for extraction
 *
 * Output:
 *   Writes achievements JSON to stdout (for piping to jq or file)
 */

import * as fs from 'fs';
import * as path from 'path';
import type { LanguageModel } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

// Import from @bragdoc/cli library - uses the exact same extraction code as the CLI
import {
  renderExecute,
  type Commit,
  type Repository,
  type ExtractedAchievement,
} from '@bragdoc/cli';

// Types for snapshot commit format
interface SnapshotCommit {
  hash: string;
  shortHash: string;
  subject: string;
  authorName: string;
  authorEmail: string;
  date: string;
}

interface RepoInfo {
  url: string;
  slug: string;
  category: string;
  language: string;
  mergeStrategy: string;
  path: string;
}

interface ExtractionResult {
  achievementCount: number;
  achievements: SerializedAchievement[];
  status: 'complete' | 'error' | 'skipped';
  note?: string;
  extractedAt: string;
  llmProvider?: string;
}

interface SerializedAchievement {
  title: string;
  summary: string;
  details?: string;
  impact: number;
  eventDuration: string;
  eventStart: string | null;
  eventEnd: string | null;
  commitHash?: string;
  sourceIds: string[];
}

/**
 * Transform snapshot commit format to CLI Commit format
 */
function transformCommit(commit: SnapshotCommit): Commit {
  return {
    hash: commit.hash,
    message: commit.subject,
    author: {
      name: commit.authorName,
      email: commit.authorEmail,
    },
    date: commit.date,
  };
}

/**
 * Transform extracted achievement to serializable format
 */
function serializeAchievement(
  achievement: ExtractedAchievement,
): SerializedAchievement {
  return {
    title: achievement.title,
    summary: achievement.summary || '',
    details: achievement.details,
    impact: achievement.impact,
    eventDuration: achievement.eventDuration,
    eventStart: achievement.eventStart
      ? achievement.eventStart.toISOString()
      : null,
    eventEnd: achievement.eventEnd ? achievement.eventEnd.toISOString() : null,
    commitHash: achievement.commitHash,
    sourceIds: achievement.commitHash ? [achievement.commitHash] : [],
  };
}

/**
 * Detect which LLM provider is configured and return info
 */
function detectLLMProvider(): {
  provider: string;
  model: LanguageModel;
} | null {
  if (process.env.OPENAI_API_KEY) {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return { provider: 'openai', model: openai('gpt-4o') };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    return {
      provider: 'anthropic',
      model: anthropic('claude-3-5-sonnet-20241022'),
    };
  }
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return { provider: 'google', model: google('gemini-1.5-pro') };
  }
  if (process.env.DEEPSEEK_API_KEY) {
    const deepseek = createOpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com/v1',
    });
    return { provider: 'deepseek', model: deepseek('deepseek-chat') };
  }
  return null;
}

/**
 * Process commits in batches to avoid overwhelming the LLM
 * Uses the exact same renderExecute function as the CLI
 */
async function extractInBatches(
  commits: Commit[],
  repository: Repository,
  model: LanguageModel,
  batchSize: number = 20,
): Promise<ExtractedAchievement[]> {
  const allAchievements: ExtractedAchievement[] = [];
  const totalBatches = Math.ceil(commits.length / batchSize);

  console.error(
    `Processing ${commits.length} commits in ${totalBatches} batch(es)...`,
  );

  for (let i = 0; i < commits.length; i += batchSize) {
    const batchNum = Math.floor(i / batchSize) + 1;
    const batch = commits.slice(i, i + batchSize);

    console.error(
      `  Batch ${batchNum}/${totalBatches}: ${batch.length} commits`,
    );

    try {
      // Use renderExecute from @bragdoc/cli with custom model
      const achievements = await renderExecute(
        {
          commits: batch,
          repository,
          // For corpus extraction, we don't have user context
          // The LLM will extract achievements without company/project associations
          companies: [],
          projects: [],
          user: {
            id: 'corpus-test',
            email: batch[0]?.author.email || 'unknown@example.com',
            name: batch[0]?.author.name,
          },
        },
        { model },
      );

      console.error(`    -> Extracted ${achievements.length} achievement(s)`);
      allAchievements.push(...achievements);
    } catch (error: any) {
      console.error(`    -> Error: ${error.message}`);
      // Continue with next batch instead of failing entirely
    }
  }

  return allAchievements;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error(
      'Usage: extract-achievements.ts <commits-json-file> <repo-info-json>',
    );
    console.error('');
    console.error('Arguments:');
    console.error(
      '  commits-json-file  Path to JSON file containing commit array',
    );
    console.error(
      '  repo-info-json     Path to JSON file with repository info',
    );
    process.exit(1);
  }

  const commitsFile = args[0];
  const repoInfoFile = args[1];

  if (!commitsFile || !repoInfoFile) {
    console.error('Error: Both commits file and repo info file are required');
    process.exit(1);
  }

  // Check for LLM API key
  const llmConfig = detectLLMProvider();
  if (!llmConfig) {
    // No API key - output skipped result
    const result: ExtractionResult = {
      achievementCount: 0,
      achievements: [],
      status: 'skipped',
      note: 'No LLM API key found. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, or DEEPSEEK_API_KEY to enable extraction.',
      extractedAt: new Date().toISOString(),
    };
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }

  console.error(`Using LLM provider: ${llmConfig.provider}`);

  // Load commits
  const commitsPath = path.resolve(commitsFile);
  if (!fs.existsSync(commitsPath)) {
    console.error(`Error: Commits file not found: ${commitsPath}`);
    process.exit(1);
  }

  let snapshotCommits: SnapshotCommit[];
  try {
    const content = fs.readFileSync(commitsPath, 'utf-8');
    snapshotCommits = JSON.parse(content);
  } catch (error: any) {
    console.error(`Error parsing commits file: ${error.message}`);
    process.exit(1);
  }

  // Load repo info
  const repoInfoPath = path.resolve(repoInfoFile);
  if (!fs.existsSync(repoInfoPath)) {
    console.error(`Error: Repo info file not found: ${repoInfoPath}`);
    process.exit(1);
  }

  let repoInfo: RepoInfo;
  try {
    const content = fs.readFileSync(repoInfoPath, 'utf-8');
    repoInfo = JSON.parse(content);
  } catch (error: any) {
    console.error(`Error parsing repo info file: ${error.message}`);
    process.exit(1);
  }

  console.error(`Repository: ${repoInfo.slug}`);
  console.error(`Commits to process: ${snapshotCommits.length}`);

  // Transform commits to CLI format
  const commits: Commit[] = snapshotCommits.map(transformCommit);

  // Create repository object
  const repository: Repository = {
    name: repoInfo.slug,
    path: repoInfo.path,
    remoteUrl: repoInfo.url,
  };

  try {
    // Extract achievements using CLI's extraction logic
    const achievements = await extractInBatches(
      commits,
      repository,
      llmConfig.model,
    );

    // Serialize and output
    const result: ExtractionResult = {
      achievementCount: achievements.length,
      achievements: achievements.map(serializeAchievement),
      status: 'complete',
      extractedAt: new Date().toISOString(),
      llmProvider: llmConfig.provider,
    };

    console.log(JSON.stringify(result, null, 2));
  } catch (error: any) {
    const result: ExtractionResult = {
      achievementCount: 0,
      achievements: [],
      status: 'error',
      note: `Extraction failed: ${error.message}`,
      extractedAt: new Date().toISOString(),
      llmProvider: llmConfig.provider,
    };
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }
}

main();
