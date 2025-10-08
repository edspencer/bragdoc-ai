// Optional: add any global setup for Jest tests here

// Set test environment
// process.env.NODE_ENV = 'test';

// Load environment variables
require('dotenv').config({ path: '.env.test' });

// Mock bcrypt-ts
jest.mock('bcrypt-ts', () => ({
  genSaltSync: jest.fn(() => '$2a$10$abcdefghijklmnopqrstuv'),
  hashSync: jest.fn((password) => `$2a$10$hashedPassword${password}`),
  compareSync: jest.fn(() => true),
  compare: jest.fn(() => Promise.resolve(true)),
  genSalt: jest.fn(() => Promise.resolve('$2a$10$abcdefghijklmnopqrstuv')),
  hash: jest.fn((password) => Promise.resolve(`$2a$10$hashedPassword${password}`)),
}));

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

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
