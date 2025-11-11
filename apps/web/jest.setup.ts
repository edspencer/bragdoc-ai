// Optional: add any global setup for Jest tests here

// Set test environment
// process.env.NODE_ENV = 'test';

// Load environment variables
require('dotenv').config({ path: '.env.test' });

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    query: {},
  }),
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
}));

// Mock Better Auth to avoid initialization issues in Jest
jest.mock('@/lib/better-auth/server');
jest.mock('@/lib/better-auth/client');

// Mock AI embeddings to avoid OpenAI API calls in tests
jest.mock('@/lib/ai/embeddings', () => ({
  generateAchievementEmbedding: jest
    .fn()
    .mockResolvedValue([...Array(1536).fill(0)]), // Mock 1536-dimensional zero vector
  generateEmbeddingsBatch: jest.fn().mockResolvedValue(new Map()),
  generateMissingEmbeddings: jest.fn().mockResolvedValue(0),
  formatAchievementForEmbedding: jest.fn((ach, projectName) => {
    const parts = [];
    if (projectName) parts.push(`Project: ${projectName}`);
    if (ach.title) parts.push(ach.title);
    if (ach.summary) parts.push(ach.summary);
    return parts.join('. ').trim();
  }),
}));

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
