#!/usr/bin/env npx tsx
/**
 * Analyze demo-data.json for duplicate achievements
 *
 * Run with: npx tsx scripts/analyze-demo-duplicates.ts
 */

import fs from 'node:fs';
import path from 'node:path';

interface Achievement {
  id: string;
  title: string;
  summary: string;
  projectId: string;
  eventStart: string;
  source: string;
  uniqueSourceId?: string;
}

interface DemoData {
  version: string;
  exportedAt: string;
  userId: string;
  companies: unknown[];
  projects: Array<{ id: string; name: string }>;
  achievements: Achievement[];
}

const demoDataPath = path.join(process.cwd(), 'apps/web/lib/ai/demo-data.json');

console.log('Reading demo-data.json...');
const raw = fs.readFileSync(demoDataPath, 'utf-8');
const data: DemoData = JSON.parse(raw);

console.log(`\n=== Demo Data Summary ===`);
console.log(`Companies: ${data.companies.length}`);
console.log(`Projects: ${data.projects.length}`);
console.log(`Achievements: ${data.achievements.length}`);

// Create project lookup
const projectNames = new Map(data.projects.map((p) => [p.id, p.name]));

// Group achievements by title
const byTitle = new Map<string, Achievement[]>();
for (const a of data.achievements) {
  const existing = byTitle.get(a.title) || [];
  existing.push(a);
  byTitle.set(a.title, existing);
}

// Find duplicates (same title appears more than once)
const duplicates = Array.from(byTitle.entries())
  .filter(([_, achievements]) => achievements.length > 1)
  .sort((a, b) => b[1].length - a[1].length);

console.log(`\n=== Duplicate Analysis (by title) ===`);
console.log(`Unique titles: ${byTitle.size}`);
console.log(`Titles with duplicates: ${duplicates.length}`);

if (duplicates.length > 0) {
  const totalDuplicateAchievements = duplicates.reduce(
    (sum, [_, achs]) => sum + achs.length,
    0,
  );
  const duplicateEntries = duplicates.reduce(
    (sum, [_, achs]) => sum + achs.length - 1,
    0,
  );
  console.log(
    `Achievements in duplicate groups: ${totalDuplicateAchievements}`,
  );
  console.log(`Excess entries (could be removed): ${duplicateEntries}`);

  console.log(`\n=== Top 20 Most Duplicated Titles ===`);
  for (const [title, achievements] of duplicates.slice(0, 20)) {
    console.log(
      `\n[${achievements.length}x] "${title.substring(0, 60)}${title.length > 60 ? '...' : ''}"`,
    );

    // Show details for each duplicate
    for (const a of achievements) {
      const projectName = projectNames.get(a.projectId) || 'Unknown';
      console.log(
        `  - ID: ${a.id.substring(0, 8)}... | Project: ${projectName} | Date: ${a.eventStart?.split('T')[0] || 'N/A'}`,
      );
    }
  }
}

// Group by title + projectId to find true duplicates vs same work across projects
const byTitleAndProject = new Map<string, Achievement[]>();
for (const a of data.achievements) {
  const key = `${a.title}|||${a.projectId}`;
  const existing = byTitleAndProject.get(key) || [];
  existing.push(a);
  byTitleAndProject.set(key, existing);
}

const trueDuplicates = Array.from(byTitleAndProject.entries())
  .filter(([_, achievements]) => achievements.length > 1)
  .sort((a, b) => b[1].length - a[1].length);

console.log(`\n=== True Duplicates (same title + project) ===`);
console.log(`Unique title+project combinations: ${byTitleAndProject.size}`);
console.log(`Combinations with duplicates: ${trueDuplicates.length}`);

if (trueDuplicates.length > 0) {
  const excessTrueDuplicates = trueDuplicates.reduce(
    (sum, [_, achs]) => sum + achs.length - 1,
    0,
  );
  console.log(`Excess entries (definite duplicates): ${excessTrueDuplicates}`);
}

// Check for uniqueSourceId duplicates
const byUniqueSourceId = new Map<string, Achievement[]>();
for (const a of data.achievements) {
  if (a.uniqueSourceId) {
    const existing = byUniqueSourceId.get(a.uniqueSourceId) || [];
    existing.push(a);
    byUniqueSourceId.set(a.uniqueSourceId, existing);
  }
}

const sourceIdDuplicates = Array.from(byUniqueSourceId.entries()).filter(
  ([_, achievements]) => achievements.length > 1,
);

console.log(`\n=== uniqueSourceId Analysis ===`);
console.log(
  `Achievements with uniqueSourceId: ${Array.from(byUniqueSourceId.values()).flat().length}`,
);
console.log(`Unique source IDs: ${byUniqueSourceId.size}`);
console.log(`Source IDs with duplicates: ${sourceIdDuplicates.length}`);

// Summary recommendation
console.log(`\n=== Recommendation ===`);
const uniqueCount = byTitleAndProject.size;
const currentCount = data.achievements.length;
const savings = currentCount - uniqueCount;
const savingsPercent = ((savings / currentCount) * 100).toFixed(1);
console.log(`Current achievement count: ${currentCount}`);
console.log(`After deduplication: ${uniqueCount}`);
console.log(
  `Potential reduction: ${savings} achievements (${savingsPercent}%)`,
);
