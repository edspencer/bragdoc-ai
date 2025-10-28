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

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
