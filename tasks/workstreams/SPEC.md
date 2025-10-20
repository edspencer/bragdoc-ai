# Workstreams Feature Specification

## Table of Contents

- [Overview](#overview)
- [Technical Architecture](#technical-architecture)
- [Clustering Strategy](#clustering-strategy)
- [Incremental Update Strategy](#incremental-update-strategy)
- [Implementation Components](#implementation-components)
- [API Endpoints](#api-endpoints)
- [UI/UX Flow](#uiux-flow)
- [Cost & Performance Analysis](#cost--performance-analysis)
- [Edge Cases & Considerations](#edge-cases--considerations)
- [Testing Strategy](#testing-strategy)

---

## Overview

### What are Workstreams?

A **Workstream** is an automatically-generated collection of semantically related Achievements that may span multiple Projects. Unlike Projects (which are organizational units), Workstreams represent thematic work patterns discovered through machine learning.

**Examples:**
- "API Performance Optimization" - achievements from multiple projects focused on backend performance
- "User Authentication & Security" - authentication work across frontend, backend, and mobile projects
- "Design System Implementation" - UI component work spanning multiple product areas
- "Data Pipeline Reliability" - infrastructure achievements across various services

### Key Characteristics

1. **Automatic Discovery**: Generated using embedding-based clustering algorithms
2. **Cross-Project**: Can include achievements from multiple projects or no project at all
3. **Semantic Grouping**: Based on meaning, not just keywords
4. **Evolving**: Updates as new achievements are added
5. **User-Refinable**: Users can override AI assignments

### Why Workstreams?

- **Pattern Recognition**: Discover themes in your work that aren't obvious from project structure
- **Portfolio Building**: Group related achievements for resumes, reviews, or presentations
- **Time Analysis**: Understand how time is distributed across different types of work
- **Career Insights**: Identify areas of specialization or growth opportunities

---

## Technical Architecture

### Database Schema

#### 1. Enable pgvector Extension

```sql
-- Run in Neon database
CREATE EXTENSION IF NOT EXISTS vector;
```

#### 2. Workstream Table

```typescript
// packages/database/src/schema.ts

export const workstream = pgTable('Workstream', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),

  // Core fields
  name: varchar('name', { length: 256 }).notNull(),
  description: text('description'),
  color: varchar('color', { length: 7 }).default('#3B82F6'),

  // Centroid caching for fast incremental assignment
  centroidEmbedding: vector('centroid_embedding', { dimensions: 1536 }),
  centroidUpdatedAt: timestamp('centroid_updated_at'),

  // Metadata
  achievementCount: integer('achievement_count').default(0),
  isArchived: boolean('is_archived').default(false),

  // Auditing
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Workstream = InferSelectModel<typeof workstream>;
```

#### 3. Achievement Table Updates

```typescript
// packages/database/src/schema.ts

export const achievement = pgTable('Achievement', {
  // ... existing fields ...

  // Workstream assignment
  workstreamId: uuid('workstream_id').references(() => workstream.id, {
    onDelete: 'set null'
  }),
  workstreamSource: varchar('workstream_source', {
    enum: ['ai', 'user']
  }),

  // Embedding storage
  embedding: vector('embedding', { dimensions: 1536 }),
  embeddingModel: varchar('embedding_model', { length: 64 }).default('text-embedding-3-small'),
  embeddingGeneratedAt: timestamp('embedding_generated_at'),

  // ... rest of existing fields ...
});
```

#### 4. Workstream Metadata Table

Track clustering history and parameters for intelligent re-clustering decisions.

```typescript
// packages/database/src/schema.ts

export const workstreamMetadata = pgTable('WorkstreamMetadata', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' })
    .unique(), // One metadata record per user

  // Clustering history
  lastFullClusteringAt: timestamp('last_full_clustering_at').notNull(),
  achievementCountAtLastClustering: integer('achievement_count_at_last_clustering').notNull(),

  // Clustering parameters used
  epsilon: real('epsilon').notNull(),
  minPts: integer('min_pts').notNull(),

  // Statistics
  workstreamCount: integer('workstream_count').default(0),
  outlierCount: integer('outlier_count').default(0),

  // Auditing
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type WorkstreamMetadata = InferSelectModel<typeof workstreamMetadata>;
```

### Dependencies

Add to `apps/web/package.json`:

```json
{
  "dependencies": {
    "density-clustering": "^1.3.0",
    "pgvector": "^0.2.0"
  },
  "devDependencies": {
    "@types/density-clustering": "^1.3.0"
  }
}
```

---

## Clustering Strategy

### Algorithm: DBSCAN (Density-Based Spatial Clustering of Applications with Noise)

**Why DBSCAN?**
- Automatically determines number of clusters (no need to specify k)
- Identifies outliers naturally (achievements that don't fit any workstream)
- Density-based: groups semantically similar achievements
- Handles varying cluster sizes well
- Pure TypeScript implementation available

### Dataset Size Thresholds

```typescript
const MINIMUM_ACHIEVEMENTS = 20;    // Below this, feature is disabled
const SMALL_DATASET = 100;          // Relaxed parameters threshold

function getClusteringParameters(achievementCount: number) {
  if (achievementCount < MINIMUM_ACHIEVEMENTS) {
    return null; // Feature disabled
  }

  if (achievementCount < SMALL_DATASET) {
    // Relaxed parameters for smaller datasets (20-99 achievements)
    return {
      minPts: 3,              // Allow smaller clusters
      minClusterSize: 3,      // Minimum 3 achievements per workstream
      outlierThreshold: 0.70, // More lenient (70% similarity required)
    };
  }

  // Standard parameters for larger datasets (100+ achievements)
  return {
    minPts: 5,              // Standard density requirement
    minClusterSize: 5,      // Minimum 5 achievements per workstream
    outlierThreshold: 0.65, // Standard threshold (65% similarity)
  };
}
```

### Core Clustering Algorithm

```typescript
// apps/web/lib/ai/clustering.ts

import DBSCAN from 'density-clustering';

export interface ClusteringParams {
  minPts: number;
  minClusterSize: number;
  outlierThreshold: number;
}

export interface ClusteringResult {
  clusters: number[][];      // Array of arrays of achievement indices
  labels: number[];          // Cluster assignment per achievement (-1 = outlier)
  epsilon: number;           // Calculated epsilon parameter
  outlierCount: number;      // Number of unassigned achievements
}

/**
 * Calculate optimal epsilon using k-distance plot method
 */
export function findOptimalEpsilon(
  embeddings: number[][],
  k: number
): number {
  const kDistances: number[] = [];

  // For each point, find distance to kth nearest neighbor
  for (let i = 0; i < embeddings.length; i++) {
    const distances: number[] = [];

    for (let j = 0; j < embeddings.length; j++) {
      if (i === j) continue;
      distances.push(cosineDistance(embeddings[i], embeddings[j]));
    }

    distances.sort((a, b) => a - b);
    kDistances.push(distances[k - 1]);
  }

  // Sort k-distances
  kDistances.sort((a, b) => a - b);

  // Find "elbow" - point with maximum jump in sorted distances
  let maxJump = 0;
  let elbowIndex = Math.floor(kDistances.length * 0.95); // Start at 95th percentile

  for (let i = Math.floor(kDistances.length * 0.5); i < kDistances.length - 1; i++) {
    const jump = kDistances[i + 1] - kDistances[i];
    if (jump > maxJump) {
      maxJump = jump;
      elbowIndex = i;
    }
  }

  return kDistances[elbowIndex];
}

/**
 * Cosine distance function for embeddings (0 = identical, 2 = opposite)
 */
export function cosineDistance(a: number[], b: number[]): number {
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);

  if (magA === 0 || magB === 0) return 1; // Handle zero vectors

  const similarity = dotProduct / (magA * magB);
  return 1 - similarity; // Convert similarity to distance
}

/**
 * Run DBSCAN clustering on embeddings
 */
export function clusterEmbeddings(
  embeddings: number[][],
  params: ClusteringParams
): ClusteringResult {
  // Calculate optimal epsilon
  const epsilon = findOptimalEpsilon(embeddings, params.minPts);

  // Initialize DBSCAN
  const dbscan = new DBSCAN();

  // Run clustering
  // Returns array of clusters, where each cluster is array of point indices
  const clusters = dbscan.run(
    embeddings,
    epsilon,
    params.minPts,
    cosineDistance
  );

  // Convert to labels array (one label per point)
  const labels = new Array(embeddings.length).fill(-1);
  clusters.forEach((cluster, clusterId) => {
    cluster.forEach(pointIndex => {
      labels[pointIndex] = clusterId;
    });
  });

  const outlierCount = labels.filter(l => l === -1).length;

  return {
    clusters,
    labels,
    epsilon,
    outlierCount,
  };
}

/**
 * Calculate centroid (average) of a set of embeddings
 */
export function calculateCentroid(embeddings: number[][]): number[] {
  if (embeddings.length === 0) {
    throw new Error('Cannot calculate centroid of empty array');
  }

  const dimensions = embeddings[0].length;
  const centroid = new Array(dimensions).fill(0);

  for (const embedding of embeddings) {
    for (let i = 0; i < dimensions; i++) {
      centroid[i] += embedding[i];
    }
  }

  for (let i = 0; i < dimensions; i++) {
    centroid[i] /= embeddings.length;
  }

  return centroid;
}
```

---

## Incremental Update Strategy

### Decision Logic

When new achievements are added, decide between incremental assignment and full re-clustering:

```typescript
// apps/web/lib/ai/workstreams.ts

export interface UpdateDecision {
  strategy: 'incremental' | 'full';
  reason: string;
}

export function decideShouldReCluster(
  currentAchievementCount: number,
  metadata: WorkstreamMetadata | null
): UpdateDecision {
  // Never clustered before
  if (!metadata) {
    return {
      strategy: 'full',
      reason: 'Initial clustering',
    };
  }

  const lastCount = metadata.achievementCountAtLastClustering;
  const newCount = currentAchievementCount - lastCount;
  const percentageChange = newCount / lastCount;

  // Trigger 1: Added 10%+ new data
  if (percentageChange >= 0.10) {
    return {
      strategy: 'full',
      reason: `${Math.round(percentageChange * 100)}% more achievements since last clustering`,
    };
  }

  // Trigger 2: Added 50+ new achievements (absolute threshold)
  if (newCount >= 50) {
    return {
      strategy: 'full',
      reason: `${newCount} new achievements since last clustering`,
    };
  }

  // Trigger 3: Been more than 30 days since last clustering
  const daysSinceLastClustering =
    (Date.now() - metadata.lastFullClusteringAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceLastClustering >= 30) {
    return {
      strategy: 'full',
      reason: `${Math.round(daysSinceLastClustering)} days since last clustering`,
    };
  }

  // Default: incremental assignment
  return {
    strategy: 'incremental',
    reason: 'Small number of new achievements',
  };
}
```

### Incremental Assignment

Assign new achievements to existing workstreams using cached centroids:

```typescript
// apps/web/lib/ai/workstreams.ts

import { eq, isNull, and } from 'drizzle-orm';
import { db } from '@/database';
import { achievement, workstream } from '@/database/schema';
import { cosineDistance } from './clustering';

export interface AssignmentResult {
  assigned: string[];        // Achievement IDs assigned to workstreams
  unassigned: string[];      // Achievement IDs left as outliers
  assignments: Map<string, string>; // achievementId -> workstreamId
}

/**
 * Assign new achievements to existing workstreams
 */
export async function incrementalAssignment(
  userId: string,
  params: ClusteringParams
): Promise<AssignmentResult> {
  // Get unassigned achievements with embeddings
  const unassignedAchievements = await db
    .select()
    .from(achievement)
    .where(
      and(
        eq(achievement.userId, userId),
        isNull(achievement.workstreamId),
        isNotNull(achievement.embedding)
      )
    );

  if (unassignedAchievements.length === 0) {
    return {
      assigned: [],
      unassigned: [],
      assignments: new Map(),
    };
  }

  // Get all workstreams with cached centroids
  const workstreams = await db
    .select()
    .from(workstream)
    .where(
      and(
        eq(workstream.userId, userId),
        eq(workstream.isArchived, false),
        isNotNull(workstream.centroidEmbedding)
      )
    );

  if (workstreams.length === 0) {
    // No workstreams yet, return all as unassigned
    return {
      assigned: [],
      unassigned: unassignedAchievements.map(a => a.id),
      assignments: new Map(),
    };
  }

  const assigned: string[] = [];
  const unassigned: string[] = [];
  const assignments = new Map<string, string>();

  // For each unassigned achievement, find best workstream
  for (const ach of unassignedAchievements) {
    const match = findBestWorkstream(ach.embedding!, workstreams);

    if (match.confidence >= params.outlierThreshold) {
      // Assign to workstream
      await db
        .update(achievement)
        .set({
          workstreamId: match.workstreamId,
          workstreamSource: 'ai',
        })
        .where(eq(achievement.id, ach.id));

      assigned.push(ach.id);
      assignments.set(ach.id, match.workstreamId);

      // Update workstream achievement count
      await db
        .update(workstream)
        .set({
          achievementCount: sql`${workstream.achievementCount} + 1`,
        })
        .where(eq(workstream.id, match.workstreamId));
    } else {
      // Leave as outlier
      unassigned.push(ach.id);
    }
  }

  return { assigned, unassigned, assignments };
}

interface WorkstreamMatch {
  workstreamId: string;
  confidence: number;
  distance: number;
}

/**
 * Find best matching workstream for an embedding
 */
function findBestWorkstream(
  embedding: number[],
  workstreams: Workstream[]
): WorkstreamMatch {
  let bestMatch: WorkstreamMatch = {
    workstreamId: '',
    confidence: 0,
    distance: Infinity,
  };

  for (const ws of workstreams) {
    const distance = cosineDistance(embedding, ws.centroidEmbedding!);
    const confidence = 1 - distance; // Convert distance to similarity

    if (distance < bestMatch.distance) {
      bestMatch = {
        workstreamId: ws.id,
        confidence,
        distance,
      };
    }
  }

  return bestMatch;
}
```

### Full Re-Clustering

Re-cluster all achievements from scratch:

```typescript
// apps/web/lib/ai/workstreams.ts

import { generateText } from 'ai';
import { getLLM } from '@/lib/ai/llm-router';

export interface FullClusteringResult {
  workstreamsCreated: number;
  achievementsAssigned: number;
  outliers: number;
  metadata: WorkstreamMetadata;
}

/**
 * Run full clustering from scratch
 */
export async function fullReclustering(
  userId: string,
  user: User
): Promise<FullClusteringResult> {
  // 1. Get all achievements with embeddings
  const achievements = await db
    .select()
    .from(achievement)
    .where(
      and(
        eq(achievement.userId, userId),
        isNotNull(achievement.embedding)
      )
    );

  if (achievements.length < MINIMUM_ACHIEVEMENTS) {
    throw new Error(`Need at least ${MINIMUM_ACHIEVEMENTS} achievements to generate workstreams`);
  }

  // 2. Archive existing workstreams
  await db
    .update(workstream)
    .set({ isArchived: true })
    .where(eq(workstream.userId, userId));

  // 3. Clear workstream assignments
  await db
    .update(achievement)
    .set({ workstreamId: null, workstreamSource: null })
    .where(eq(achievement.userId, userId));

  // 4. Get clustering parameters based on dataset size
  const params = getClusteringParameters(achievements.length);
  if (!params) {
    throw new Error('Insufficient achievements for clustering');
  }

  // 5. Run clustering
  const embeddings = achievements.map(a => a.embedding!);
  const clusteringResult = clusterEmbeddings(embeddings, params);

  // 6. Create workstreams for each cluster
  const workstreamsCreated: string[] = [];

  for (let clusterId = 0; clusterId < clusteringResult.clusters.length; clusterId++) {
    const clusterIndices = clusteringResult.clusters[clusterId];
    const clusterAchievements = clusterIndices.map(idx => achievements[idx]);

    // Generate workstream name and description using LLM
    const { name, description } = await nameWorkstream(clusterAchievements, user);

    // Calculate centroid for this cluster
    const clusterEmbeddings = clusterIndices.map(idx => embeddings[idx]);
    const centroid = calculateCentroid(clusterEmbeddings);

    // Create workstream
    const [newWorkstream] = await db
      .insert(workstream)
      .values({
        userId,
        name,
        description,
        centroidEmbedding: centroid,
        centroidUpdatedAt: new Date(),
        achievementCount: clusterAchievements.length,
      })
      .returning();

    workstreamsCreated.push(newWorkstream.id);

    // Assign achievements to workstream
    await db
      .update(achievement)
      .set({
        workstreamId: newWorkstream.id,
        workstreamSource: 'ai',
      })
      .where(
        inArray(
          achievement.id,
          clusterAchievements.map(a => a.id)
        )
      );
  }

  // 7. Save metadata
  const metadata = await db
    .insert(workstreamMetadata)
    .values({
      userId,
      lastFullClusteringAt: new Date(),
      achievementCountAtLastClustering: achievements.length,
      epsilon: clusteringResult.epsilon,
      minPts: params.minPts,
      workstreamCount: workstreamsCreated.length,
      outlierCount: clusteringResult.outlierCount,
    })
    .onConflictDoUpdate({
      target: workstreamMetadata.userId,
      set: {
        lastFullClusteringAt: new Date(),
        achievementCountAtLastClustering: achievements.length,
        epsilon: clusteringResult.epsilon,
        minPts: params.minPts,
        workstreamCount: workstreamsCreated.length,
        outlierCount: clusteringResult.outlierCount,
        updatedAt: new Date(),
      },
    })
    .returning();

  return {
    workstreamsCreated: workstreamsCreated.length,
    achievementsAssigned: achievements.length - clusteringResult.outlierCount,
    outliers: clusteringResult.outlierCount,
    metadata: metadata[0],
  };
}

/**
 * Use LLM to generate name and description for a workstream
 */
async function nameWorkstream(
  achievements: Achievement[],
  user: User
): Promise<{ name: string; description: string }> {
  // Sample up to 15 achievements for naming (to avoid token limits)
  const sample = achievements.slice(0, 15);

  const achievementList = sample
    .map(a => `- ${a.title}: ${a.summary || a.details || '(no description)'}`)
    .join('\n');

  const prompt = `You are analyzing a group of related professional achievements to identify the common theme or workstream.

Here are the achievements:

${achievementList}

Based on these achievements, provide:
1. A short, descriptive workstream name (2-5 words, title case)
2. A one-sentence description explaining what this workstream represents

Respond in JSON format:
{
  "name": "Workstream Name",
  "description": "A brief description of what this workstream represents."
}`;

  const llm = await getLLM(user, 'generation');

  const result = await generateText({
    model: llm,
    prompt,
    temperature: 0.3, // Lower temperature for more consistent naming
  });

  try {
    const parsed = JSON.parse(result.text);
    return {
      name: parsed.name || 'Unnamed Workstream',
      description: parsed.description || '',
    };
  } catch (error) {
    console.error('Failed to parse LLM response for workstream naming:', error);
    // Fallback: extract from text
    return {
      name: 'Unnamed Workstream',
      description: result.text.slice(0, 200),
    };
  }
}
```

### Centroid Management

Keep centroids up-to-date when achievements change:

```typescript
// apps/web/lib/ai/workstreams.ts

/**
 * Recalculate and update workstream centroid
 */
export async function updateWorkstreamCentroid(
  workstreamId: string
): Promise<void> {
  // Get all achievements in this workstream with embeddings
  const achievements = await db
    .select()
    .from(achievement)
    .where(
      and(
        eq(achievement.workstreamId, workstreamId),
        isNotNull(achievement.embedding)
      )
    );

  if (achievements.length === 0) {
    // No achievements left, archive the workstream
    await db
      .update(workstream)
      .set({ isArchived: true })
      .where(eq(workstream.id, workstreamId));
    return;
  }

  // Calculate new centroid
  const embeddings = achievements.map(a => a.embedding!);
  const centroid = calculateCentroid(embeddings);

  // Update workstream
  await db
    .update(workstream)
    .set({
      centroidEmbedding: centroid,
      centroidUpdatedAt: new Date(),
      achievementCount: achievements.length,
      updatedAt: new Date(),
    })
    .where(eq(workstream.id, workstreamId));
}

/**
 * Hook: Update centroid when achievement workstream changes
 */
export async function onAchievementWorkstreamChange(
  achievementId: string,
  oldWorkstreamId: string | null,
  newWorkstreamId: string | null
): Promise<void> {
  const promises: Promise<void>[] = [];

  // Update old workstream centroid
  if (oldWorkstreamId) {
    promises.push(updateWorkstreamCentroid(oldWorkstreamId));
  }

  // Update new workstream centroid
  if (newWorkstreamId) {
    promises.push(updateWorkstreamCentroid(newWorkstreamId));
  }

  await Promise.all(promises);
}
```

---

## Implementation Components

### File Structure

```
apps/web/
├── lib/
│   └── ai/
│       ├── embeddings.ts           # Embedding generation
│       ├── clustering.ts           # DBSCAN clustering logic
│       └── workstreams.ts          # High-level orchestration
├── app/
│   └── api/
│       └── workstreams/
│           ├── route.ts            # List, create
│           ├── [id]/
│           │   └── route.ts        # Get, update, delete
│           ├── generate/
│           │   └── route.ts        # Trigger generation
│           └── assign/
│               └── route.ts        # Manual assignment
├── components/
│   └── workstreams/
│       ├── workstream-list.tsx     # List all workstreams
│       ├── workstream-card.tsx     # Individual workstream display
│       ├── generate-button.tsx     # Trigger generation
│       ├── assignment-dialog.tsx   # Manual assignment UI
│       └── workstream-badge.tsx    # Badge component
└── hooks/
    └── use-workstreams.ts          # React hook for workstream data

packages/database/
└── src/
    └── workstreams/
        └── queries.ts               # Database queries
```

### Core Modules

#### 1. Embeddings Module

```typescript
// apps/web/lib/ai/embeddings.ts

import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { db } from '@/database';
import { achievement } from '@/database/schema';
import { eq } from 'drizzle-orm';

const EMBEDDING_MODEL = 'text-embedding-3-small';

/**
 * Generate embedding for a single achievement
 */
export async function generateAchievementEmbedding(
  achievementId: string
): Promise<number[]> {
  const [ach] = await db
    .select()
    .from(achievement)
    .where(eq(achievement.id, achievementId));

  if (!ach) {
    throw new Error(`Achievement ${achievementId} not found`);
  }

  const text = formatAchievementForEmbedding(ach);
  const { embedding } = await embed({
    model: openai.embedding(EMBEDDING_MODEL),
    value: text,
  });

  // Save embedding to database
  await db
    .update(achievement)
    .set({
      embedding,
      embeddingModel: EMBEDDING_MODEL,
      embeddingGeneratedAt: new Date(),
    })
    .where(eq(achievement.id, achievementId));

  return embedding;
}

/**
 * Generate embeddings for multiple achievements in batch
 */
export async function generateEmbeddingsBatch(
  achievementIds: string[]
): Promise<Map<string, number[]>> {
  const achievements = await db
    .select()
    .from(achievement)
    .where(inArray(achievement.id, achievementIds));

  const embeddings = new Map<string, number[]>();

  // Process in parallel (OpenAI handles rate limiting)
  await Promise.all(
    achievements.map(async (ach) => {
      try {
        const text = formatAchievementForEmbedding(ach);
        const { embedding } = await embed({
          model: openai.embedding(EMBEDDING_MODEL),
          value: text,
        });

        embeddings.set(ach.id, embedding);

        // Save to database
        await db
          .update(achievement)
          .set({
            embedding,
            embeddingModel: EMBEDDING_MODEL,
            embeddingGeneratedAt: new Date(),
          })
          .where(eq(achievement.id, ach.id));
      } catch (error) {
        console.error(`Failed to generate embedding for ${ach.id}:`, error);
      }
    })
  );

  return embeddings;
}

/**
 * Generate embeddings for all achievements without embeddings
 */
export async function generateMissingEmbeddings(
  userId: string
): Promise<number> {
  const missingEmbeddings = await db
    .select()
    .from(achievement)
    .where(
      and(
        eq(achievement.userId, userId),
        isNull(achievement.embedding)
      )
    );

  if (missingEmbeddings.length === 0) {
    return 0;
  }

  await generateEmbeddingsBatch(missingEmbeddings.map(a => a.id));

  return missingEmbeddings.length;
}

/**
 * Format achievement for embedding generation
 */
function formatAchievementForEmbedding(ach: Achievement): string {
  const parts = [ach.title];

  if (ach.summary) {
    parts.push(ach.summary);
  }

  // Optionally include details (but keep token count reasonable)
  if (ach.details && ach.details.length < 500) {
    parts.push(ach.details);
  }

  return parts.join('\n');
}
```

#### 2. Database Queries Module

```typescript
// packages/database/src/workstreams/queries.ts

import { db } from '..';
import { workstream, achievement, workstreamMetadata } from '../schema';
import { eq, and, isNull, desc } from 'drizzle-orm';

export async function getWorkstreamsByUserId(
  userId: string,
  includeArchived = false
): Promise<Workstream[]> {
  const conditions = [eq(workstream.userId, userId)];

  if (!includeArchived) {
    conditions.push(eq(workstream.isArchived, false));
  }

  return await db
    .select()
    .from(workstream)
    .where(and(...conditions))
    .orderBy(desc(workstream.achievementCount));
}

export async function getWorkstreamById(
  workstreamId: string
): Promise<Workstream | null> {
  const [ws] = await db
    .select()
    .from(workstream)
    .where(eq(workstream.id, workstreamId));

  return ws || null;
}

export async function getAchievementsByWorkstreamId(
  workstreamId: string
): Promise<Achievement[]> {
  return await db
    .select()
    .from(achievement)
    .where(eq(achievement.workstreamId, workstreamId))
    .orderBy(desc(achievement.eventStart));
}

export async function getUnassignedAchievements(
  userId: string
): Promise<Achievement[]> {
  return await db
    .select()
    .from(achievement)
    .where(
      and(
        eq(achievement.userId, userId),
        isNull(achievement.workstreamId),
        isNotNull(achievement.embedding)
      )
    );
}

export async function getWorkstreamMetadata(
  userId: string
): Promise<WorkstreamMetadata | null> {
  const [metadata] = await db
    .select()
    .from(workstreamMetadata)
    .where(eq(workstreamMetadata.userId, userId));

  return metadata || null;
}

export async function updateWorkstream(
  workstreamId: string,
  updates: Partial<Workstream>
): Promise<Workstream> {
  const [updated] = await db
    .update(workstream)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(workstream.id, workstreamId))
    .returning();

  return updated;
}

export async function archiveWorkstream(
  workstreamId: string
): Promise<void> {
  await db
    .update(workstream)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(eq(workstream.id, workstreamId));
}
```

---

## API Endpoints

### 1. POST /api/workstreams/generate

Trigger workstream generation (full clustering or incremental).

```typescript
// apps/web/app/api/workstreams/generate/route.ts

import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import {
  decideShouldReCluster,
  fullReclustering,
  incrementalAssignment,
  generateMissingEmbeddings,
} from '@/lib/ai/workstreams';
import { getWorkstreamMetadata } from '@/database/workstreams/queries';

export async function POST(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Generate embeddings for any achievements that don't have them
    const embeddingsGenerated = await generateMissingEmbeddings(auth.user.id);

    // 2. Get current metadata
    const metadata = await getWorkstreamMetadata(auth.user.id);

    // 3. Get achievement count
    const achievements = await db
      .select({ count: count() })
      .from(achievement)
      .where(
        and(
          eq(achievement.userId, auth.user.id),
          isNotNull(achievement.embedding)
        )
      );

    const achievementCount = achievements[0].count;

    if (achievementCount < MINIMUM_ACHIEVEMENTS) {
      return NextResponse.json({
        error: 'Insufficient achievements',
        message: `You need at least ${MINIMUM_ACHIEVEMENTS} achievements to generate workstreams. You currently have ${achievementCount}.`,
      }, { status: 400 });
    }

    // 4. Decide strategy
    const decision = decideShouldReCluster(achievementCount, metadata);

    // 5. Execute
    if (decision.strategy === 'full') {
      const result = await fullReclustering(auth.user.id, auth.user);

      return NextResponse.json({
        strategy: 'full',
        reason: decision.reason,
        embeddingsGenerated,
        ...result,
      });
    } else {
      const params = getClusteringParameters(achievementCount);
      const result = await incrementalAssignment(auth.user.id, params!);

      return NextResponse.json({
        strategy: 'incremental',
        reason: decision.reason,
        embeddingsGenerated,
        assigned: result.assigned.length,
        unassigned: result.unassigned.length,
      });
    }
  } catch (error) {
    console.error('Error generating workstreams:', error);
    return NextResponse.json(
      { error: 'Failed to generate workstreams' },
      { status: 500 }
    );
  }
}
```

### 2. GET /api/workstreams

List user's workstreams.

```typescript
// apps/web/app/api/workstreams/route.ts

import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { getWorkstreamsByUserId } from '@/database/workstreams/queries';

export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const workstreams = await getWorkstreamsByUserId(auth.user.id);
    return NextResponse.json({ workstreams });
  } catch (error) {
    console.error('Error fetching workstreams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workstreams' },
      { status: 500 }
    );
  }
}
```

### 3. PUT /api/workstreams/[id]

Update workstream name, description, or color.

```typescript
// apps/web/app/api/workstreams/[id]/route.ts

import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { getWorkstreamById, updateWorkstream } from '@/database/workstreams/queries';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  description: z.string().max(1000).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthUser(request);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const ws = await getWorkstreamById(params.id);

    if (!ws || ws.userId !== auth.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = updateSchema.parse(body);

    const updated = await updateWorkstream(params.id, validated);

    return NextResponse.json({ workstream: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating workstream:', error);
    return NextResponse.json(
      { error: 'Failed to update workstream' },
      { status: 500 }
    );
  }
}
```

### 4. POST /api/workstreams/assign

Manually assign achievement to workstream.

```typescript
// apps/web/app/api/workstreams/assign/route.ts

import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { db } from '@/database';
import { achievement } from '@/database/schema';
import { eq, and } from 'drizzle-orm';
import { onAchievementWorkstreamChange } from '@/lib/ai/workstreams';
import { z } from 'zod';

const assignSchema = z.object({
  achievementId: z.string().uuid(),
  workstreamId: z.string().uuid().nullable(),
});

export async function POST(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { achievementId, workstreamId } = assignSchema.parse(body);

    // Get current achievement
    const [ach] = await db
      .select()
      .from(achievement)
      .where(
        and(
          eq(achievement.id, achievementId),
          eq(achievement.userId, auth.user.id)
        )
      );

    if (!ach) {
      return NextResponse.json({ error: 'Achievement not found' }, { status: 404 });
    }

    const oldWorkstreamId = ach.workstreamId;

    // Update achievement
    await db
      .update(achievement)
      .set({
        workstreamId,
        workstreamSource: 'user', // User manually assigned
      })
      .where(eq(achievement.id, achievementId));

    // Update centroids for affected workstreams
    await onAchievementWorkstreamChange(achievementId, oldWorkstreamId, workstreamId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error assigning achievement:', error);
    return NextResponse.json(
      { error: 'Failed to assign achievement' },
      { status: 500 }
    );
  }
}
```

### 5. DELETE /api/workstreams/[id]

Archive a workstream.

```typescript
// apps/web/app/api/workstreams/[id]/route.ts

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthUser(request);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const ws = await getWorkstreamById(params.id);

    if (!ws || ws.userId !== auth.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Archive workstream
    await archiveWorkstream(params.id);

    // Unassign all achievements
    await db
      .update(achievement)
      .set({ workstreamId: null, workstreamSource: null })
      .where(eq(achievement.workstreamId, params.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting workstream:', error);
    return NextResponse.json(
      { error: 'Failed to delete workstream' },
      { status: 500 }
    );
  }
}
```

---

## UI/UX Flow

### 1. Workstream Dashboard Widget

```typescript
// apps/web/components/workstreams/workstream-status.tsx

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWorkstreams } from '@/hooks/use-workstreams';
import { Loader2 } from 'lucide-react';

export function WorkstreamStatus() {
  const {
    workstreams,
    metadata,
    unassignedCount,
    achievementCount,
    isLoading,
    generateWorkstreams,
    isGenerating,
  } = useWorkstreams();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const canGenerate = achievementCount >= 20;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workstreams</CardTitle>
      </CardHeader>
      <CardContent>
        {!canGenerate ? (
          <div className="text-sm text-muted-foreground">
            <p>You have {achievementCount} achievements.</p>
            <p>Log at least 20 achievements to use automatic workstream generation.</p>
          </div>
        ) : workstreams.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Discover themes and patterns in your {achievementCount} achievements.
            </p>
            <Button onClick={generateWorkstreams} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Workstreams'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{workstreams.length}</p>
                <p className="text-sm text-muted-foreground">Active workstreams</p>
              </div>
              {unassignedCount > 0 && (
                <div>
                  <p className="text-2xl font-bold">{unassignedCount}</p>
                  <p className="text-sm text-muted-foreground">Unassigned</p>
                </div>
              )}
            </div>

            {unassignedCount > 0 && (
              <div className="rounded-md bg-muted p-3">
                <p className="text-sm">
                  You have {unassignedCount} new achievements not assigned to workstreams.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={generateWorkstreams}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Workstreams'
                  )}
                </Button>
              </div>
            )}

            <Button variant="outline" size="sm" onClick={() => window.location.href = '/workstreams'}>
              View All Workstreams
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 2. Workstream List Page

```typescript
// apps/web/components/workstreams/workstream-list.tsx

'use client';

import { WorkstreamCard } from './workstream-card';
import { useWorkstreams } from '@/hooks/use-workstreams';

export function WorkstreamList() {
  const { workstreams, isLoading } = useWorkstreams();

  if (isLoading) {
    return <div>Loading workstreams...</div>;
  }

  if (workstreams.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No workstreams yet.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {workstreams.map(ws => (
        <WorkstreamCard key={ws.id} workstream={ws} />
      ))}
    </div>
  );
}
```

### 3. Workstream Badge Component

```typescript
// apps/web/components/workstreams/workstream-badge.tsx

'use client';

import { Badge } from '@/components/ui/badge';
import type { Workstream } from '@/database/schema';

interface WorkstreamBadgeProps {
  workstream: Workstream;
  onRemove?: () => void;
}

export function WorkstreamBadge({ workstream, onRemove }: WorkstreamBadgeProps) {
  return (
    <Badge
      variant="outline"
      style={{ borderColor: workstream.color, color: workstream.color }}
    >
      {workstream.name}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:text-destructive"
          aria-label="Remove workstream"
        >
          ×
        </button>
      )}
    </Badge>
  );
}
```

### 4. React Hook for Workstreams

```typescript
// apps/web/hooks/use-workstreams.ts

import { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import type { Workstream } from '@/database/schema';

export function useWorkstreams() {
  const { data, error, isLoading } = useSWR('/api/workstreams', fetcher);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateWorkstreams = async () => {
    setIsGenerating(true);
    try {
      await fetch('/api/workstreams/generate', {
        method: 'POST',
      });

      // Refresh workstreams
      await mutate('/api/workstreams');
    } catch (error) {
      console.error('Failed to generate workstreams:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    workstreams: data?.workstreams || [],
    metadata: data?.metadata,
    unassignedCount: data?.unassignedCount || 0,
    achievementCount: data?.achievementCount || 0,
    isLoading,
    error,
    generateWorkstreams,
    isGenerating,
  };
}

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}
```

---

## Cost & Performance Analysis

### Embedding Generation Costs

Using OpenAI's `text-embedding-3-small` model:

```
Price: $0.020 per 1M tokens

Average achievement text: ~100 tokens (title + summary)
1000 achievements = 100,000 tokens
Cost: $0.002 per 1000 achievements

Initial generation for 1000 achievements: $0.002
Monthly incremental (100 new achievements): $0.0002
Annual cost for active user: ~$0.005
```

**Verdict**: Negligible cost, can be run on every achievement creation.

### LLM Naming Costs

Using GPT-4 or similar for workstream naming:

```
Input: ~1500 tokens (15 achievements × 100 tokens each)
Output: ~50 tokens (name + description)
Cost per workstream: ~$0.02

25 workstreams: ~$0.50
Full re-clustering cost: $0.50-1.00
```

**Verdict**: Reasonable cost, can be absorbed or passed to Pro users.

### Clustering Performance

DBSCAN computational complexity: O(n log n) with spatial indexing

```
100 achievements: ~50ms
500 achievements: ~200ms
1000 achievements: ~500ms
5000 achievements: ~3-5s
```

**Verdict**: Fast enough to run synchronously for <1000 achievements, background job for larger datasets.

### Total Cost Per User

```
Initial setup (1000 achievements):
- Embeddings: $0.002
- Clustering: $0 (CPU only)
- LLM naming: $0.50
Total: ~$0.50

Monthly maintenance (100 new achievements):
- Embeddings: $0.0002
- Incremental assignment: $0
- Re-clustering (quarterly): $0.50
Total: ~$0.17/month

Annual cost per active user: ~$2
```

**Monetization Strategy:**
- Free tier: Limit to 20 workstreams
- Pro tier: Unlimited workstreams + manual re-clustering

---

## Edge Cases & Considerations

### 1. Achievements Without Embeddings

**Problem**: User has old achievements before embedding feature was added.

**Solution**: Background job to generate missing embeddings on first workstream generation.

```typescript
// Before clustering, ensure all achievements have embeddings
await generateMissingEmbeddings(userId);
```

### 2. Very Similar Workstreams

**Problem**: Clustering creates multiple workstreams that seem redundant (e.g., "API Performance" and "Backend Optimization").

**Solutions**:
- Increase `clusterSelectionEpsilon` in DBSCAN to merge similar clusters
- Post-processing: use LLM to identify similar workstreams and suggest merges
- UI: Show similarity scores between workstreams, allow user to merge

```typescript
async function suggestWorkstreamMerges(
  workstreams: Workstream[]
): Promise<Array<{ ws1: Workstream; ws2: Workstream; similarity: number }>> {
  const suggestions: any[] = [];

  for (let i = 0; i < workstreams.length; i++) {
    for (let j = i + 1; j < workstreams.length; j++) {
      const similarity = 1 - cosineDistance(
        workstreams[i].centroidEmbedding!,
        workstreams[j].centroidEmbedding!
      );

      if (similarity > 0.85) { // 85% similar
        suggestions.push({
          ws1: workstreams[i],
          ws2: workstreams[j],
          similarity,
        });
      }
    }
  }

  return suggestions.sort((a, b) => b.similarity - a.similarity);
}
```

### 3. User Overrides Persist

**Problem**: User manually assigns achievement to workstream, then re-clustering moves it.

**Solution**: Respect user assignments with `workstreamSource = 'user'`.

```typescript
// During re-clustering, skip achievements with user assignments
const achievementsToCluster = achievements.filter(
  a => a.workstreamSource !== 'user'
);
```

### 4. Workstreams with Few Achievements

**Problem**: Some workstreams end up with only 1-2 achievements after users manually move things.

**Solution**: Periodic cleanup to archive workstreams with <3 achievements.

```typescript
async function cleanupSmallWorkstreams(userId: string) {
  const workstreams = await getWorkstreamsByUserId(userId);

  for (const ws of workstreams) {
    if (ws.achievementCount < 3) {
      // Archive and unassign achievements
      await archiveWorkstream(ws.id);
      await db
        .update(achievement)
        .set({ workstreamId: null })
        .where(eq(achievement.workstreamId, ws.id));
    }
  }
}
```

### 5. Performance with Large Datasets

**Problem**: User with 10,000+ achievements experiences slow clustering.

**Solution**: Run as background job with progress updates.

```typescript
// Use background job queue (e.g., BullMQ, Inngest)
await queue.add('generate-workstreams', {
  userId,
  notifyOnComplete: true,
});

// Send progress updates via websocket or SSE
io.to(userId).emit('workstream-progress', {
  stage: 'clustering',
  progress: 0.5,
});
```

### 6. Embedding Model Changes

**Problem**: OpenAI updates embedding model, old embeddings incompatible.

**Solution**: Track `embeddingModel` on each achievement, re-generate when model changes.

```typescript
const CURRENT_EMBEDDING_MODEL = 'text-embedding-3-small';

// Check if re-generation needed
const needsRegeneration = achievements.some(
  a => a.embeddingModel !== CURRENT_EMBEDDING_MODEL
);

if (needsRegeneration) {
  await regenerateAllEmbeddings(userId);
}
```

### 7. Multi-Language Support

**Problem**: User has achievements in multiple languages.

**Solution**: Embedding models are language-agnostic. No special handling needed, but LLM naming should use user's language.

```typescript
const llmPrompt = `You are analyzing achievements in ${user.preferences.language}.
Generate a workstream name and description in ${user.preferences.language}.`;
```

---

## Testing Strategy

### Unit Tests

```typescript
// __tests__/lib/ai/clustering.test.ts

import { clusterEmbeddings, cosineDistance, calculateCentroid } from '@/lib/ai/clustering';

describe('Clustering', () => {
  describe('cosineDistance', () => {
    it('returns 0 for identical vectors', () => {
      const a = [1, 2, 3];
      const b = [1, 2, 3];
      expect(cosineDistance(a, b)).toBeCloseTo(0);
    });

    it('returns 1 for orthogonal vectors', () => {
      const a = [1, 0];
      const b = [0, 1];
      expect(cosineDistance(a, b)).toBeCloseTo(1);
    });

    it('returns 2 for opposite vectors', () => {
      const a = [1, 0];
      const b = [-1, 0];
      expect(cosineDistance(a, b)).toBeCloseTo(2);
    });
  });

  describe('calculateCentroid', () => {
    it('calculates centroid correctly', () => {
      const embeddings = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ];
      const centroid = calculateCentroid(embeddings);
      expect(centroid).toEqual([4, 5, 6]);
    });
  });

  describe('clusterEmbeddings', () => {
    it('clusters similar embeddings together', () => {
      // Create 2 clusters of similar embeddings
      const cluster1 = [
        [1, 0, 0],
        [0.9, 0.1, 0],
        [0.8, 0.2, 0],
      ];
      const cluster2 = [
        [0, 1, 0],
        [0.1, 0.9, 0],
        [0, 0.8, 0.2],
      ];

      const embeddings = [...cluster1, ...cluster2];

      const result = clusterEmbeddings(embeddings, {
        minPts: 2,
        minClusterSize: 2,
        outlierThreshold: 0.65,
      });

      expect(result.clusters.length).toBe(2);
      expect(result.outlierCount).toBe(0);
    });

    it('identifies outliers', () => {
      const normal = [
        [1, 0, 0],
        [0.9, 0.1, 0],
        [0.8, 0.2, 0],
      ];
      const outlier = [[0, 0, 1]]; // Very different

      const embeddings = [...normal, ...outlier];

      const result = clusterEmbeddings(embeddings, {
        minPts: 2,
        minClusterSize: 2,
        outlierThreshold: 0.65,
      });

      expect(result.outlierCount).toBeGreaterThan(0);
      expect(result.labels[3]).toBe(-1); // Outlier label
    });
  });
});
```

### Integration Tests

```typescript
// __tests__/api/workstreams/generate.test.ts

import { POST } from '@/app/api/workstreams/generate/route';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/database';

jest.mock('@/app/(auth)/auth');

describe('POST /api/workstreams/generate', () => {
  beforeEach(async () => {
    // Setup test database with achievements
    await seedTestAchievements(testUserId, 100);
  });

  it('generates workstreams for user with 100 achievements', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: testUserId },
    });

    const request = new Request('http://localhost/api/workstreams/generate', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.strategy).toBe('full');
    expect(data.workstreamsCreated).toBeGreaterThan(0);
  });

  it('returns error for user with < 20 achievements', async () => {
    await seedTestAchievements(testUserId, 10);

    (auth as jest.Mock).mockResolvedValue({
      user: { id: testUserId },
    });

    const request = new Request('http://localhost/api/workstreams/generate', {
      method: 'POST',
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });
});
```

### Performance Tests

```typescript
// __tests__/performance/clustering.bench.ts

import { clusterEmbeddings } from '@/lib/ai/clustering';

describe('Clustering Performance', () => {
  it('clusters 1000 embeddings in < 1s', () => {
    const embeddings = generateRandomEmbeddings(1000, 1536);

    const start = Date.now();
    clusterEmbeddings(embeddings, {
      minPts: 5,
      minClusterSize: 5,
      outlierThreshold: 0.65,
    });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(1000);
  });

  it('clusters 5000 embeddings in < 5s', () => {
    const embeddings = generateRandomEmbeddings(5000, 1536);

    const start = Date.now();
    clusterEmbeddings(embeddings, {
      minPts: 5,
      minClusterSize: 5,
      outlierThreshold: 0.65,
    });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(5000);
  });
});
```

---

## Migration Path

For existing users, run a one-time migration:

```typescript
// scripts/migrate-workstreams.ts

async function migrateExistingUsers() {
  const users = await getAllUsers();

  for (const user of users) {
    const achievementCount = await getAchievementCount(user.id);

    if (achievementCount < MINIMUM_ACHIEVEMENTS) {
      console.log(`Skipping user ${user.id} (only ${achievementCount} achievements)`);
      continue;
    }

    console.log(`Generating workstreams for user ${user.id}...`);

    try {
      // Generate embeddings
      await generateMissingEmbeddings(user.id);

      // Run full clustering
      await fullReclustering(user.id, user);

      console.log(`✓ Complete for user ${user.id}`);
    } catch (error) {
      console.error(`✗ Failed for user ${user.id}:`, error);
    }
  }
}
```

---

## Future Enhancements

### 1. Temporal Workstreams

Cluster achievements within time periods:

```typescript
const clustersByQuarter = await clusterAchievementsByTimePeriod(userId, 'quarter');
// Results: "Q1 2024: Backend Performance", "Q2 2024: Frontend Redesign"
```

### 2. Project-Aware Clustering

Use project information as additional feature:

```typescript
// Multi-modal embedding: text + project metadata
const combinedEmbedding = [
  ...textEmbedding,
  projectFeatureVector, // One-hot encoding of project
];
```

### 3. Workstream Analytics

Show insights per workstream:

- Time distribution (% of time spent)
- Impact distribution (avg impact score)
- Trending workstreams (growing vs declining)
- Skill mapping (which skills used in which workstreams)

### 4. Workstream Recommendations

Suggest workstreams to highlight in resumes/reviews:

```typescript
function recommendWorkstreamsForContext(
  workstreams: Workstream[],
  context: 'resume' | 'review' | 'portfolio'
): Workstream[] {
  // Use LLM to rank workstreams by relevance to context
}
```

### 5. Collaborative Workstreams

For team plans, identify shared workstreams across team members.

---

## Conclusion

This workstreams feature provides automatic, intelligent grouping of achievements using state-of-the-art embedding and clustering techniques. The implementation balances:

- **Accuracy**: DBSCAN with auto-tuned parameters provides high-quality clusters
- **Performance**: Efficient incremental updates and centroid caching
- **Cost**: Minimal embedding costs, reasonable LLM costs for naming
- **UX**: Simple generation flow, manual override capability, clear feedback

The system is designed to scale from 20 achievements to 100,000+ while maintaining performance and accuracy.
