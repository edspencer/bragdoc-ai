/**
 * Demo Data Import Service
 *
 * Handles importing pre-populated demo data from the bundled demo-data.json file
 * into a newly created demo user account.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  exportDataSchema,
  type ExportAchievement,
  type ExportDocument,
  type ExportPerformanceReview,
} from '@/lib/export-import-schema';
import { importUserData, type ImportStats } from '@/lib/import-user-data';

/**
 * Shifts achievement dates forward to keep demo data fresh
 *
 * Since prepare-demo-data distributes achievements relative to when it runs,
 * we need to shift them forward when importing to keep them current.
 * This finds the newest achievement and calculates how many days have passed
 * since the script was run, then applies that shift to all achievements.
 *
 * @param achievements - Array of achievements to shift
 * @returns Array of achievements with dates shifted to present day
 */
function shiftAchievementDatesToPresent(
  achievements: ExportAchievement[],
): ExportAchievement[] {
  if (achievements.length === 0) {
    return achievements;
  }

  // Find the newest achievement by eventStart date
  let newestDate: Date | null = null;
  for (const achievement of achievements) {
    if (achievement.eventStart) {
      const date = new Date(achievement.eventStart);
      if (!newestDate || date > newestDate) {
        newestDate = date;
      }
    }
  }

  // If no achievements have eventStart dates, return as-is
  if (!newestDate) {
    return achievements;
  }

  // Calculate how many days have passed since the newest achievement
  const now = new Date();
  const daysPassedMs = now.getTime() - newestDate.getTime();
  const daysPassed = Math.floor(daysPassedMs / (24 * 60 * 60 * 1000));

  // If less than 1 day has passed, no shift needed
  if (daysPassed <= 0) {
    return achievements;
  }

  // Shift all achievement dates forward
  const shiftMs = daysPassed * 24 * 60 * 60 * 1000;
  return achievements.map((achievement) => ({
    ...achievement,
    eventStart: achievement.eventStart
      ? new Date(
          new Date(achievement.eventStart).getTime() + shiftMs,
        ).toISOString()
      : achievement.eventStart,
    eventEnd: achievement.eventEnd
      ? new Date(
          new Date(achievement.eventEnd).getTime() + shiftMs,
        ).toISOString()
      : achievement.eventEnd,
    createdAt: new Date(
      new Date(achievement.createdAt).getTime() + shiftMs,
    ).toISOString(),
    updatedAt: new Date(
      new Date(achievement.updatedAt).getTime() + shiftMs,
    ).toISOString(),
    impactUpdatedAt: achievement.impactUpdatedAt
      ? new Date(
          new Date(achievement.impactUpdatedAt).getTime() + shiftMs,
        ).toISOString()
      : achievement.impactUpdatedAt,
  }));
}

/**
 * Shifts document dates forward by the specified amount
 *
 * @param documents - Array of documents to shift
 * @param shiftMs - Milliseconds to shift dates forward
 * @returns Array of documents with dates shifted
 */
function shiftDocumentDates(
  documents: ExportDocument[],
  shiftMs: number,
): ExportDocument[] {
  if (shiftMs <= 0) {
    return documents;
  }

  return documents.map((doc) => ({
    ...doc,
    createdAt: new Date(
      new Date(doc.createdAt).getTime() + shiftMs,
    ).toISOString(),
    updatedAt: new Date(
      new Date(doc.updatedAt).getTime() + shiftMs,
    ).toISOString(),
  }));
}

/**
 * Shifts performance review dates forward by the specified amount
 *
 * @param reviews - Array of performance reviews to shift
 * @param shiftMs - Milliseconds to shift dates forward
 * @returns Array of performance reviews with dates shifted
 */
function shiftPerformanceReviewDates(
  reviews: ExportPerformanceReview[],
  shiftMs: number,
): ExportPerformanceReview[] {
  if (shiftMs <= 0) {
    return reviews;
  }

  return reviews.map((review) => ({
    ...review,
    startDate: new Date(
      new Date(review.startDate).getTime() + shiftMs,
    ).toISOString(),
    endDate: new Date(
      new Date(review.endDate).getTime() + shiftMs,
    ).toISOString(),
    createdAt: new Date(
      new Date(review.createdAt).getTime() + shiftMs,
    ).toISOString(),
    updatedAt: new Date(
      new Date(review.updatedAt).getTime() + shiftMs,
    ).toISOString(),
  }));
}

/**
 * Calculates the date shift needed based on the newest achievement date
 *
 * @param achievements - Array of achievements to analyze
 * @returns Milliseconds to shift dates forward (0 if no shift needed)
 */
function calculateDateShift(achievements: ExportAchievement[]): number {
  if (achievements.length === 0) {
    return 0;
  }

  // Find the newest achievement by eventStart date
  let newestDate: Date | null = null;
  for (const achievement of achievements) {
    if (achievement.eventStart) {
      const date = new Date(achievement.eventStart);
      if (!newestDate || date > newestDate) {
        newestDate = date;
      }
    }
  }

  // If no achievements have eventStart dates, no shift needed
  if (!newestDate) {
    return 0;
  }

  // Calculate how many days have passed since the newest achievement
  const now = new Date();
  const daysPassedMs = now.getTime() - newestDate.getTime();
  const daysPassed = Math.floor(daysPassedMs / (24 * 60 * 60 * 1000));

  // If less than 1 day has passed, no shift needed
  if (daysPassed <= 0) {
    return 0;
  }

  return daysPassed * 24 * 60 * 60 * 1000;
}

/**
 * Imports demo data from the bundled demo-data.json file into a demo user account
 *
 * @param userId - The UUID of the demo user account to populate
 * @returns Statistics about created items
 * @throws Error if demo data file is invalid or missing
 */
export async function importDemoData(userId: string): Promise<ImportStats> {
  // Read demo data file from lib/ai directory (bundled with app)
  const demoDataPath = path.join(process.cwd(), 'lib', 'ai', 'demo-data.json');

  // Check if file exists
  if (!fs.existsSync(demoDataPath)) {
    throw new Error(
      `Demo data file not found at ${demoDataPath}. Please ensure demo-data.json exists in apps/web/lib/ai/`,
    );
  }

  // Read and parse demo data
  const demoDataRaw = fs.readFileSync(demoDataPath, 'utf-8');
  const demoData = JSON.parse(demoDataRaw);

  // Validate against schema
  const result = exportDataSchema.safeParse(demoData);
  if (!result.success) {
    throw new Error(
      `Invalid demo data format: ${JSON.stringify(result.error.errors)}`,
    );
  }

  // Calculate date shift based on achievement dates
  const shiftMs = calculateDateShift(result.data.achievements);

  // Shift all date-based data forward to keep demo data fresh
  result.data.achievements = shiftAchievementDatesToPresent(
    result.data.achievements,
  );
  result.data.documents = shiftDocumentDates(result.data.documents, shiftMs);
  if (result.data.performanceReviews) {
    result.data.performanceReviews = shiftPerformanceReviewDates(
      result.data.performanceReviews,
      shiftMs,
    );
  }

  // Use shared import function with new ID generation
  // Achievement dates are pre-configured by prepare-demo-data script with per-project spread/shift
  // Generate new IDs to avoid collisions with previous demo accounts
  return importUserData({
    userId,
    data: result.data,
    checkDuplicates: false, // New account, no need to check
    generateNewIds: true, // Generate new UUIDs to avoid ID collisions
  });
}
