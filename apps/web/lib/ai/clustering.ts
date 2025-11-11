/**
 * Clustering Module for Workstreams Feature
 *
 * Implements DBSCAN clustering using the density-clustering package
 * to group semantically similar achievements based on embeddings.
 */

import { DBSCAN } from 'density-clustering';

/**
 * Parameters controlling DBSCAN clustering behavior
 */
export interface ClusteringParams {
  minPts: number; // Minimum points in a cluster
  minClusterSize: number; // Minimum cluster size for validity
  outlierThreshold: number; // Confidence threshold for assignment
}

/**
 * Result of clustering operation
 */
export interface ClusteringResult {
  clusters: number[][]; // Array of clusters, each containing point indices
  labels: number[]; // Label for each point (-1 for outlier)
  epsilon: number; // Distance threshold used
  outlierCount: number; // Number of outliers found
}

/**
 * Calculate cosine distance between two embedding vectors
 * Distance ranges from 0 (identical) to 2 (opposite)
 *
 * @param a - First embedding vector
 * @param b - Second embedding vector
 * @returns Cosine distance between vectors
 */
export function cosineDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embedding vectors must have equal length');
  }

  // Calculate dot product
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    const aVal = a[i];
    const bVal = b[i];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      dotProduct += aVal * bVal;
      magnitudeA += aVal * aVal;
      magnitudeB += bVal * bVal;
    }
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  // Handle zero vectors
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 2; // Maximum distance for zero vectors
  }

  // Cosine similarity ranges from -1 to 1
  // Convert to distance: distance = 1 - similarity
  const cosineSimilarity = dotProduct / (magnitudeA * magnitudeB);
  return 1 - cosineSimilarity;
}

/**
 * Calculate the mean (centroid) of multiple embeddings
 *
 * @param embeddings - Array of embedding vectors
 * @returns Centroid vector (mean of all embeddings)
 * @throws Error if embeddings array is empty
 */
export function calculateCentroid(embeddings: number[][]): number[] {
  if (embeddings.length === 0) {
    throw new Error('Cannot calculate centroid of empty embedding set');
  }

  const firstEmbedding = embeddings[0];
  if (!firstEmbedding) {
    throw new Error('First embedding is undefined');
  }

  const dimensions = firstEmbedding.length;
  const sums: number[] = Array(dimensions).fill(0);

  // Sum all vectors
  for (const embedding of embeddings) {
    if (!embedding) continue;
    for (let i = 0; i < dimensions; i++) {
      const val = embedding[i];
      if (typeof val === 'number') {
        sums[i] = (sums[i] || 0) + val;
      }
    }
  }

  // Divide by count to get mean
  const centroid: number[] = sums.map((sum) => sum / embeddings.length);

  return centroid;
}

/**
 * Find k-nearest neighbor distances for each point
 * Used to determine optimal epsilon for DBSCAN
 *
 * @param embeddings - Array of embedding vectors
 * @param k - Number of nearest neighbors to consider
 * @returns Sorted k-distances for finding elbow
 */
function calculateKDistances(embeddings: number[][], k: number): number[] {
  const distances: number[] = [];

  for (let i = 0; i < embeddings.length; i++) {
    const pointDistances: number[] = [];

    // Calculate distance to all other points
    for (let j = 0; j < embeddings.length; j++) {
      if (i !== j) {
        const embA = embeddings[i];
        const embB = embeddings[j];
        if (embA && embB) {
          const distance = cosineDistance(embA, embB);
          pointDistances.push(distance);
        }
      }
    }

    // Sort and get k-th nearest neighbor distance
    pointDistances.sort((a, b) => a - b);
    const kDistance =
      pointDistances[Math.min(k - 1, pointDistances.length - 1)];
    if (typeof kDistance === 'number') {
      distances.push(kDistance);
    }
  }

  return distances.sort((a, b) => a - b);
}

/**
 * Find optimal epsilon using k-distance plot method
 * Uses 90th percentile of k-distances as a more robust measure than elbow detection
 *
 * For cosine distance, typical ranges are:
 * - 0.1-0.3: Very similar (same topic/project)
 * - 0.3-0.5: Related (similar themes)
 * - 0.5-0.7: Somewhat related
 * - 0.7+: Unrelated
 *
 * @param embeddings - Array of embedding vectors
 * @param k - Number of nearest neighbors to consider (minPts)
 * @returns Estimated optimal epsilon value
 */
export function findOptimalEpsilon(embeddings: number[][], k = 5): number {
  if (embeddings.length < k) {
    // For small datasets, use a default epsilon in the "related" range
    return 0.6;
  }

  const kDistances = calculateKDistances(embeddings, k);

  // Use 40th percentile for tighter, more specific clusters
  // Higher percentiles (75th, 90th) create fewer, larger clusters
  // Lower percentiles (30th, 40th, 50th) create more, tighter clusters
  // 40th percentile with minPts=4 creates focused workstreams
  const percentileIndex = Math.floor(kDistances.length * 0.4);
  const result = kDistances[percentileIndex];

  console.log(`[Clustering] Calculated epsilon (40th percentile): ${result}`);

  // Clamp to reasonable range for cosine distance clustering
  // Min: 0.15 (prevent creating too many tiny clusters)
  // Max: 0.35 (prevent grouping loosely related achievements)
  const epsilon = typeof result === 'number' ? result : 0.25;
  const clamped = Math.max(0.15, Math.min(0.35, epsilon));

  if (clamped !== epsilon) {
    console.log(`[Clustering] Clamped epsilon from ${epsilon} to ${clamped}`);
  } else {
    console.log(`[Clustering] Using epsilon: ${clamped}`);
  }
  return clamped;
}

/**
 * Cluster embeddings using DBSCAN algorithm
 * Creates density-based clusters and identifies outliers
 *
 * @param embeddings - Array of embedding vectors to cluster
 * @param params - Clustering parameters (minPts, outlierThreshold)
 * @returns Clustering result with clusters, labels, and statistics
 */
export function clusterEmbeddings(
  embeddings: number[][],
  params: ClusteringParams,
): ClusteringResult {
  if (embeddings.length === 0) {
    return {
      clusters: [],
      labels: [],
      epsilon: 0,
      outlierCount: 0,
    };
  }

  // Find optimal epsilon using k-distance elbow method
  // This automatically determines the best epsilon for the dataset
  let epsilon = findOptimalEpsilon(embeddings, params.minPts);

  // Add small buffer since density-clustering uses strict < instead of <=
  // This ensures points at exactly epsilon distance are included
  epsilon = epsilon + 0.001;

  console.log('[Clustering] Initial epsilon:', epsilon);

  // Iterative refinement: try up to 3 times to avoid giant clusters
  let bestResult: {
    clusters: number[][];
    noise: number[];
    epsilon: number;
  } | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const currentEpsilon = epsilon * Math.pow(0.85, attempt); // Reduce by 15% each iteration
    console.log(
      `[Clustering] Attempt ${attempt + 1}/${maxAttempts} with epsilon: ${currentEpsilon.toFixed(4)}`,
    );

    // Run DBSCAN clustering
    const dbscan = new DBSCAN();
    const clusters = dbscan.run(
      embeddings,
      currentEpsilon,
      params.minPts,
      cosineDistance,
    );
    const noise = dbscan.noise || [];

    // Calculate quality score
    const clusterSizes = clusters.map((c) => c?.length || 0);
    const totalAssigned = clusterSizes.reduce((a, b) => a + b, 0);
    const largestCluster = Math.max(...clusterSizes, 0);
    const largestRatio = totalAssigned > 0 ? largestCluster / totalAssigned : 0;

    // Score: penalize giant clusters, prefer balanced distribution
    // Perfect score when: 8-12 clusters, largest <40% of total, 60-80% coverage
    const clusterCountScore = -Math.abs(clusters.length - 10) * 5;
    const giantClusterPenalty = -largestRatio * 100;
    const coverageRatio = totalAssigned / embeddings.length;
    const coverageScore = -Math.abs(coverageRatio - 0.7) * 30;
    const score = clusterCountScore + giantClusterPenalty + coverageScore;

    console.log(
      `[Clustering] Attempt ${attempt + 1}: ${clusters.length} clusters, largest=${largestCluster}/${totalAssigned} (${(largestRatio * 100).toFixed(1)}%), score=${score.toFixed(1)}`,
    );

    if (score > bestScore) {
      bestScore = score;
      bestResult = { clusters, noise, epsilon: currentEpsilon };
    }

    // Early exit if we found a good solution (no giant cluster)
    if (largestRatio < 0.5 && clusters.length >= 5) {
      console.log(
        `[Clustering] Found balanced clustering on attempt ${attempt + 1}, stopping early`,
      );
      break;
    }
  }

  // Use best result
  const clusters = bestResult!.clusters;
  const noise = bestResult!.noise;
  epsilon = bestResult!.epsilon;
  const outlierCount = noise.length;

  console.log(
    `[Clustering] Selected best result with epsilon: ${epsilon.toFixed(4)}`,
  );

  const clusterSizes = clusters.map((c) => c?.length || 0);
  console.log(
    `[Clustering] DBSCAN found ${clusters.length} raw clusters, ${noise.length} noise points`,
  );
  console.log(`[Clustering] Cluster sizes:`, clusterSizes);

  // Dynamic minClusterSize: if we have too many clusters, increase threshold
  // Target: 12-20 workstreams for manageable UX
  // Outliers will be auto-assigned in fullReclustering()
  let minClusterSize = params.minClusterSize;

  if (clusters.length > 25) {
    // Too many clusters! Calculate what minSize would give us ~12-20 clusters
    const sortedSizes = [...clusterSizes].sort((a, b) => b - a);

    // Try to find a threshold that keeps roughly 12-20 of the largest clusters
    // For 406 achievements: floor(406/25) = 16 clusters
    const targetClusterCount = Math.min(
      20,
      Math.max(12, Math.floor(embeddings.length / 25)),
    );

    if (sortedSizes.length > targetClusterCount) {
      // Use the size just ABOVE the Nth largest cluster as threshold
      // This ensures we keep AT MOST targetClusterCount clusters
      let proposedMinSize =
        sortedSizes[targetClusterCount] ?? params.minClusterSize;

      // Safety: if too many clusters have the proposed size, keep increasing until we get reduction
      // This handles the case where many clusters are the same size
      while (
        proposedMinSize < 100 &&
        sortedSizes.filter((s) => s >= proposedMinSize).length >
          targetClusterCount * 1.5
      ) {
        proposedMinSize++;
      }

      minClusterSize = Math.max(minClusterSize, proposedMinSize);
      console.log(
        `[Clustering] Too many clusters (${clusters.length}), increasing minClusterSize to ${minClusterSize} to target ${targetClusterCount} workstreams`,
      );
    }
  }

  // clusters is already organized as array of clusters
  // Extract labels for consistency with return type
  const labels: number[] = [];
  for (let i = 0; i < embeddings.length; i++) {
    let found = false;
    for (let clusterIdx = 0; clusterIdx < clusters.length; clusterIdx++) {
      const cluster = clusters[clusterIdx];
      if (cluster?.includes(i)) {
        labels.push(clusterIdx);
        found = true;
        break;
      }
    }
    if (!found) {
      labels.push(-1); // Outlier
    }
  }

  // Filter out clusters below minimum size (now dynamically adjusted)
  const validClusters = clusters.filter(
    (cluster) => cluster && cluster.length >= minClusterSize,
  );

  console.log(
    `[Clustering] After filtering (minClusterSize=${minClusterSize}): ${validClusters.length} valid clusters`,
  );

  // Recount outliers and merge small clusters into outliers
  // Use the dynamically adjusted minClusterSize, not the original params value
  let finalOutlierCount = outlierCount;
  for (const cluster of clusters) {
    if (cluster && cluster.length < minClusterSize) {
      finalOutlierCount += cluster.length;
    }
  }

  return {
    clusters: validClusters,
    labels,
    epsilon,
    outlierCount: finalOutlierCount,
  };
}

/**
 * Get clustering parameters based on achievement count
 * Returns null if insufficient achievements for clustering
 * Adjusts parameters based on dataset size
 *
 * @param achievementCount - Number of achievements to cluster
 * @returns Clustering parameters or null if < 20 achievements
 */
export function getClusteringParameters(
  achievementCount: number,
): ClusteringParams | null {
  // Minimum threshold for meaningful clustering
  if (achievementCount < 20) {
    return null;
  }

  // Relaxed parameters for smaller datasets (20-99 achievements)
  if (achievementCount < 100) {
    return {
      minPts: 3,
      minClusterSize: 3,
      outlierThreshold: 0.7,
    };
  }

  // Standard parameters for larger datasets (100+ achievements)
  // minPts=3 balances inclusiveness and cluster quality
  // Requires at least 3 close achievements to form a cluster
  // More inclusive than minPts=4, reducing outliers while maintaining quality
  return {
    minPts: 3,
    minClusterSize: 3,
    outlierThreshold: 0.65,
  };
}
