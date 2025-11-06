import {
  decideShouldReCluster,
  incrementalAssignment,
  fullReclustering,
  updateWorkstreamCentroid,
  onAchievementWorkstreamChange,
} from 'lib/ai/workstreams';
import {
  achievement,
  user,
  workstream,
  workstreamMetadata,
  project,
} from '@/database/schema';
import { db } from '@/database/index';
import { eq } from 'drizzle-orm';
import {
  createMockUser,
  createMockProject,
  createMockAchievement,
  createMockWorkstream,
} from '../../helpers';

jest.mock('ai', () => ({
  embed: jest.fn(),
}));

const mockUser = createMockUser();
const mockProject = createMockProject(mockUser.id);

describe('Workstream Orchestration', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await db.delete(achievement);
    await db.delete(project);
    await db.delete(workstream);
    await db.delete(workstreamMetadata);
    await db.delete(user);

    await db.insert(user).values(mockUser);
    await db.insert(project).values(mockProject);
  });

  afterEach(async () => {
    await db.delete(achievement);
    await db.delete(project);
    await db.delete(workstream);
    await db.delete(workstreamMetadata);
    await db.delete(user);
  });

  describe('decideShouldReCluster', () => {
    it('returns full for initial clustering (no metadata)', () => {
      const decision = decideShouldReCluster(100, null);
      expect(decision.strategy).toBe('full');
      expect(decision.reason).toContain('initial');
    });

    it('returns full for +10% achievements', () => {
      const metadata = {
        id: 'meta-1',
        userId: mockUser.id,
        lastFullClusteringAt: new Date(),
        achievementCountAtLastClustering: 100,
        epsilon: 0.5,
        minPts: 5,
        workstreamCount: 8,
        outlierCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const decision = decideShouldReCluster(111, metadata);
      expect(decision.strategy).toBe('full');
    });

    it('returns full for +50 achievements', () => {
      const metadata = {
        id: 'meta-1',
        userId: mockUser.id,
        lastFullClusteringAt: new Date(),
        achievementCountAtLastClustering: 100,
        epsilon: 0.5,
        minPts: 5,
        workstreamCount: 8,
        outlierCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const decision = decideShouldReCluster(150, metadata);
      expect(decision.strategy).toBe('full');
    });

    it('returns full after 30+ days', () => {
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      const metadata = {
        id: 'meta-1',
        userId: mockUser.id,
        lastFullClusteringAt: thirtyOneDaysAgo,
        achievementCountAtLastClustering: 100,
        epsilon: 0.5,
        minPts: 5,
        workstreamCount: 8,
        outlierCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const decision = decideShouldReCluster(105, metadata);
      expect(decision.strategy).toBe('full');
    });

    it('returns incremental when no thresholds met', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10);

      const metadata = {
        id: 'meta-1',
        userId: mockUser.id,
        lastFullClusteringAt: recentDate,
        achievementCountAtLastClustering: 100,
        epsilon: 0.5,
        minPts: 5,
        workstreamCount: 8,
        outlierCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const decision = decideShouldReCluster(105, metadata);
      expect(decision.strategy).toBe('incremental');
    });
  });

  describe('incrementalAssignment', () => {
    it('assigns high-confidence matches', async () => {
      // Create a workstream with centroid
      const ws = createMockWorkstream(mockUser.id, {
        id: 'ws-1',
        centroidEmbedding: Array(1536)
          .fill(0)
          .map(() => Math.random()),
        centroidUpdatedAt: new Date(),
        achievementCount: 5,
      });

      // Create unassigned achievement with similar embedding
      const ach = createMockAchievement(mockUser.id, mockProject.id, {
        id: 'ach-1',
        title: 'New Achievement',
        embedding: ws.centroidEmbedding,
      });

      await db.insert(workstream).values(ws);
      await db.insert(achievement).values(ach);

      const result = await incrementalAssignment(mockUser.id, {
        minPts: 3,
        minClusterSize: 3,
        outlierThreshold: 0.7,
      });

      // High-confidence match should be assigned
      expect(result.assigned).toHaveLength(1);
    });

    it('leaves low-confidence unassigned', async () => {
      const ws = createMockWorkstream(mockUser.id, {
        id: 'ws-1',
        centroidEmbedding: Array(1536).fill(1),
        centroidUpdatedAt: new Date(),
        achievementCount: 5,
      });

      // Create unassigned achievement with very different embedding
      const ach = createMockAchievement(mockUser.id, mockProject.id, {
        id: 'ach-1',
        title: 'New Achievement',
        embedding: Array(1536).fill(0),
      });

      await db.insert(workstream).values(ws);
      await db.insert(achievement).values(ach);

      const result = await incrementalAssignment(mockUser.id, {
        minPts: 3,
        minClusterSize: 3,
        outlierThreshold: 0.7,
      });

      // Low-confidence should be unassigned
      expect(result.unassigned).toHaveLength(1);
    });

    it('handles no workstreams gracefully', async () => {
      // No workstreams exist
      const ach = createMockAchievement(mockUser.id, mockProject.id, {
        id: 'ach-1',
        title: 'Achievement',
        embedding: Array(1536).fill(0),
      });

      await db.insert(achievement).values(ach);

      const result = await incrementalAssignment(mockUser.id, {
        minPts: 3,
        minClusterSize: 3,
        outlierThreshold: 0.7,
      });

      expect(result).toHaveProperty('assigned');
      expect(result).toHaveProperty('unassigned');
    });

    it('returns assignments map', async () => {
      const ws = createMockWorkstream(mockUser.id, {
        id: 'ws-1',
        centroidEmbedding: Array(1536).fill(0),
        centroidUpdatedAt: new Date(),
        achievementCount: 0,
      });

      const ach = createMockAchievement(mockUser.id, mockProject.id, {
        id: 'ach-1',
        title: 'Achievement',
        embedding: Array(1536).fill(0),
      });

      await db.insert(workstream).values(ws);
      await db.insert(achievement).values(ach);

      const result = await incrementalAssignment(mockUser.id, {
        minPts: 3,
        minClusterSize: 3,
        outlierThreshold: 0.7,
      });

      expect(result.assignments instanceof Map).toBe(true);
    });
  });

  describe('fullReclustering', () => {
    it('archives old workstreams', async () => {
      const oldWs = createMockWorkstream(mockUser.id, {
        id: 'old-ws',
        name: 'Old Workstream',
        achievementCount: 5,
        centroidEmbedding: null,
        centroidUpdatedAt: null,
      });

      await db.insert(workstream).values(oldWs);

      // Add achievements for clustering
      for (let i = 0; i < 25; i++) {
        await db.insert(achievement).values(
          createMockAchievement(mockUser.id, mockProject.id, {
            id: `ach-${i}`,
            title: `Achievement ${i}`,
            embedding: Array(1536)
              .fill(0)
              .map(() => Math.random()),
          }),
        );
      }

      await fullReclustering(mockUser.id, mockUser as any);

      // Old workstream should be archived
      const archived = await db
        .select()
        .from(workstream)
        .where(eq(workstream.id, 'old-ws'));
      expect(archived[0]?.isArchived).toBe(true);
    });

    it('clears old assignments', async () => {
      const ws = createMockWorkstream(mockUser.id, {
        id: 'old-ws',
        name: 'Old',
        centroidEmbedding: null,
        centroidUpdatedAt: null,
        achievementCount: 5,
      });

      await db.insert(workstream).values(ws);

      // Add achievements assigned to old workstream
      for (let i = 0; i < 25; i++) {
        await db.insert(achievement).values(
          createMockAchievement(mockUser.id, mockProject.id, {
            id: `ach-${i}`,
            title: `Achievement ${i}`,
            workstreamId: i < 5 ? 'old-ws' : null,
            workstreamSource: i < 5 ? 'ai' : null,
            embedding: Array(1536)
              .fill(0)
              .map(() => Math.random()),
          }),
        );
      }

      await fullReclustering(mockUser.id, mockUser as any);

      // Old assignments should be cleared for non-user-assigned achievements
      const achs = await db.select().from(achievement);
      const oldAssignments = achs.filter((a) => a.workstreamId === 'old-ws');
      expect(oldAssignments.length).toBe(0);
    });

    it('respects user assignments', async () => {
      const ws = createMockWorkstream(mockUser.id, {
        id: 'user-ws',
        name: 'User Assigned',
        centroidEmbedding: null,
        centroidUpdatedAt: null,
        achievementCount: 5,
      });

      await db.insert(workstream).values(ws);

      // Add achievements, some user-assigned
      for (let i = 0; i < 25; i++) {
        await db.insert(achievement).values(
          createMockAchievement(mockUser.id, mockProject.id, {
            id: `ach-${i}`,
            title: `Achievement ${i}`,
            workstreamId: i === 0 ? 'user-ws' : null,
            workstreamSource: i === 0 ? 'user' : null,
            embedding: Array(1536)
              .fill(0)
              .map(() => Math.random()),
          }),
        );
      }

      await fullReclustering(mockUser.id, mockUser as any);

      // User-assigned achievement should not be cleared
      const userAssigned = await db
        .select()
        .from(achievement)
        .where(eq(achievement.id, 'ach-0'));
      expect(userAssigned[0]?.workstreamId).toBe('user-ws');
    });

    it('saves metadata', async () => {
      for (let i = 0; i < 25; i++) {
        await db.insert(achievement).values(
          createMockAchievement(mockUser.id, mockProject.id, {
            id: `ach-${i}`,
            title: `Achievement ${i}`,
            embedding: Array(1536)
              .fill(0)
              .map(() => Math.random()),
          }),
        );
      }

      const result = await fullReclustering(mockUser.id, mockUser as any);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.userId).toBe(mockUser.id);
      expect(typeof result.metadata.workstreamCount).toBe('number');
    });
  });

  describe('updateWorkstreamCentroid', () => {
    it('recalculates centroid correctly', async () => {
      const ws = createMockWorkstream(mockUser.id, {
        id: 'ws-1',
        centroidEmbedding: null,
        centroidUpdatedAt: null,
        achievementCount: 2,
      });

      await db.insert(workstream).values(ws);

      // Add achievements with embeddings
      const embedding1 = Array(1536).fill(1);
      const embedding2 = Array(1536).fill(3);

      for (let i = 0; i < 2; i++) {
        await db.insert(achievement).values(
          createMockAchievement(mockUser.id, mockProject.id, {
            id: `ach-${i}`,
            title: `Achievement ${i}`,
            workstreamId: 'ws-1',
            workstreamSource: 'ai',
            embedding: i === 0 ? embedding1 : embedding2,
          }),
        );
      }

      await updateWorkstreamCentroid('ws-1');

      const updated = await db
        .select()
        .from(workstream)
        .where(eq(workstream.id, 'ws-1'));
      expect(updated[0].centroidEmbedding).not.toBeNull();
      expect(updated[0].centroidUpdatedAt).not.toBeNull();
    });

    it('archives workstream if no achievements', async () => {
      const ws = createMockWorkstream(mockUser.id, {
        id: 'ws-1',
        name: 'Empty',
        centroidEmbedding: Array(1536).fill(0),
        centroidUpdatedAt: new Date(),
        achievementCount: 0,
      });

      await db.insert(workstream).values(ws);

      await updateWorkstreamCentroid('ws-1');

      const updated = await db
        .select()
        .from(workstream)
        .where(eq(workstream.id, 'ws-1'));
      expect(updated[0].isArchived).toBe(true);
    });
  });

  describe('onAchievementWorkstreamChange', () => {
    it('updates centroids for old and new workstreams', async () => {
      const oldWs = createMockWorkstream(mockUser.id, {
        id: 'old-ws',
        name: 'Old',
        centroidEmbedding: Array(1536).fill(0),
        centroidUpdatedAt: new Date(),
        achievementCount: 1,
      });

      const newWs = createMockWorkstream(mockUser.id, {
        id: 'new-ws',
        name: 'New',
        centroidEmbedding: null,
        centroidUpdatedAt: null,
        achievementCount: 0,
      });

      await db.insert(workstream).values(oldWs);
      await db.insert(workstream).values(newWs);

      const ach = createMockAchievement(mockUser.id, mockProject.id, {
        id: 'ach-1',
        title: 'Achievement',
        workstreamId: 'old-ws',
        workstreamSource: 'ai',
        embedding: Array(1536).fill(1),
      });

      await db.insert(achievement).values(ach);

      await onAchievementWorkstreamChange('ach-1', 'old-ws', 'new-ws');

      // Both workstreams should have updated centroids
      const oldWsUpdated = await db
        .select()
        .from(workstream)
        .where(eq(workstream.id, 'old-ws'));
      const newWsUpdated = await db
        .select()
        .from(workstream)
        .where(eq(workstream.id, 'new-ws'));

      expect(oldWsUpdated[0].centroidUpdatedAt).not.toBeNull();
      expect(newWsUpdated[0].centroidUpdatedAt).not.toBeNull();
    });
  });
});
