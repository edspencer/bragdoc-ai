#!/usr/bin/env node

/**
 * Augment Demo Data Script
 *
 * This script augments the existing demo-data.json with:
 * - Performance reviews (currently missing)
 * - Documents (currently missing)
 * - Varied achievement sources (add 'manual' and 'commit' variety)
 *
 * Usage: npx tsx scripts/augment-demo-data.ts
 */

import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';

const DEMO_DATA_PATH = 'apps/web/lib/ai/demo-data.json';

interface Achievement {
  id: string;
  userId: string;
  companyId: string | null;
  projectId: string | null;
  source: 'llm' | 'manual' | 'commit';
  eventStart?: string;
  eventEnd?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

interface Company {
  id: string;
  userId: string;
  name: string;
  [key: string]: unknown;
}

interface Project {
  id: string;
  userId: string;
  name: string;
  [key: string]: unknown;
}

interface Document {
  id: string;
  userId: string;
  companyId: string | null;
  title: string;
  content: string | null;
  type: string | null;
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PerformanceReview {
  id: string;
  userId: string;
  name: string;
  startDate: string;
  endDate: string;
  instructions: string | null;
  documentId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DemoData {
  version: string;
  exportedAt: string;
  userId: string;
  companies: Company[];
  projects: Project[];
  achievements: Achievement[];
  documents: Document[];
  performanceReviews?: PerformanceReview[];
}

async function main(): Promise<void> {
  console.log('Loading demo data from:', DEMO_DATA_PATH);
  const rawData = await fs.readFile(DEMO_DATA_PATH, 'utf-8');
  const data: DemoData = JSON.parse(rawData);

  const userId = data.userId;
  const companyId = data.companies[0]?.id;

  if (!companyId) {
    throw new Error('No company found in demo data');
  }

  console.log(`Found userId: ${userId}`);
  console.log(`Found companyId: ${companyId}`);
  console.log(`Current companies: ${data.companies.length}`);
  console.log(`Current projects: ${data.projects.length}`);
  console.log(`Current achievements: ${data.achievements.length}`);
  console.log(`Current documents: ${data.documents.length}`);
  console.log(
    `Current performance reviews: ${data.performanceReviews?.length ?? 0}`,
  );

  // Calculate date ranges based on achievements for realistic review periods
  const achievementDates = data.achievements
    .filter((a) => a.eventStart)
    .map((a) => new Date(a.eventStart!))
    .sort((a, b) => a.getTime() - b.getTime());

  const oldestDate = achievementDates[0] || new Date();
  const newestDate =
    achievementDates[achievementDates.length - 1] || new Date();

  console.log(
    `Achievement date range: ${oldestDate.toISOString().slice(0, 10)} to ${newestDate.toISOString().slice(0, 10)}`,
  );

  // Create performance review documents
  const now = new Date();
  const documents: Document[] = [];
  const performanceReviews: PerformanceReview[] = [];

  // Create 3 performance review periods spanning the achievement date range
  // Review 1: Q4 (most recent quarter)
  const q4EndDate = new Date(newestDate);
  const q4StartDate = new Date(q4EndDate);
  q4StartDate.setMonth(q4StartDate.getMonth() - 3);

  // Review 2: Q3
  const q3EndDate = new Date(q4StartDate);
  q3EndDate.setDate(q3EndDate.getDate() - 1);
  const q3StartDate = new Date(q3EndDate);
  q3StartDate.setMonth(q3StartDate.getMonth() - 3);

  // Review 3: Annual (H1)
  const h1EndDate = new Date(q3StartDate);
  h1EndDate.setDate(h1EndDate.getDate() - 1);
  const h1StartDate = new Date(h1EndDate);
  h1StartDate.setMonth(h1StartDate.getMonth() - 6);

  const reviewPeriods = [
    {
      name: 'Q4 Performance Review',
      start: q4StartDate,
      end: q4EndDate,
      instructions:
        'Focus on key project deliverables and impact on team velocity. Highlight cross-functional collaboration and technical leadership moments.',
    },
    {
      name: 'Q3 Performance Review',
      start: q3StartDate,
      end: q3EndDate,
      instructions:
        'Emphasize technical achievements, code quality improvements, and mentorship activities. Include any process improvements implemented.',
    },
    {
      name: 'H1 Annual Review',
      start: h1StartDate,
      end: h1EndDate,
      instructions:
        'Comprehensive review of first half accomplishments. Include career growth, skill development, and contributions to team culture.',
    },
  ];

  for (const period of reviewPeriods) {
    const docId = randomUUID();
    const reviewId = randomUUID();
    const createdAt = new Date(period.end);
    createdAt.setDate(createdAt.getDate() + 1); // Create the day after period ends

    // Create document for the review (placeholder content - real content would be generated)
    documents.push({
      id: docId,
      userId,
      companyId,
      title: period.name,
      content: `# ${period.name}\n\n*Review Period: ${period.start.toISOString().slice(0, 10)} to ${period.end.toISOString().slice(0, 10)}*\n\n## Summary\n\nThis performance review document is a placeholder. In a real scenario, this would contain AI-generated content summarizing achievements during the review period.\n\n## Key Accomplishments\n\n- Achievement highlights would appear here\n- Technical contributions\n- Team collaboration examples\n\n## Areas for Growth\n\n- Development opportunities identified\n- Skills to expand\n\n## Goals for Next Period\n\n- Objectives for the upcoming review cycle`,
      type: 'performance_review',
      shareToken: null,
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    });

    // Create the performance review record
    performanceReviews.push({
      id: reviewId,
      userId,
      name: period.name,
      startDate: period.start.toISOString(),
      endDate: period.end.toISOString(),
      instructions: period.instructions,
      documentId: docId,
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    });
  }

  console.log(`\nCreated ${documents.length} documents`);
  console.log(`Created ${performanceReviews.length} performance reviews`);

  // Add variety to achievement sources
  // Currently all are 'llm', let's change some to 'manual' and 'commit'
  // Target: ~70% llm, ~20% commit, ~10% manual
  const totalAchievements = data.achievements.length;
  const commitCount = Math.floor(totalAchievements * 0.2);
  const manualCount = Math.floor(totalAchievements * 0.1);

  console.log(
    `\nUpdating achievement sources: ${commitCount} commit, ${manualCount} manual, rest llm`,
  );

  // Shuffle indices to randomly select which achievements to change
  const indices = Array.from({ length: totalAchievements }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j]!, indices[i]!];
  }

  // Change first commitCount to 'commit', next manualCount to 'manual'
  for (let i = 0; i < commitCount; i++) {
    const idx = indices[i]!;
    data.achievements[idx]!.source = 'commit';
  }
  for (let i = commitCount; i < commitCount + manualCount; i++) {
    const idx = indices[i]!;
    data.achievements[idx]!.source = 'manual';
  }

  // Count final distribution
  const sourceCounts = { llm: 0, commit: 0, manual: 0 };
  for (const a of data.achievements) {
    sourceCounts[a.source]++;
  }
  console.log('Final source distribution:', sourceCounts);

  // Update the data object
  data.documents = documents;
  data.performanceReviews = performanceReviews;

  // Write back to file
  console.log(`\nWriting updated demo data to: ${DEMO_DATA_PATH}`);
  const output = JSON.stringify(data, null, 2) + '\n';
  await fs.writeFile(DEMO_DATA_PATH, output, 'utf-8');

  console.log('\nDone! Summary:');
  console.log(`  Companies: ${data.companies.length}`);
  console.log(`  Projects: ${data.projects.length}`);
  console.log(`  Achievements: ${data.achievements.length}`);
  console.log(`  Documents: ${data.documents.length}`);
  console.log(`  Performance Reviews: ${data.performanceReviews.length}`);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
