require('dotenv').config({ path: '.env.test' });

const esModules = ['.*\\.mjs$', 'bcrypt-ts', 'nanoid', '@neondatabase', 'postgres'].join('|');

const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/database/(.*)$': '<rootDir>/../../packages/database/src/$1',
    '^@/config/(.*)$': '<rootDir>/../../packages/config/src/$1',
    '^@/email/(.*)$': '<rootDir>/../../packages/email/src/$1',
    '^app/(.*)$': '<rootDir>/app/$1',
    '^lib/(.*)$': '<rootDir>/lib/$1',
    '^components/(.*)$': '<rootDir>/components/$1',
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '^nanoid$': 'nanoid',
  },
  moduleDirectories: ['node_modules', '<rootDir>/node_modules', '<rootDir>/../../node_modules'],
  testMatch: ['<rootDir>/test/**/*.(test|spec).ts', '<rootDir>/test/**/*.(test|spec).tsx'],
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest'],
  },
  transformIgnorePatterns: [`!node_modules/(?!${esModules})`],
  maxWorkers: 1, //process.env.CI || process.env.IDE_TEST ? 1 : '50%',
  // runInBand: !!(process.env.CI || process.env.IDE_TEST),
  clearMocks: true,

  // Force exit after all tests complete
  forceExit: true,
};

export default config;
