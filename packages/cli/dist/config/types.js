"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = void 0;
/**
 * Default configuration settings
 */
exports.DEFAULT_CONFIG = {
    repositories: [],
    settings: {
        defaultTimeRange: '30d',
        maxCommitsPerBatch: 10,
        defaultMaxCommits: 300,
        cacheEnabled: true,
    },
};
