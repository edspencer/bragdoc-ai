import type { Standup, StandupDocument, Achievement } from '@bragdoc/database';
import {
  getCurrentStandupDocument,
  createStandupDocument,
  updateStandupDocumentAchievementsSummary,
  updateStandupDocumentSummary,
  getRecentAchievementsForStandup,
  bulkUpdateAchievementStandupDocument,
  db,
} from '@bragdoc/database';
import { achievement as achievementTable } from '@bragdoc/database/schema';
import { inArray } from 'drizzle-orm';
import { getStandupAchievementDateRange } from '../scheduling/nextRun';
import {
  generateStandupAchievementsSummary,
  generateStandupDocumentSummary,
} from '../ai/standup-summary';

/**
 * Create or update a standup document with AI-generated summary
 *
 * @param standupId - ID of the standup
 * @param userId - ID of the user
 * @param standup - Standup configuration
 * @param targetDate - Date for the standup document (defaults to next run date)
 * @param regenerate - If true, regenerate summary even if document exists
 * @param achievementIds - Optional list of specific achievement IDs to include
 * @returns Created or updated standup document
 */
export async function createOrUpdateStandupDocument(
  standupId: string,
  userId: string,
  standup: Standup,
  targetDate?: Date,
  regenerate = false,
  achievementIds?: string[]
): Promise<StandupDocument> {
  // Get or create document
  let document: StandupDocument | null = null;

  if (!targetDate) {
    // If no target date specified, get the current document (next scheduled)
    document = await getCurrentStandupDocument(standupId);
  }

  const docDate = targetDate || new Date();

  if (!document) {
    // Create a new document
    document = await createStandupDocument({
      standupId,
      userId,
      date: docDate,
    });
  }

  // If regenerate is requested or no summary exists, generate from achievements
  if (regenerate || !document.achievementsSummary) {
    let achievements: Achievement[];

    if (achievementIds && achievementIds.length > 0) {
      // Fetch specific achievements by IDs
      achievements = await db
        .select()
        .from(achievementTable)
        .where(inArray(achievementTable.id, achievementIds));
    } else {
      // Calculate date range for relevant achievements
      const { startDate, endDate } = getStandupAchievementDateRange(
        docDate,
        standup.timezone,
        standup.meetingTime,
        standup.daysMask
      );

      // Fetch achievements in the standup date range
      achievements = await getRecentAchievementsForStandup(
        standup,
        startDate,
        endDate
      );
    }

    // Generate summary using AI
    const summary = await generateStandupAchievementsSummary(
      achievements,
      standup.instructions || undefined
    );

    // Update document with summary (source: 'llm' since it's AI-generated)
    document = await updateStandupDocumentAchievementsSummary(
      document.id,
      summary,
      'llm'
    );

    // Link achievements to this standup document
    if (achievements.length > 0) {
      const achievementIdsToLink = achievements.map(a => a.id);
      await bulkUpdateAchievementStandupDocument(achievementIdsToLink, document.id);
    }
  }

  // Generate and save the short summary for list views
  if (document.achievementsSummary || document.wip) {
    const shortSummary = await generateStandupDocumentSummary({
      achievementsSummary: document.achievementsSummary,
      wip: document.wip,
    });

    document = await updateStandupDocumentSummary(document.id, shortSummary);
  }

  return document;
}
