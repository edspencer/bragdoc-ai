/**
 * Demo Data Import Service
 *
 * Handles importing pre-populated demo data from the bundled demo-data.json file
 * into a newly created demo user account.
 */

import fs from 'fs';
import path from 'path';
import { exportDataSchema } from '@/lib/export-import-schema';
import { importUserData, type ImportStats } from '@/lib/import-user-data';

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

  // Use shared import function with new ID generation
  // Generate new IDs to avoid collisions with previous demo accounts
  return importUserData({
    userId,
    data: result.data,
    checkDuplicates: false, // New account, no need to check
    generateNewIds: true, // Generate new UUIDs to avoid ID collisions
  });
}
