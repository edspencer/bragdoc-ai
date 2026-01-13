import type { User, Project, Achievement, Workstream } from '@/database/schema';

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    password: null,
    name: 'Test User',
    image: null,
    provider: 'credentials',
    providerId: null,
    preferences: { language: 'en', documentInstructions: '' },
    createdAt: new Date(),
    updatedAt: new Date(),
    emailVerified: false,
    level: 'free',
    renewalPeriod: 'monthly',
    lastPayment: null,
    status: 'active',
    stripeCustomerId: null,
    tosAcceptedAt: null,
    demoUserId: null,
    isDemo: false,
    ...overrides,
  };
}

export function createMockProject(
  userId: string,
  overrides: Partial<Project> = {},
): Project {
  return {
    id: '123e4567-e89b-12d3-a456-426614174100',
    userId,
    companyId: null,
    name: 'Test Project',
    description: 'Test Description',
    status: 'active',
    color: '#3B82F6',
    startDate: new Date('2025-01-01'),
    endDate: null,
    repoRemoteUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockAchievement(
  userId: string,
  projectId: string,
  overrides: Partial<Achievement> = {},
): Achievement {
  return {
    id: '123e4567-e89b-12d3-a456-426614174001',
    userId,
    projectId,
    companyId: null,
    standupDocumentId: null,
    userMessageId: null,
    title: 'Test Achievement',
    summary: 'A brief summary',
    details: 'Some additional details',
    eventStart: new Date('2025-01-01'),
    eventEnd: null,
    eventDuration: 'week',
    isArchived: false,
    source: 'manual',
    impact: 2,
    impactSource: 'user',
    impactUpdatedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    workstreamId: null,
    workstreamSource: null,
    embedding: null,
    embeddingModel: null,
    embeddingGeneratedAt: null,
    sourceId: null,
    uniqueSourceId: null,
    sourceItemType: null,
    ...overrides,
  };
}

export function createMockWorkstream(
  userId: string,
  overrides: Partial<Workstream> = {},
): Workstream {
  return {
    id: '123e4567-e89b-12d3-a456-426614174200',
    userId,
    name: 'Test Workstream',
    description: null,
    color: '#3B82F6',
    centroidEmbedding: null,
    centroidUpdatedAt: null,
    achievementCount: 0,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
