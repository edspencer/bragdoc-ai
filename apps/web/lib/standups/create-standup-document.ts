import type { Standup, StandupDocument } from '@bragdoc/database';
import {
  getCurrentStandupDocument,
  createStandupDocument,
  updateStandupDocumentAchievementsSummary,
  getRecentAchievementsForStandup,
} from '@bragdoc/database';
import { getStandupAchievementDateRange } from '../scheduling/nextRun';
import { generateStandupSummary } from '../ai/standup-summary';

/**
 * Create or update a standup document with AI-generated summary
 *
 * @param standupId - ID of the standup
 * @param userId - ID of the user
 * @param standup - Standup configuration
 * @param targetDate - Date for the standup document (defaults to next run date)
 * @param regenerate - If true, regenerate summary even if document exists
 * @returns Created or updated standup document
 */
export async function createOrUpdateStandupDocument(
  standupId: string,
  userId: string,
  standup: Standup,
  targetDate?: Date,
  regenerate = false,
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
    // Calculate date range for relevant achievements
    const { startDate, endDate } = getStandupAchievementDateRange(
      docDate,
      standup.timezone,
      standup.meetingTime,
      standup.daysMask,
    );

    // Fetch achievements in the standup date range
    const achievements = await getRecentAchievementsForStandup(
      standup,
      startDate,
      endDate,
    );

    // Generate summary using AI
    const summary = await generateStandupSummary(
      achievements,
      standup.instructions || undefined,
    );

    // Update document with summary
    document = await updateStandupDocumentAchievementsSummary(
      document.id,
      summary,
    );
  }

  return document;
}
