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
 * Transforms achievement dates to spread evenly across the last 270 days (9 months)
 *
 * This keeps demo data fresh by distributing achievements evenly from 270 days ago
 * to the present, regardless of their original dates. All date-related fields are
 * transformed while preserving all other properties.
 *
 * @param achievements - Array of achievements from demo data with original dates
 * @returns Array of achievements with transformed dates spanning 270 days
 */
function transformAchievementDates(
  achievements: ExportAchievement[],
): ExportAchievement[] {
  // Sort achievements by original createdAt date (ascending - earliest first)
  const sorted = [...achievements].sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  // Calculate date range: 270 days from present back to 270 days ago
  const now = new Date();
  const startDate = new Date(now.getTime() - 270 * 24 * 60 * 60 * 1000); // 270 days ago
  const totalDays = 270;

  // Calculate even spacing between achievements
  // For 292 achievements over 270 days: spacing ≈ 0.924 days per achievement
  const spacing = totalDays / sorted.length; // Days between each achievement
  const spacingMs = spacing * 24 * 60 * 60 * 1000; // Convert to milliseconds

  // Transform each achievement's dates
  return sorted.map((achievement, index) => {
    // Calculate new date for this achievement
    // Achievement 0: 270 days ago (startDate)
    // Achievement N: progressively closer to present
    // Achievement last: very recent (≈0 days ago)
    const newDate = new Date(startDate.getTime() + index * spacingMs);
    const newDateString = newDate.toISOString();

    // Transform all date fields to the new calculated date
    return {
      ...achievement,
      createdAt: newDateString,
      eventStart: achievement.eventStart ? newDateString : null,
      eventEnd: achievement.eventEnd ? newDateString : null,
      updatedAt: newDateString,
      impactUpdatedAt: achievement.impactUpdatedAt ? newDateString : null,
    };
  });
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

  // Transform achievement dates to spread evenly over 270 days
  // This keeps demo data fresh without manual updates
  result.data.achievements = transformAchievementDates(
    result.data.achievements,
  );

  // Use shared import function with new ID generation
  // Generate new IDs to avoid collisions with previous demo accounts
  return importUserData({
    userId,
    data: result.data,
    checkDuplicates: false, // New account, no need to check
    generateNewIds: true, // Generate new UUIDs to avoid ID collisions
  });
}
