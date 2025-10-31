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

  // Shift achievement dates forward to keep demo data fresh
  result.data.achievements = shiftAchievementDatesToPresent(
    result.data.achievements,
  );

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
