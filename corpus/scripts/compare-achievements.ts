#!/usr/bin/env npx ts-node
/**
 * Compare Achievements Utility
 *
 * Performs semantic comparison of achievement arrays between two snapshots.
 * Uses text similarity matching (not exact match) to determine if achievements
 * are equivalent across different extraction runs.
 *
 * Usage:
 *   npx ts-node corpus/scripts/compare-achievements.ts baseline.json current.json
 *   npx ts-node corpus/scripts/compare-achievements.ts --threshold 0.8 baseline.json current.json
 *
 * Output:
 *   JSON with comparison results, including pass/warn/fail verdict
 */

import * as fs from 'fs';
import * as path from 'path';

// Types
interface Achievement {
  title: string;
  summary?: string;
  impact?: number;
  eventStart?: string;
  eventEnd?: string;
  eventDuration?: string;
  source?: string;
  sourceIds?: string[];
}

interface Snapshot {
  version: string;
  extractedAt: string;
  repo: {
    url: string;
    slug: string;
    category: string;
  };
  author: {
    name: string;
    email: string;
    commitCount: number;
  };
  pinnedCommit: string;
  extraction: {
    achievementCount: number;
    achievements: Achievement[];
    status?: string;
  };
}

interface MatchedAchievement {
  baseline: Achievement;
  current: Achievement;
  similarity: number;
  titleSimilarity: number;
  summarySimilarity: number;
  impactDiff: number;
}

interface UnmatchedAchievement {
  achievement: Achievement;
  source: 'baseline' | 'current';
  reason: string;
}

interface ComparisonResult {
  verdict: 'pass' | 'warn' | 'fail';
  score: number;
  summary: string;
  metrics: {
    totalBaseline: number;
    totalCurrent: number;
    matched: number;
    addedInCurrent: number;
    missingFromCurrent: number;
    avgSimilarity: number;
    avgImpactDiff: number;
  };
  matched: MatchedAchievement[];
  added: UnmatchedAchievement[];
  missing: UnmatchedAchievement[];
  recommendations: string[];
}

// Text similarity using Jaccard index on word tokens
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}

function jaccardSimilarity(text1: string, text2: string): number {
  const tokens1 = tokenize(text1);
  const tokens2 = tokenize(text2);

  if (tokens1.size === 0 && tokens2.size === 0) return 1;
  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);

  return intersection.size / union.size;
}

// Compute similarity between two achievements
function computeSimilarity(a1: Achievement, a2: Achievement): number {
  const titleSim = jaccardSimilarity(a1.title, a2.title);
  const summarySim = jaccardSimilarity(a1.summary || '', a2.summary || '');

  // Weight title more heavily than summary
  return titleSim * 0.7 + summarySim * 0.3;
}

// Find best matching achievement from candidates
function findBestMatch(
  achievement: Achievement,
  candidates: Achievement[],
  threshold: number,
): { match: Achievement | null; similarity: number; index: number } {
  let bestMatch: Achievement | null = null;
  let bestSimilarity = 0;
  let bestIndex = -1;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    if (!candidate) continue;
    const similarity = computeSimilarity(achievement, candidate);
    if (similarity > bestSimilarity && similarity >= threshold) {
      bestMatch = candidate;
      bestSimilarity = similarity;
      bestIndex = i;
    }
  }

  return { match: bestMatch, similarity: bestSimilarity, index: bestIndex };
}

// Compare two snapshots
function compareSnapshots(
  baseline: Snapshot,
  current: Snapshot,
  threshold: number = 0.6,
): ComparisonResult {
  const baselineAchievements = baseline.extraction.achievements || [];
  const currentAchievements = current.extraction.achievements || [];

  const matched: MatchedAchievement[] = [];
  const missing: UnmatchedAchievement[] = [];
  const added: UnmatchedAchievement[] = [];

  // Track which current achievements have been matched
  const matchedCurrentIndices = new Set<number>();

  // For each baseline achievement, find best match in current
  for (const baseAchievement of baselineAchievements) {
    // Only consider unmatched current achievements
    const unmatched = currentAchievements.filter(
      (_, i) => !matchedCurrentIndices.has(i),
    );
    const { match, similarity, index } = findBestMatch(
      baseAchievement,
      unmatched,
      threshold,
    );

    if (match) {
      // Find actual index in full array
      const actualIndex = currentAchievements.indexOf(match);
      matchedCurrentIndices.add(actualIndex);

      matched.push({
        baseline: baseAchievement,
        current: match,
        similarity,
        titleSimilarity: jaccardSimilarity(baseAchievement.title, match.title),
        summarySimilarity: jaccardSimilarity(
          baseAchievement.summary || '',
          match.summary || '',
        ),
        impactDiff: Math.abs(
          (baseAchievement.impact || 5) - (match.impact || 5),
        ),
      });
    } else {
      missing.push({
        achievement: baseAchievement,
        source: 'baseline',
        reason: 'No matching achievement found in current extraction',
      });
    }
  }

  // Find achievements in current that weren't matched
  for (let i = 0; i < currentAchievements.length; i++) {
    if (!matchedCurrentIndices.has(i)) {
      const achievement = currentAchievements[i];
      if (achievement) {
        added.push({
          achievement,
          source: 'current',
          reason: 'New achievement not present in baseline',
        });
      }
    }
  }

  // Calculate metrics
  const avgSimilarity =
    matched.length > 0
      ? matched.reduce((sum, m) => sum + m.similarity, 0) / matched.length
      : 0;
  const avgImpactDiff =
    matched.length > 0
      ? matched.reduce((sum, m) => sum + m.impactDiff, 0) / matched.length
      : 0;

  // Calculate score (0-100)
  let score = 100;

  // Penalize for missing achievements (major issue)
  score -= missing.length * 15;

  // Penalize for added achievements (minor issue, could indicate better extraction)
  score -= added.length * 5;

  // Penalize for low similarity matches
  const lowSimilarityMatches = matched.filter((m) => m.similarity < 0.8).length;
  score -= lowSimilarityMatches * 5;

  // Penalize for high impact differences
  const highImpactDiffMatches = matched.filter((m) => m.impactDiff > 2).length;
  score -= highImpactDiffMatches * 3;

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Determine verdict
  let verdict: 'pass' | 'warn' | 'fail';
  if (score >= 80 && missing.length === 0) {
    verdict = 'pass';
  } else if (score >= 60 || (missing.length <= 2 && score >= 50)) {
    verdict = 'warn';
  } else {
    verdict = 'fail';
  }

  // Generate recommendations
  const recommendations: string[] = [];

  if (missing.length > 0) {
    recommendations.push(
      `${missing.length} achievement(s) from baseline are missing - review extraction logic`,
    );
  }
  if (added.length > 3) {
    recommendations.push(
      `${added.length} new achievements detected - verify they are valid extractions`,
    );
  }
  if (lowSimilarityMatches > 2) {
    recommendations.push(
      `${lowSimilarityMatches} matches have low similarity - achievement quality may have changed`,
    );
  }
  if (highImpactDiffMatches > 0) {
    recommendations.push(
      `${highImpactDiffMatches} matches have significant impact score differences`,
    );
  }

  // Generate summary
  const summary = `Compared ${baselineAchievements.length} baseline vs ${currentAchievements.length} current achievements: ${matched.length} matched, ${missing.length} missing, ${added.length} new`;

  return {
    verdict,
    score,
    summary,
    metrics: {
      totalBaseline: baselineAchievements.length,
      totalCurrent: currentAchievements.length,
      matched: matched.length,
      addedInCurrent: added.length,
      missingFromCurrent: missing.length,
      avgSimilarity,
      avgImpactDiff,
    },
    matched,
    added,
    missing,
    recommendations,
  };
}

// Load snapshot from file
function loadSnapshot(filePath: string): Snapshot {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');
  try {
    return JSON.parse(content) as Snapshot;
  } catch (e) {
    throw new Error(`Failed to parse JSON from ${absolutePath}: ${e}`);
  }
}

// CLI argument parsing
function parseArgs(): {
  baselinePath: string;
  currentPath: string;
  threshold: number;
  outputFormat: 'json' | 'summary';
} {
  const args = process.argv.slice(2);
  let threshold = 0.6;
  let outputFormat: 'json' | 'summary' = 'json';
  const positionalArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--threshold' || arg === '-t') {
      const nextArg = args[++i];
      threshold = parseFloat(nextArg || '0');
      if (isNaN(threshold) || threshold < 0 || threshold > 1) {
        console.error('Threshold must be a number between 0 and 1');
        process.exit(1);
      }
    } else if (arg === '--summary' || arg === '-s') {
      outputFormat = 'summary';
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: compare-achievements.ts [OPTIONS] <baseline.json> <current.json>

Compare achievement extraction results between two snapshots.

Arguments:
  baseline.json   Path to baseline snapshot file
  current.json    Path to current snapshot file

Options:
  -t, --threshold N   Similarity threshold for matching (0-1, default: 0.6)
  -s, --summary       Output human-readable summary instead of JSON
  -h, --help          Show this help message

Examples:
  npx ts-node compare-achievements.ts baseline.json current.json
  npx ts-node compare-achievements.ts --threshold 0.8 baseline.json current.json
  npx ts-node compare-achievements.ts --summary baseline.json current.json
`);
      process.exit(0);
    } else if (arg && !arg.startsWith('-')) {
      positionalArgs.push(arg);
    } else if (arg) {
      console.error(`Unknown option: ${arg}`);
      process.exit(1);
    }
  }

  if (positionalArgs.length !== 2) {
    console.error('Error: Two snapshot files required (baseline and current)');
    console.error(
      'Usage: compare-achievements.ts <baseline.json> <current.json>',
    );
    process.exit(1);
  }

  const baselinePath = positionalArgs[0];
  const currentPath = positionalArgs[1];

  if (!baselinePath || !currentPath) {
    console.error('Error: Both baseline and current paths are required');
    process.exit(1);
  }

  return {
    baselinePath,
    currentPath,
    threshold,
    outputFormat,
  };
}

// Format result as human-readable summary
function formatSummary(result: ComparisonResult): string {
  const lines: string[] = [];

  // Header with verdict
  const verdictEmoji =
    result.verdict === 'pass' ? '✅' : result.verdict === 'warn' ? '⚠️' : '❌';
  lines.push(
    `${verdictEmoji} Comparison Result: ${result.verdict.toUpperCase()}`,
  );
  lines.push(`   Score: ${result.score}/100`);
  lines.push('');
  lines.push(result.summary);
  lines.push('');

  // Metrics table
  lines.push('Metrics:');
  lines.push(`  Baseline achievements: ${result.metrics.totalBaseline}`);
  lines.push(`  Current achievements:  ${result.metrics.totalCurrent}`);
  lines.push(`  Matched:               ${result.metrics.matched}`);
  lines.push(`  Missing from current:  ${result.metrics.missingFromCurrent}`);
  lines.push(`  Added in current:      ${result.metrics.addedInCurrent}`);
  lines.push(
    `  Avg similarity:        ${(result.metrics.avgSimilarity * 100).toFixed(1)}%`,
  );
  lines.push(
    `  Avg impact diff:       ${result.metrics.avgImpactDiff.toFixed(2)}`,
  );
  lines.push('');

  // Missing achievements
  if (result.missing.length > 0) {
    lines.push('Missing from current:');
    for (const m of result.missing.slice(0, 5)) {
      lines.push(`  - ${m.achievement.title}`);
    }
    if (result.missing.length > 5) {
      lines.push(`  ... and ${result.missing.length - 5} more`);
    }
    lines.push('');
  }

  // Added achievements
  if (result.added.length > 0) {
    lines.push('New in current:');
    for (const a of result.added.slice(0, 5)) {
      lines.push(`  + ${a.achievement.title}`);
    }
    if (result.added.length > 5) {
      lines.push(`  ... and ${result.added.length - 5} more`);
    }
    lines.push('');
  }

  // Low similarity matches
  const lowSimilarity = result.matched.filter((m) => m.similarity < 0.8);
  if (lowSimilarity.length > 0) {
    lines.push('Low similarity matches:');
    for (const m of lowSimilarity.slice(0, 3)) {
      lines.push(`  ~ "${m.baseline.title.substring(0, 50)}..."`);
      lines.push(`    → "${m.current.title.substring(0, 50)}..."`);
      lines.push(`    (${(m.similarity * 100).toFixed(1)}% similar)`);
    }
    if (lowSimilarity.length > 3) {
      lines.push(`  ... and ${lowSimilarity.length - 3} more`);
    }
    lines.push('');
  }

  // Recommendations
  if (result.recommendations.length > 0) {
    lines.push('Recommendations:');
    for (const rec of result.recommendations) {
      lines.push(`  • ${rec}`);
    }
  }

  return lines.join('\n');
}

// Main
function main() {
  const { baselinePath, currentPath, threshold, outputFormat } = parseArgs();

  try {
    const baseline = loadSnapshot(baselinePath);
    const current = loadSnapshot(currentPath);

    // Verify snapshots are for the same repo
    if (baseline.repo.slug !== current.repo.slug) {
      console.error(
        `Warning: Comparing snapshots from different repos: ${baseline.repo.slug} vs ${current.repo.slug}`,
      );
    }

    const result = compareSnapshots(baseline, current, threshold);

    if (outputFormat === 'summary') {
      console.log(formatSummary(result));
    } else {
      console.log(JSON.stringify(result, null, 2));
    }

    // Exit with appropriate code
    process.exit(result.verdict === 'fail' ? 1 : 0);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
