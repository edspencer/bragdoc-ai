

require('dotenv').config({ path: '.env.test' });

const esModules = ['.*\\.mjs$', 'bcrypt-ts', 'nanoid'].join('|');

// const nextJest = require('next/jest');

// const createJestConfig = nextJest({
//   // Path to Next.js app to load next.config.js
//   dir: './',
// });

// /** @type {import('@jest/types').Config.InitialOptions} */
// const customJestConfig = {
//   /**
//    * Custom config goes here, I am not adding it to keep this example simple.
//    * See next/jest examples for more information.
//    */
//   preset: 'ts-jest',
//   testEnvironment: 'node',

//   moduleDirectories: ['node_modules', '<rootDir>/node_modules'],
//   moduleNameMapper: {
//     '^@/(.*)$': '<rootDir>/$1',
//     '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
//     '^bcrypt-ts$': '<rootDir>/node_modules/bcrypt-ts',
//     // nanoid: require.resolve('nanoid'),
//     // '^nanoid$': require.resolve('nanoid'),
//   },
//   modulePaths: ['<rootDir>'],

//   transformIgnorePatterns: ['!node_modules/(?!(nanoid)/)'],
//   transform: {
//     '^.+\\.(t|j)sx?$': ['@swc/jest'],
//     // '^.+\\.mjs$': '<rootDir>/jest-babel-transform.js', // Use custom transformer
//     // '^.+\\.(c|j)s?$': 'babel-jest', // Use Babel for other JS files
//   },
// };

// module.exports = async () => ({
//   ...(await createJestConfig(customJestConfig)()),

//   ...customJestConfig,
// });

const jestConfig = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  moduleDirectories: ['node_modules', '<rootDir>/node_modules'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '^bcrypt-ts$': '<rootDir>/node_modules/bcrypt-ts',
    '^nanoid$': 'nanoid',
  },
  testMatch: ['<rootDir>/test/**/*.(test|spec).ts'],

  transformIgnorePatterns: [`!node_modules/(?!${esModules})`],

  maxWorkers: 1,
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  // Run all tests serially in the current process
  runInBand: true,

  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest'],
    // '^.+\\.mjs$': '<rootDir>/jest-babel-transform.js', // Use custom transformer
    // '^.+\\.(c|j)s?$': 'babel-jest', // Use Babel for other JS files
  },
};

export default jestConfig;
