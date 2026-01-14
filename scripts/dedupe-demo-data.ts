#!/usr/bin/env npx tsx
/**
 * Deduplicate achievements in demo-data.json
 *
 * Keeps only one achievement per unique title+projectId combination.
 * Preserves the achievement with the earliest eventStart date.
 *
 * Run with: npx tsx scripts/dedupe-demo-data.ts
 * Add --dry-run to preview changes without writing
 */

import fs from 'node:fs';
import path from 'node:path';

interface Achievement {
  id: string;
  title: string;
  summary: string;
  projectId: string;
  eventStart: string;
  [key: string]: unknown;
}

interface DemoData {
  version: string;
  exportedAt: string;
  userId: string;
  companies: unknown[];
  projects: Array<{ id: string; name: string }>;
  achievements: Achievement[];
  [key: string]: unknown;
}

const dryRun = process.argv.includes('--dry-run');
const demoDataPath = path.join(process.cwd(), 'apps/web/lib/ai/demo-data.json');

console.log('Reading demo-data.json...');
const raw = fs.readFileSync(demoDataPath, 'utf-8');
const data: DemoData = JSON.parse(raw);

const originalCount = data.achievements.length;
console.log(`Original achievement count: ${originalCount}`);

// Create project lookup for logging
const projectNames = new Map(data.projects.map((p) => [p.id, p.name]));

// Group achievements by title + projectId
const groups = new Map<string, Achievement[]>();
for (const achievement of data.achievements) {
  const key = `${achievement.title}|||${achievement.projectId}`;
  const existing = groups.get(key) || [];
  existing.push(achievement);
  groups.set(key, existing);
}

// For each group, keep only the achievement with the earliest eventStart
const deduped: Achievement[] = [];
let removedCount = 0;

for (const [key, achievements] of groups.entries()) {
  // Sort by eventStart date (earliest first)
  achievements.sort((a, b) => {
    const dateA = a.eventStart ? new Date(a.eventStart).getTime() : 0;
    const dateB = b.eventStart ? new Date(b.eventStart).getTime() : 0;
    return dateA - dateB;
  });

  // Keep the first (earliest) one
  const kept = achievements[0];
  deduped.push(kept);

  // Log removed duplicates
  if (achievements.length > 1) {
    const removed = achievements.slice(1);
    removedCount += removed.length;

    if (dryRun) {
      const projectName = projectNames.get(kept.projectId) || 'Unknown';
      console.log(
        `\n[${achievements.length}x] "${kept.title.substring(0, 50)}${kept.title.length > 50 ? '...' : ''}"`,
      );
      console.log(`  Project: ${projectName}`);
      console.log(
        `  Keeping: ${kept.id.substring(0, 8)}... (${kept.eventStart?.split('T')[0] || 'N/A'})`,
      );
      for (const r of removed) {
        console.log(
          `  Removing: ${r.id.substring(0, 8)}... (${r.eventStart?.split('T')[0] || 'N/A'})`,
        );
      }
    }
  }
}

// Sort deduped achievements by eventStart for consistency
deduped.sort((a, b) => {
  const dateA = a.eventStart ? new Date(a.eventStart).getTime() : 0;
  const dateB = b.eventStart ? new Date(b.eventStart).getTime() : 0;
  return dateA - dateB;
});

console.log(`\n=== Summary ===`);
console.log(`Original achievements: ${originalCount}`);
console.log(`After deduplication: ${deduped.length}`);
console.log(`Removed: ${removedCount}`);
console.log(`Reduction: ${((removedCount / originalCount) * 100).toFixed(1)}%`);

if (dryRun) {
  console.log(
    `\n[DRY RUN] No changes written. Run without --dry-run to apply.`,
  );
} else {
  // Update the data
  data.achievements = deduped;
  data.exportedAt = new Date().toISOString();

  // Write back
  const output = JSON.stringify(data, null, 2);
  fs.writeFileSync(demoDataPath, output, 'utf-8');

  const newSize = fs.statSync(demoDataPath).size;
  console.log(`\nWritten to ${demoDataPath}`);
  console.log(`New file size: ${(newSize / 1024 / 1024).toFixed(2)} MB`);
}
