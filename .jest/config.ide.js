const baseConfig = require('../jest.config');

module.exports = {
  ...baseConfig,
  maxWorkers: 1, // Force serial execution
  runInBand: true, // Another way to force serial execution
};
