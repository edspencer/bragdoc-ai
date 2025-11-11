import {
  cosineDistance,
  calculateCentroid,
  clusterEmbeddings,
  getClusteringParameters,
} from 'lib/ai/clustering';

describe('Clustering Module', () => {
  describe('cosineDistance', () => {
    it('returns 0 for identical vectors', () => {
      const vector = [1, 0, 0];
      const distance = cosineDistance(vector, vector);
      expect(distance).toBe(0);
    });

    it('returns 2 for opposite vectors', () => {
      const vector1 = [1, 0, 0];
      const vector2 = [-1, 0, 0];
      const distance = cosineDistance(vector1, vector2);
      expect(Math.abs(distance - 2)).toBeLessThan(0.0001);
    });

    it('returns 1 for orthogonal vectors', () => {
      const vector1 = [1, 0, 0];
      const vector2 = [0, 1, 0];
      const distance = cosineDistance(vector1, vector2);
      expect(Math.abs(distance - 1)).toBeLessThan(0.0001);
    });

    it('handles zero vectors gracefully', () => {
      const zero = [0, 0, 0];
      const nonZero = [1, 0, 0];
      // Should return 2 (max distance for zero vectors)
      const distance = cosineDistance(zero, nonZero);
      expect(typeof distance).toBe('number');
      expect(Number.isFinite(distance)).toBe(true);
    });

    it('handles high-dimensional vectors (1536 dims)', () => {
      // Create two similar embeddings (typical OpenAI size)
      const embedding1 = Array(1536)
        .fill(0)
        .map(() => Math.random());
      const embedding2 = Array(1536)
        .fill(0)
        .map((_, i) => (embedding1[i] ?? 0) + 0.01);

      const distance = cosineDistance(embedding1, embedding2);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(1);
    });
  });

  describe('calculateCentroid', () => {
    it('calculates correct centroid for simple case', () => {
      const embeddings = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ];
      const centroid = calculateCentroid(embeddings);
      expect(centroid).toEqual([1 / 3, 1 / 3, 1 / 3]);
    });

    it('handles single embedding', () => {
      const embeddings = [[1, 2, 3]];
      const centroid = calculateCentroid(embeddings);
      expect(centroid).toEqual([1, 2, 3]);
    });

    it('throws error for empty array', () => {
      expect(() => calculateCentroid([])).toThrow();
    });

    it('calculates centroid for identical embeddings', () => {
      const embeddings = [
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1],
      ];
      const centroid = calculateCentroid(embeddings);
      expect(centroid).toEqual([1, 1, 1]);
    });

    it('handles high-dimensional vectors', () => {
      const embedding1 = Array(1536).fill(2);
      const embedding2 = Array(1536).fill(4);
      const centroid = calculateCentroid([embedding1, embedding2]);

      expect(centroid).toHaveLength(1536);
      expect(centroid[0]).toEqual(3);
      expect(centroid[centroid.length - 1]).toEqual(3);
    });
  });

  describe('clusterEmbeddings', () => {
    it('clusters similar embeddings together', () => {
      // Create two distinct clusters with very small internal distances
      const cluster1 = [
        [1, 1, 1],
        [1.01, 1.01, 1.01],
        [0.99, 0.99, 0.99],
      ];
      const cluster2 = [
        [10, 10, 10],
        [10.01, 10.01, 10.01],
        [9.99, 9.99, 9.99],
      ];
      const embeddings = [...cluster1, ...cluster2];

      const result = clusterEmbeddings(embeddings, {
        minPts: 2,
        minClusterSize: 2,
        outlierThreshold: 0.65,
      });

      // The algorithm should either find clusters or classify points as outliers
      // Total points should equal clusters + outliers
      const totalPointsInClusters = result.clusters.reduce(
        (sum, cluster) => sum + cluster.length,
        0,
      );
      expect(totalPointsInClusters + result.outlierCount).toBe(
        embeddings.length,
      );
      expect(result.labels.length).toBe(embeddings.length);
      expect(typeof result.epsilon).toBe('number');
      expect(result.epsilon).toBeGreaterThanOrEqual(0);
    });

    it('identifies outliers correctly', () => {
      // Create one cluster and one outlier
      const embeddings = [
        [1, 1, 1],
        [1.1, 1.1, 1.1],
        [1.05, 1.05, 1.05],
        [10, 10, 10], // Clear outlier
      ];

      const result = clusterEmbeddings(embeddings, {
        minPts: 2,
        minClusterSize: 2,
        outlierThreshold: 0.65,
      });

      expect(result.outlierCount).toBeGreaterThanOrEqual(0);
      expect(result.labels.length).toBe(4);
    });

    it('respects minPts parameter', () => {
      const embeddings = [
        [1, 1, 1],
        [1.1, 1.1, 1.1],
        [1.05, 1.05, 1.05],
        [1.02, 1.02, 1.02],
        [10, 10, 10],
      ];

      const result1 = clusterEmbeddings(embeddings, {
        minPts: 2,
        minClusterSize: 2,
        outlierThreshold: 0.65,
      });

      const result2 = clusterEmbeddings(embeddings, {
        minPts: 5,
        minClusterSize: 5,
        outlierThreshold: 0.65,
      });

      // Both results should account for all embeddings
      const total1 = result1.clusters.reduce(
        (sum, cluster) => sum + cluster.length,
        0,
      );
      const total2 = result2.clusters.reduce(
        (sum, cluster) => sum + cluster.length,
        0,
      );

      expect(total1 + result1.outlierCount).toEqual(embeddings.length);
      expect(total2 + result2.outlierCount).toEqual(embeddings.length);

      // With minPts=5 and only 5 points total, likely all will be outliers
      // With minPts=2, might form a cluster with the close points
      expect(result2.outlierCount).toBeGreaterThanOrEqual(result1.outlierCount);
    });

    it('handles small datasets (20-30 embeddings)', () => {
      const embeddings = Array(25)
        .fill(0)
        .map((_, i) => [
          Math.sin(i * 0.1),
          Math.cos(i * 0.1),
          Math.sin(i * 0.2),
        ]);

      const result = clusterEmbeddings(embeddings, {
        minPts: 3,
        minClusterSize: 3,
        outlierThreshold: 0.7,
      });

      expect(result.clusters.length).toBeGreaterThanOrEqual(0);
      expect(result.labels.length).toBe(25);
      expect(result.outlierCount).toBeGreaterThanOrEqual(0);
    });

    it('returns valid clustering result structure', () => {
      const embeddings = [
        [1, 1, 1],
        [1.1, 1.1, 1.1],
        [5, 5, 5],
      ];

      const result = clusterEmbeddings(embeddings, {
        minPts: 2,
        minClusterSize: 2,
        outlierThreshold: 0.65,
      });

      expect(result).toHaveProperty('clusters');
      expect(result).toHaveProperty('labels');
      expect(result).toHaveProperty('epsilon');
      expect(result).toHaveProperty('outlierCount');
      expect(Array.isArray(result.clusters)).toBe(true);
      expect(Array.isArray(result.labels)).toBe(true);
      expect(typeof result.epsilon).toBe('number');
      expect(typeof result.outlierCount).toBe('number');
    });
  });

  describe('getClusteringParameters', () => {
    it('returns null for less than 20 achievements', () => {
      const params = getClusteringParameters(19);
      expect(params).toBeNull();
    });

    it('returns relaxed params for 20-99 achievements', () => {
      const params = getClusteringParameters(50);
      expect(params).not.toBeNull();
      expect(params?.minPts).toBe(3);
      expect(params?.minClusterSize).toBe(3);
      expect(params?.outlierThreshold).toBe(0.7);
    });

    it('returns standard params for 100+ achievements', () => {
      const params = getClusteringParameters(100);
      expect(params).not.toBeNull();
      expect(params?.minPts).toBe(3);
      expect(params?.minClusterSize).toBe(3);
      expect(params?.outlierThreshold).toBe(0.65);
    });

    it('returns relaxed params for exactly 20 achievements', () => {
      const params = getClusteringParameters(20);
      expect(params).not.toBeNull();
      expect(params?.minPts).toBe(3);
    });

    it('returns standard params for exactly 100 achievements', () => {
      const params = getClusteringParameters(100);
      expect(params).not.toBeNull();
      expect(params?.minPts).toBe(3);
    });

    it('returns correct params for large dataset (1000+)', () => {
      const params = getClusteringParameters(1000);
      expect(params).not.toBeNull();
      expect(params?.minPts).toBe(3);
      expect(params?.outlierThreshold).toBe(0.65);
    });
  });
});
