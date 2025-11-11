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
  company,
} from '@/database/schema';
import { db } from '@/database/index';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

jest.mock('ai', () => ({
  embed: jest.fn(),
}));

const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  provider: 'credentials',
};

const mockProject = {
  id: '123e4567-e89b-12d3-a456-426614174100',
  userId: mockUser.id,
  name: 'Test Project',
  description: 'Test Description',
  startDate: new Date('2025-01-01'),
  endDate: null,
};

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
      expect(decision.reason.toLowerCase()).toContain('initial');
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
      const ws = {
        id: '323e4567-e89b-12d3-a456-426614174001',
        userId: mockUser.id,
        name: 'Test Workstream',
        description: null,
        color: '#3B82F6',
        centroidEmbedding: Array(1536)
          .fill(0)
          .map(() => Math.random()),
        centroidUpdatedAt: new Date(),
        achievementCount: 5,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create unassigned achievement with similar embedding
      const ach = {
        id: '423e4567-e89b-12d3-a456-426614174001',
        userId: mockUser.id,
        projectId: mockProject.id,
        title: 'New Achievement',
        summary: 'Summary',
        details: null,
        impact: 2,
        source: 'manual' as const,
        eventDuration: 'week' as const,
        eventStart: new Date(),
        eventEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isArchived: false,
        workstreamId: null,
        workstreamSource: null,
        embedding: ws.centroidEmbedding,
        embeddingModel: 'text-embedding-3-small',
        embeddingGeneratedAt: new Date(),
      };

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
      const ws = {
        id: '323e4567-e89b-12d3-a456-426614174001',
        userId: mockUser.id,
        name: 'Test Workstream',
        description: null,
        color: '#3B82F6',
        centroidEmbedding: Array(1536).fill(1),
        centroidUpdatedAt: new Date(),
        achievementCount: 5,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create unassigned achievement with very different embedding
      const ach = {
        id: '423e4567-e89b-12d3-a456-426614174001',
        userId: mockUser.id,
        projectId: mockProject.id,
        title: 'New Achievement',
        summary: 'Summary',
        details: null,
        impact: 2,
        source: 'manual' as const,
        eventDuration: 'week' as const,
        eventStart: new Date(),
        eventEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isArchived: false,
        workstreamId: null,
        workstreamSource: null,
        embedding: Array(1536).fill(0),
        embeddingModel: 'text-embedding-3-small',
        embeddingGeneratedAt: new Date(),
      };

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
      const ach = {
        id: '423e4567-e89b-12d3-a456-426614174001',
        userId: mockUser.id,
        projectId: mockProject.id,
        title: 'Achievement',
        summary: 'Summary',
        details: null,
        impact: 2,
        source: 'manual' as const,
        eventDuration: 'week' as const,
        eventStart: new Date(),
        eventEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isArchived: false,
        workstreamId: null,
        workstreamSource: null,
        embedding: Array(1536).fill(0),
        embeddingModel: 'text-embedding-3-small',
        embeddingGeneratedAt: new Date(),
      };

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
      const ws = {
        id: '323e4567-e89b-12d3-a456-426614174001',
        userId: mockUser.id,
        name: 'Test',
        description: null,
        color: '#3B82F6',
        centroidEmbedding: Array(1536).fill(0),
        centroidUpdatedAt: new Date(),
        achievementCount: 0,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const ach = {
        id: '423e4567-e89b-12d3-a456-426614174001',
        userId: mockUser.id,
        projectId: mockProject.id,
        title: 'Achievement',
        summary: 'Summary',
        details: null,
        impact: 2,
        source: 'manual' as const,
        eventDuration: 'week' as const,
        eventStart: new Date(),
        eventEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isArchived: false,
        workstreamId: null,
        workstreamSource: null,
        embedding: Array(1536).fill(0),
        embeddingModel: 'text-embedding-3-small',
        embeddingGeneratedAt: new Date(),
      };

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
      const oldWsId = uuidv4();
      const oldWs = {
        id: oldWsId,
        userId: mockUser.id,
        name: 'Old Workstream',
        description: null,
        color: '#3B82F6',
        centroidEmbedding: null,
        centroidUpdatedAt: null,
        achievementCount: 5,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.insert(workstream).values(oldWs);

      // Add achievements for clustering
      for (let i = 0; i < 25; i++) {
        await db.insert(achievement).values({
          id: uuidv4(),
          userId: mockUser.id,
          projectId: mockProject.id,
          title: `Achievement ${i}`,
          summary: 'Summary',
          details: null,
          impact: 2,
          eventDuration: 'week' as const,
          eventStart: new Date(),
          eventEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isArchived: false,
          workstreamId: null,
          workstreamSource: null,
          embedding: Array(1536)
            .fill(0)
            .map(() => Math.random()),
          embeddingModel: 'text-embedding-3-small',
          embeddingGeneratedAt: new Date(),
        });
      }

      const result = await fullReclustering(mockUser.id, mockUser as any);

      // Old workstream should be archived
      const archived = await db
        .select()
        .from(workstream)
        .where(eq(workstream.id, oldWsId));
      expect(archived[0]?.isArchived).toBe(true);
    });

    it('clears old assignments', async () => {
      const oldWsId = uuidv4();
      const ws = {
        id: oldWsId,
        userId: mockUser.id,
        name: 'Old',
        description: null,
        color: '#3B82F6',
        centroidEmbedding: null,
        centroidUpdatedAt: null,
        achievementCount: 5,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.insert(workstream).values(ws);

      // Add achievements assigned to old workstream
      for (let i = 0; i < 25; i++) {
        await db.insert(achievement).values({
          id: uuidv4(),
          userId: mockUser.id,
          projectId: mockProject.id,
          title: `Achievement ${i}`,
          summary: 'Summary',
          details: null,
          impact: 2,
          eventDuration: 'week' as const,
          eventStart: new Date(),
          eventEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isArchived: false,
          workstreamId: i < 5 ? oldWsId : null,
          workstreamSource: i < 5 ? 'ai' : null,
          embedding: Array(1536)
            .fill(0)
            .map(() => Math.random()),
          embeddingModel: 'text-embedding-3-small',
          embeddingGeneratedAt: new Date(),
        });
      }

      const result = await fullReclustering(mockUser.id, mockUser as any);

      // Old assignments should be cleared for non-user-assigned achievements
      const achs = await db.select().from(achievement);
      const oldAssignments = achs.filter((a) => a.workstreamId === oldWsId);
      expect(oldAssignments.length).toBe(0);
    });

    it.skip('respects user assignments', async () => {
      const userWsId = uuidv4();
      const ws = {
        id: userWsId,
        userId: mockUser.id,
        name: 'User Assigned',
        description: null,
        color: '#3B82F6',
        centroidEmbedding: null,
        centroidUpdatedAt: null,
        achievementCount: 5,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.insert(workstream).values(ws);

      // Add achievements, some user-assigned
      let userAssignedAchievementId: string | undefined;
      for (let i = 0; i < 25; i++) {
        const achId = uuidv4();
        if (i === 0) {
          userAssignedAchievementId = achId;
        }
        await db.insert(achievement).values({
          id: achId,
          userId: mockUser.id,
          projectId: mockProject.id,
          title: `Achievement ${i}`,
          summary: 'Summary',
          details: null,
          impact: 2,
          eventDuration: 'week' as const,
          eventStart: new Date(),
          eventEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isArchived: false,
          workstreamId: i === 0 ? userWsId : null,
          workstreamSource: i === 0 ? 'user' : null,
          embedding: Array(1536)
            .fill(0)
            .map(() => Math.random()),
          embeddingModel: 'text-embedding-3-small',
          embeddingGeneratedAt: new Date(),
        });
      }

      const result = await fullReclustering(mockUser.id, mockUser as any);

      // User-assigned achievement should not be cleared
      const userAssigned = await db
        .select()
        .from(achievement)
        .where(eq(achievement.id, userAssignedAchievementId!));
      expect(userAssigned[0]?.workstreamId).toBe(userWsId);
    });

    it('saves metadata', async () => {
      for (let i = 0; i < 25; i++) {
        await db.insert(achievement).values({
          id: uuidv4(),
          userId: mockUser.id,
          projectId: mockProject.id,
          title: `Achievement ${i}`,
          summary: 'Summary',
          details: null,
          impact: 2,
          eventDuration: 'week' as const,
          eventStart: new Date(),
          eventEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isArchived: false,
          workstreamId: null,
          workstreamSource: null,
          embedding: Array(1536)
            .fill(0)
            .map(() => Math.random()),
          embeddingModel: 'text-embedding-3-small',
          embeddingGeneratedAt: new Date(),
        });
      }

      const result = await fullReclustering(mockUser.id, mockUser as any);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.userId).toBe(mockUser.id);
      expect(typeof result.metadata.workstreamCount).toBe('number');
    });
  });

  describe('updateWorkstreamCentroid', () => {
    it('recalculates centroid correctly', async () => {
      const wsId = uuidv4();
      const ws = {
        id: wsId,
        userId: mockUser.id,
        name: 'Test',
        description: null,
        color: '#3B82F6',
        centroidEmbedding: null,
        centroidUpdatedAt: null,
        achievementCount: 2,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.insert(workstream).values(ws);

      // Add achievements with embeddings
      const embedding1 = Array(1536).fill(1);
      const embedding2 = Array(1536).fill(3);

      for (let i = 0; i < 2; i++) {
        await db.insert(achievement).values({
          id: uuidv4(),
          userId: mockUser.id,
          projectId: mockProject.id,
          title: `Achievement ${i}`,
          summary: 'Summary',
          details: null,
          impact: 2,
          eventDuration: 'week' as const,
          eventStart: new Date(),
          eventEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isArchived: false,
          workstreamId: wsId,
          workstreamSource: 'ai',
          embedding: i === 0 ? embedding1 : embedding2,
          embeddingModel: 'text-embedding-3-small',
          embeddingGeneratedAt: new Date(),
        });
      }

      await updateWorkstreamCentroid(wsId);

      const updated = await db
        .select()
        .from(workstream)
        .where(eq(workstream.id, wsId));
      expect(updated[0]?.centroidEmbedding).not.toBeNull();
      expect(updated[0]?.centroidUpdatedAt).not.toBeNull();
    });

    it('archives workstream if no achievements', async () => {
      const wsId = uuidv4();
      const ws = {
        id: wsId,
        userId: mockUser.id,
        name: 'Empty',
        description: null,
        color: '#3B82F6',
        centroidEmbedding: Array(1536).fill(0),
        centroidUpdatedAt: new Date(),
        achievementCount: 0,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.insert(workstream).values(ws);

      await updateWorkstreamCentroid(wsId);

      const updated = await db
        .select()
        .from(workstream)
        .where(eq(workstream.id, wsId));
      expect(updated[0]?.isArchived).toBe(true);
    });
  });

  describe('onAchievementWorkstreamChange', () => {
    it('updates centroids for old and new workstreams', async () => {
      const oldWsId = uuidv4();
      const newWsId = uuidv4();
      const achId = uuidv4();

      const oldWs = {
        id: oldWsId,
        userId: mockUser.id,
        name: 'Old',
        description: null,
        color: '#3B82F6',
        centroidEmbedding: Array(1536).fill(0),
        centroidUpdatedAt: new Date(),
        achievementCount: 1,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newWs = {
        id: newWsId,
        userId: mockUser.id,
        name: 'New',
        description: null,
        color: '#3B82F6',
        centroidEmbedding: null,
        centroidUpdatedAt: null,
        achievementCount: 0,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.insert(workstream).values(oldWs);
      await db.insert(workstream).values(newWs);

      const ach = {
        id: achId,
        userId: mockUser.id,
        projectId: mockProject.id,
        title: 'Achievement',
        summary: 'Summary',
        details: null,
        impact: 2,
        source: 'manual' as const,
        eventDuration: 'week' as const,
        eventStart: new Date(),
        eventEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isArchived: false,
        workstreamId: oldWsId,
        workstreamSource: 'ai',
        embedding: Array(1536).fill(1),
        embeddingModel: 'text-embedding-3-small',
        embeddingGeneratedAt: new Date(),
      };

      await db.insert(achievement).values(ach);

      // Move the achievement to the new workstream
      await db
        .update(achievement)
        .set({ workstreamId: newWsId })
        .where(eq(achievement.id, achId));

      await onAchievementWorkstreamChange(achId, oldWsId, newWsId);

      // Both workstreams should have updated centroids
      const oldWsUpdated = await db
        .select()
        .from(workstream)
        .where(eq(workstream.id, oldWsId));
      const newWsUpdated = await db
        .select()
        .from(workstream)
        .where(eq(workstream.id, newWsId));

      expect(oldWsUpdated[0]?.centroidUpdatedAt).not.toBeNull();
      expect(newWsUpdated[0]?.centroidUpdatedAt).not.toBeNull();
    });
  });
});

describe('Helper Functions: getAchievementSummaries, buildAssignmentBreakdown, buildWorkstreamBreakdown', () => {
  const mockCompany = {
    id: '123e4567-e89b-12d3-a456-426614174200',
    userId: mockUser.id,
    name: 'Test Company',
    domain: 'test.com',
    role: 'Software Engineer',
    startDate: new Date('2023-01-01'),
    endDate: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await db.delete(achievement);
    await db.delete(project);
    await db.delete(workstream);
    await db.delete(workstreamMetadata);
    await db.delete(user);

    await db.insert(user).values(mockUser);
    await db.insert(project).values(mockProject);
    // @ts-ignore
    await db.insert(company).values(mockCompany);
  });

  afterEach(async () => {
    await db.delete(achievement);
    await db.delete(project);
    await db.delete(workstream);
    await db.delete(workstreamMetadata);
    // @ts-ignore
    await db.delete(company);
    await db.delete(user);
  });

  describe('getAchievementSummaries', () => {
    const { getAchievementSummaries } = require('lib/ai/workstreams');

    it('returns empty array for empty achievementIds', async () => {
      const result = await getAchievementSummaries([], mockUser.id);
      expect(result).toEqual([]);
    });

    it('retrieves achievements with project and company context', async () => {
      const achievementId = uuidv4();
      await db.insert(achievement).values({
        id: achievementId,
        userId: mockUser.id,
        title: 'Test Achievement',
        summary: 'Test Summary',
        details: null,
        impact: 3,
        source: 'manual' as const,
        eventDuration: 'week' as const,
        eventStart: new Date('2025-01-01'),
        eventEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isArchived: false,
        embedding: Array(1536)
          .fill(0)
          .map(() => Math.random()),
        embeddingModel: 'text-embedding-3-small',
        embeddingGeneratedAt: new Date(),
        workstreamId: null,
        companyId: mockCompany.id,
        projectId: mockProject.id,
      });

      const result = await getAchievementSummaries(
        [achievementId],
        mockUser.id,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: achievementId,
        title: 'Test Achievement',
        summary: 'Test Summary',
        impact: 3,
        projectId: mockProject.id,
        projectName: mockProject.name,
        companyId: mockCompany.id,
        companyName: mockCompany.name,
      });
      expect(result[0].eventStart).toEqual(new Date('2025-01-01'));
    });

    it('returns null for project/company when not assigned', async () => {
      const achievementId = uuidv4();
      await db.insert(achievement).values({
        id: achievementId,
        userId: mockUser.id,
        projectId: null,
        companyId: null,
        title: 'Standalone Achievement',
        summary: 'No project or company',
        details: null,
        impact: 2,
        source: 'manual' as const,
        eventDuration: 'week' as const,
        eventStart: new Date('2025-01-01'),
        eventEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isArchived: false,
        embedding: Array(1536)
          .fill(0)
          .map(() => Math.random()),
        embeddingModel: 'text-embedding-3-small',
        embeddingGeneratedAt: new Date(),
        workstreamId: null,
      });

      const result = await getAchievementSummaries(
        [achievementId],
        mockUser.id,
      );

      expect(result).toHaveLength(1);
      expect(result[0].projectId).toBeNull();
      expect(result[0].projectName).toBeNull();
      expect(result[0].companyId).toBeNull();
      expect(result[0].companyName).toBeNull();
    });

    it('scopes results by userId (security)', async () => {
      const anotherUserId = uuidv4();
      const achievementId = uuidv4();

      // First create the other user to satisfy foreign key constraint
      await db.insert(user).values({
        id: anotherUserId,
        email: 'other@example.com',
        provider: 'credentials',
      });

      await db.insert(achievement).values({
        id: achievementId,
        userId: anotherUserId,
        projectId: null,
        companyId: null,
        title: 'Other User Achievement',
        summary: 'Should not be accessible',
        details: null,
        impact: 2,
        source: 'manual' as const,
        eventDuration: 'week' as const,
        eventStart: new Date(),
        eventEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isArchived: false,
        embedding: Array(1536)
          .fill(0)
          .map(() => Math.random()),
        embeddingModel: 'text-embedding-3-small',
        embeddingGeneratedAt: new Date(),
        workstreamId: null,
      });

      // Try to fetch with wrong user ID
      const result = await getAchievementSummaries(
        [achievementId],
        mockUser.id,
      );
      expect(result).toHaveLength(0);
    });

    it('retrieves multiple achievements', async () => {
      const ids = Array.from({ length: 5 }, () => uuidv4());

      for (const id of ids) {
        await db.insert(achievement).values({
          id,
          userId: mockUser.id,
          projectId: mockProject.id,
          companyId: null,
          title: `Achievement ${id}`,
          summary: 'Summary',
          details: null,
          impact: 2,
          source: 'manual' as const,
          eventDuration: 'week' as const,
          eventStart: new Date(),
          eventEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isArchived: false,
          embedding: Array(1536)
            .fill(0)
            .map(() => Math.random()),
          embeddingModel: 'text-embedding-3-small',
          embeddingGeneratedAt: new Date(),
          workstreamId: null,
        });
      }

      const result = await getAchievementSummaries(ids, mockUser.id);
      expect(result).toHaveLength(5);
      expect(result.map((r: { id: string }) => r.id)).toEqual(
        expect.arrayContaining(ids),
      );
    });
  });

  describe('buildAssignmentBreakdown', () => {
    const { buildAssignmentBreakdown } = require('lib/ai/workstreams');

    it('returns empty array for empty assignments', async () => {
      const result = await buildAssignmentBreakdown(
        new Map<string, string>(),
        mockUser.id,
      );
      expect(result).toEqual([]);
    });

    it('groups achievements by workstream', async () => {
      // Create workstreams
      const ws1Id = uuidv4();
      const ws2Id = uuidv4();

      await db.insert(workstream).values({
        id: ws1Id,
        userId: mockUser.id,
        name: 'Workstream 1',
        description: null,
        color: '#FF6B6B',
        centroidEmbedding: Array(1536)
          .fill(0)
          .map(() => Math.random()),
        achievementCount: 3,
        centroidUpdatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.insert(workstream).values({
        id: ws2Id,
        userId: mockUser.id,
        name: 'Workstream 2',
        description: null,
        color: '#4ECDC4',
        centroidEmbedding: Array(1536)
          .fill(0)
          .map(() => Math.random()),
        achievementCount: 2,
        centroidUpdatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create achievements
      const ach1 = uuidv4();
      const ach2 = uuidv4();
      const ach3 = uuidv4();
      const ach4 = uuidv4();
      const ach5 = uuidv4();

      for (const achId of [ach1, ach2, ach3, ach4, ach5]) {
        await db.insert(achievement).values({
          id: achId,
          userId: mockUser.id,
          projectId: mockProject.id,
          companyId: null,
          title: `Achievement ${achId}`,
          summary: 'Summary',
          details: null,
          impact: 2,
          source: 'manual' as const,
          eventDuration: 'week' as const,
          eventStart: new Date(),
          eventEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isArchived: false,
          embedding: Array(1536)
            .fill(0)
            .map(() => Math.random()),
          embeddingModel: 'text-embedding-3-small',
          embeddingGeneratedAt: new Date(),
          workstreamId: null,
        });
      }

      // Create assignment map: ach1, ach2, ach3 -> ws1; ach4, ach5 -> ws2
      const assignments = new Map<string, string>([
        [ach1, ws1Id],
        [ach2, ws1Id],
        [ach3, ws1Id],
        [ach4, ws2Id],
        [ach5, ws2Id],
      ]);

      const result = await buildAssignmentBreakdown(assignments, mockUser.id);

      expect(result).toHaveLength(2);
      // Should be sorted by achievement count (descending)
      expect(result[0].achievements).toHaveLength(3);
      expect(result[1].achievements).toHaveLength(2);
      expect(result[0].workstreamName).toBe('Workstream 1');
      expect(result[1].workstreamName).toBe('Workstream 2');
    });

    it('populates achievement details in each workstream group', async () => {
      const wsId = uuidv4();

      await db.insert(workstream).values({
        id: wsId,
        userId: mockUser.id,
        name: 'Test Workstream',
        description: null,
        color: '#FF6B6B',
        centroidEmbedding: Array(1536)
          .fill(0)
          .map(() => Math.random()),
        achievementCount: 1,
        centroidUpdatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const achId = uuidv4();
      await db.insert(achievement).values({
        id: achId,
        userId: mockUser.id,
        projectId: mockProject.id,
        companyId: mockCompany.id,
        title: 'Test Achievement',
        summary: 'Test Summary',
        details: null,
        impact: 4,
        source: 'manual' as const,
        eventDuration: 'week' as const,
        eventStart: new Date('2025-01-15'),
        eventEnd: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isArchived: false,
        embedding: Array(1536)
          .fill(0)
          .map(() => Math.random()),
        embeddingModel: 'text-embedding-3-small',
        embeddingGeneratedAt: new Date(),
        workstreamId: null,
      });

      const assignments = new Map<string, string>([[achId, wsId]]);
      const result = await buildAssignmentBreakdown(assignments, mockUser.id);

      expect(result).toHaveLength(1);
      expect(result[0].achievements).toHaveLength(1);
      expect(result[0].achievements[0]).toMatchObject({
        id: achId,
        title: 'Test Achievement',
        summary: 'Test Summary',
        impact: 4,
        projectName: mockProject.name,
        companyName: mockCompany.name,
      });
    });
  });

  describe('buildWorkstreamBreakdown', () => {
    const { buildWorkstreamBreakdown } = require('lib/ai/workstreams');

    it('returns empty array for empty workstreams', async () => {
      const result = await buildWorkstreamBreakdown([], mockUser.id);
      expect(result).toEqual([]);
    });

    it('formats new workstreams with their achievements', async () => {
      const wsId = uuidv4();

      const createdWorkstream = {
        id: wsId,
        userId: mockUser.id,
        name: 'New Workstream',
        description: null,
        color: '#FF6B6B',
        centroidEmbedding: Array(1536)
          .fill(0)
          .map(() => Math.random()),
        achievementCount: 2,
        centroidUpdatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // First insert the workstream to satisfy foreign key constraints
      await db.insert(workstream).values({
        id: wsId,
        userId: mockUser.id,
        name: 'New Workstream',
        description: null,
        color: '#FF6B6B',
        centroidEmbedding: Array(1536)
          .fill(0)
          .map(() => Math.random()),
        achievementCount: 2,
        centroidUpdatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create achievements
      const ach1 = uuidv4();
      const ach2 = uuidv4();

      for (const achId of [ach1, ach2]) {
        await db.insert(achievement).values({
          id: achId,
          userId: mockUser.id,
          projectId: mockProject.id,
          companyId: null,
          title: `Achievement ${achId}`,
          summary: 'Summary',
          details: null,
          impact: 2,
          source: 'manual' as const,
          eventDuration: 'week' as const,
          eventStart: new Date(),
          eventEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isArchived: false,
          embedding: Array(1536)
            .fill(0)
            .map(() => Math.random()),
          embeddingModel: 'text-embedding-3-small',
          embeddingGeneratedAt: new Date(),
          workstreamId: wsId,
        });
      }

      const result = await buildWorkstreamBreakdown(
        [createdWorkstream as any],
        mockUser.id,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        workstreamId: wsId,
        workstreamName: 'New Workstream',
        workstreamColor: '#FF6B6B',
        isNew: true,
      });
      expect(result[0].achievements).toHaveLength(2);
    });

    it('sorts workstreams by achievement count (descending)', async () => {
      const ws1Id = uuidv4();
      const ws2Id = uuidv4();

      const ws1 = {
        id: ws1Id,
        userId: mockUser.id,
        name: 'Workstream 1',
        description: null,
        color: '#FF6B6B',
        centroidEmbedding: Array(1536)
          .fill(0)
          .map(() => Math.random()),
        achievementCount: 2,
        centroidUpdatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const ws2 = {
        id: ws2Id,
        userId: mockUser.id,
        name: 'Workstream 2',
        description: null,
        color: '#4ECDC4',
        centroidEmbedding: Array(1536)
          .fill(0)
          .map(() => Math.random()),
        achievementCount: 5,
        centroidUpdatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // First insert workstreams to satisfy foreign key constraints
      await db.insert(workstream).values([ws1, ws2]);

      // Create achievements for ws1 (2 achievements)
      for (let i = 0; i < 2; i++) {
        const achId = uuidv4();
        await db.insert(achievement).values({
          id: achId,
          userId: mockUser.id,
          projectId: mockProject.id,
          companyId: null,
          title: `WS1 Achievement ${i}`,
          summary: 'Summary',
          details: null,
          impact: 2,
          source: 'manual' as const,
          eventDuration: 'week' as const,
          eventStart: new Date(),
          eventEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isArchived: false,
          embedding: Array(1536)
            .fill(0)
            .map(() => Math.random()),
          embeddingModel: 'text-embedding-3-small',
          embeddingGeneratedAt: new Date(),
          workstreamId: ws1Id,
        });
      }

      // Create achievements for ws2 (5 achievements)
      for (let i = 0; i < 5; i++) {
        const achId = uuidv4();
        await db.insert(achievement).values({
          id: achId,
          userId: mockUser.id,
          projectId: mockProject.id,
          companyId: null,
          title: `WS2 Achievement ${i}`,
          summary: 'Summary',
          details: null,
          impact: 2,
          source: 'manual' as const,
          eventDuration: 'week' as const,
          eventStart: new Date(),
          eventEnd: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          isArchived: false,
          embedding: Array(1536)
            .fill(0)
            .map(() => Math.random()),
          embeddingModel: 'text-embedding-3-small',
          embeddingGeneratedAt: new Date(),
          workstreamId: ws2Id,
        });
      }

      const result = await buildWorkstreamBreakdown(
        [ws1 as any, ws2 as any],
        mockUser.id,
      );

      expect(result).toHaveLength(2);
      // WS2 should be first (5 achievements > 2 achievements)
      expect(result[0].workstreamName).toBe('Workstream 2');
      expect(result[0].achievements).toHaveLength(5);
      expect(result[1].workstreamName).toBe('Workstream 1');
      expect(result[1].achievements).toHaveLength(2);
    });

    it('marks all workstreams as isNew=true', async () => {
      const wsId = uuidv4();

      const workstream = {
        id: wsId,
        userId: mockUser.id,
        name: 'New Workstream',
        description: null,
        color: '#FF6B6B',
        centroidEmbedding: Array(1536)
          .fill(0)
          .map(() => Math.random()),
        achievementCount: 0,
        centroidUpdatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await buildWorkstreamBreakdown(
        [workstream as any],
        mockUser.id,
      );

      expect(result).toHaveLength(1);
      expect(result[0].isNew).toBe(true);
    });
  });
});
