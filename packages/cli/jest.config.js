/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Mirrors the "paths" entry in tsconfig.json: @bragdoc/ai is a private
    // workspace package that gets bundled into the CLI, so tests run against
    // its source rather than requiring packages/ai to be built first.
    '^@bragdoc/ai$': '<rootDir>/../ai/src/index.ts',
  },
};
