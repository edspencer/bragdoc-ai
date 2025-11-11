/**
 * Debug script to analyze achievement embedding distances
 *
 * Usage: npx tsx apps/web/scripts/debug-embeddings.ts <userId>
 */

import { db, achievement } from '@bragdoc/database';
import { isNotNull } from 'drizzle-orm';

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const aVal = a[i] ?? 0;
    const bVal = b[i] ?? 0;
    dotProduct += aVal * bVal;
    normA += aVal * aVal;
    normB += bVal * bVal;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function cosineDistance(a: number[], b: number[]): number {
  return 1 - cosineSimilarity(a, b);
}

async function analyzeEmbeddings(userId: string) {
  console.log(`\n[Debug] Analyzing embeddings for user: ${userId}\n`);

  // Fetch all achievements with embeddings
  const achievements = await db
    .select({
      id: achievement.id,
      title: achievement.title,
      embedding: achievement.embedding,
    })
    .from(achievement)
    .where(isNotNull(achievement.embedding));

  console.log(`Found ${achievements.length} achievements with embeddings\n`);

  if (achievements.length === 0) {
    console.log('No achievements with embeddings found!');
    return;
  }

  // Calculate all pairwise distances
  const distances: { a: string; b: string; distance: number }[] = [];

  for (let i = 0; i < achievements.length; i++) {
    const achI = achievements[i];
    if (!achI) continue;

    for (let j = i + 1; j < achievements.length; j++) {
      const achJ = achievements[j];
      if (!achJ) continue;

      const embA = achI.embedding as number[];
      const embB = achJ.embedding as number[];

      if (!embA || !embB) continue;

      const dist = cosineDistance(embA, embB);
      distances.push({
        a: achI.title,
        b: achJ.title,
        distance: dist,
      });
    }
  }

  // Sort by distance (closest first)
  distances.sort((a, b) => a.distance - b.distance);

  console.log('=== TOP 20 CLOSEST PAIRS ===\n');
  distances.slice(0, 20).forEach((d, idx) => {
    console.log(`${idx + 1}. Distance: ${d.distance.toFixed(4)}`);
    console.log(`   A: ${d.a}`);
    console.log(`   B: ${d.b}\n`);
  });

  console.log('\n=== STATISTICS ===\n');
  const dists = distances.map((d) => d.distance);
  const min = Math.min(...dists);
  const max = Math.max(...dists);
  const mean = dists.reduce((a, b) => a + b, 0) / dists.length;
  const sorted = [...dists].sort((a, b) => a - b);
  const p10 = sorted[Math.floor(sorted.length * 0.1)] ?? 0;
  const p25 = sorted[Math.floor(sorted.length * 0.25)] ?? 0;
  const p50 = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
  const p75 = sorted[Math.floor(sorted.length * 0.75)] ?? 0;
  const p90 = sorted[Math.floor(sorted.length * 0.9)] ?? 0;

  console.log(`Total pairs: ${distances.length}`);
  console.log(`Min distance: ${min.toFixed(4)}`);
  console.log(`Max distance: ${max.toFixed(4)}`);
  console.log(`Mean distance: ${mean.toFixed(4)}`);
  console.log(`10th percentile: ${p10.toFixed(4)}`);
  console.log(`25th percentile: ${p25.toFixed(4)}`);
  console.log(`Median: ${p50.toFixed(4)}`);
  console.log(`75th percentile: ${p75.toFixed(4)}`);
  console.log(`90th percentile: ${p90.toFixed(4)}`);

  // Find authentication-related achievements
  console.log('\n=== AUTHENTICATION-RELATED ACHIEVEMENTS ===\n');
  const authAchievements = achievements.filter(
    (a) =>
      a.title.toLowerCase().includes('auth') ||
      a.title.toLowerCase().includes('login') ||
      a.title.toLowerCase().includes('google') ||
      a.title.toLowerCase().includes('github'),
  );

  console.log(
    `Found ${authAchievements.length} authentication-related achievements:\n`,
  );
  authAchievements.forEach((a, idx) => {
    console.log(`${idx + 1}. ${a.title}`);
  });

  if (authAchievements.length >= 2) {
    console.log('\n=== DISTANCES BETWEEN AUTH ACHIEVEMENTS ===\n');
    for (let i = 0; i < authAchievements.length; i++) {
      const achI = authAchievements[i];
      if (!achI) continue;

      for (let j = i + 1; j < authAchievements.length; j++) {
        const achJ = authAchievements[j];
        if (!achJ) continue;

        const embA = achI.embedding as number[];
        const embB = achJ.embedding as number[];

        if (!embA || !embB) continue;

        const dist = cosineDistance(embA, embB);
        console.log(`Distance: ${dist.toFixed(4)}`);
        console.log(`  A: ${achI.title}`);
        console.log(`  B: ${achJ.title}\n`);
      }
    }
  }

  // Count how many pairs are within various epsilon values
  console.log('\n=== PAIRS WITHIN EPSILON VALUES ===\n');
  const epsilons = [0.3, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7];
  epsilons.forEach((eps) => {
    const count = dists.filter((d) => d <= eps).length;
    const percentage = ((count / dists.length) * 100).toFixed(1);
    console.log(`ε=${eps}: ${count} pairs (${percentage}%)`);
  });

  // Calculate k-distances (distance to k-th nearest neighbor)
  console.log('\n=== K-DISTANCE ANALYSIS (k=3) ===\n');
  const k = 3;
  const kDistances: number[] = [];

  for (const ach of achievements) {
    const embA = ach.embedding as number[];
    if (!embA) continue;

    // Calculate distances to all other points
    const distances: number[] = [];
    for (const other of achievements) {
      if (ach.id === other.id) continue;
      const embB = other.embedding as number[];
      if (!embB) continue;

      distances.push(cosineDistance(embA, embB));
    }

    // Sort and get k-th nearest neighbor distance
    distances.sort((a, b) => a - b);
    const kthDistance = distances[k - 1];
    if (distances.length >= k && kthDistance !== undefined) {
      kDistances.push(kthDistance);
    }
  }

  // Sort k-distances
  kDistances.sort((a, b) => a - b);

  console.log(`Total k-distances: ${kDistances.length}`);
  console.log(`Min k-distance: ${Math.min(...kDistances).toFixed(4)}`);
  console.log(`Max k-distance: ${Math.max(...kDistances).toFixed(4)}`);

  const kMean = kDistances.reduce((a, b) => a + b, 0) / kDistances.length;
  const k10 = kDistances[Math.floor(kDistances.length * 0.1)] ?? 0;
  const k25 = kDistances[Math.floor(kDistances.length * 0.25)] ?? 0;
  const k50 = kDistances[Math.floor(kDistances.length * 0.5)] ?? 0;
  const k75 = kDistances[Math.floor(kDistances.length * 0.75)] ?? 0;
  const k90 = kDistances[Math.floor(kDistances.length * 0.9)] ?? 0;

  console.log(`Mean k-distance: ${kMean.toFixed(4)}`);
  console.log(`10th percentile k-distance: ${k10.toFixed(4)}`);
  console.log(`25th percentile k-distance: ${k25.toFixed(4)}`);
  console.log(`50th percentile k-distance: ${k50.toFixed(4)}`);
  console.log(`75th percentile k-distance: ${k75.toFixed(4)}`);
  console.log(`90th percentile k-distance: ${k90.toFixed(4)}`);

  console.log('\n=== HOW MANY POINTS HAVE K-DISTANCE <= EPSILON ===\n');
  epsilons.forEach((eps) => {
    const count = kDistances.filter((d) => d <= eps).length;
    const percentage = ((count / kDistances.length) * 100).toFixed(1);
    console.log(
      `ε=${eps}: ${count} points (${percentage}%) have their 3rd nearest neighbor within epsilon`,
    );
  });
}

// Get userId from command line
const userId = process.argv[2];

if (!userId) {
  console.error('Usage: npx tsx apps/web/scripts/debug-embeddings.ts <userId>');
  process.exit(1);
}

analyzeEmbeddings(userId)
  .then(() => {
    console.log('\n[Debug] Analysis complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error analyzing embeddings:', error);
    process.exit(1);
  });
