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
 * Looks for the "elbow" in the sorted k-distances
 *
 * @param embeddings - Array of embedding vectors
 * @param k - Number of nearest neighbors to consider (minPts)
 * @returns Estimated optimal epsilon value
 */
export function findOptimalEpsilon(embeddings: number[][], k = 5): number {
  if (embeddings.length < k) {
    // For small datasets, use a default epsilon
    return 0.5;
  }

  const kDistances = calculateKDistances(embeddings, k);

  // Find the elbow point using simple heuristic:
  // Look for largest gap in differences
  let maxGap = 0;
  let elbowIndex = 0;

  for (let i = 1; i < kDistances.length; i++) {
    const current = kDistances[i];
    const previous = kDistances[i - 1];
    if (typeof current === 'number' && typeof previous === 'number') {
      const gap = current - previous;
      if (gap > maxGap) {
        maxGap = gap;
        elbowIndex = i;
      }
    }
  }

  // Return the distance at elbow point
  const result = kDistances[elbowIndex];
  // Ensure epsilon is always positive (handle floating point precision issues)
  const epsilon = typeof result === 'number' ? Math.max(0.0001, result) : 0.5;
  return epsilon;
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

  // Find optimal epsilon
  const calculatedEpsilon = findOptimalEpsilon(embeddings, params.minPts);

  // For initial clustering with project context, use a more lenient epsilon
  // Cosine distance of 0.7 allows for reasonably diverse content within same project
  const epsilon = Math.max(calculatedEpsilon, 0.7);

  console.log(
    '[Clustering] Using epsilon:',
    epsilon,
    '(calculated:',
    calculatedEpsilon,
    ')',
  );

  // Create distance matrix using cosine distance
  const distanceMatrix: number[][] = [];
  for (let i = 0; i < embeddings.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < embeddings.length; j++) {
      if (i === j) {
        row.push(0);
      } else {
        const embA = embeddings[i];
        const embB = embeddings[j];
        if (embA && embB) {
          row.push(cosineDistance(embA, embB));
        } else {
          row.push(2); // Max distance
        }
      }
    }
    distanceMatrix.push(row);
  }

  // Run DBSCAN clustering
  const dbscan = new DBSCAN();
  const clusters = dbscan.run(distanceMatrix, epsilon, params.minPts);
  const noise = dbscan.noise || [];
  const outlierCount = noise.length;

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

  // Filter out clusters below minimum size
  const validClusters = clusters.filter(
    (cluster) => cluster && cluster.length >= params.minClusterSize,
  );

  // Recount outliers and merge small clusters into outliers
  let finalOutlierCount = outlierCount;
  for (const cluster of clusters) {
    if (cluster && cluster.length < params.minClusterSize) {
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

  // Relaxed parameters for smaller datasets (more lenient)
  if (achievementCount < 100) {
    return {
      minPts: 3,
      minClusterSize: 3,
      outlierThreshold: 0.7,
    };
  }

  // Medium datasets - very lenient for better initial clustering
  if (achievementCount < 300) {
    return {
      minPts: 3,
      minClusterSize: 3,
      outlierThreshold: 0.75,
    };
  }

  // Standard parameters for larger datasets (more strict)
  return {
    minPts: 5,
    minClusterSize: 5,
    outlierThreshold: 0.65,
  };
}
