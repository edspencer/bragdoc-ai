"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfigDir = getConfigDir;
exports.getLogsDir = getLogsDir;
exports.getCacheDir = getCacheDir;
exports.getCommitsCacheDir = getCommitsCacheDir;
exports.getConfigPath = getConfigPath;
exports.getApiBaseUrl = getApiBaseUrl;
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
/**
 * Get the path to the bragdoc config directory
 */
function getConfigDir() {
    return (0, node_path_1.join)((0, node_os_1.homedir)(), '.bragdoc');
}
function getLogsDir() {
    return (0, node_path_1.join)(getConfigDir(), 'logs');
}
/**
 * Get the path to the cache directory
 */
function getCacheDir() {
    return (0, node_path_1.join)(getConfigDir(), 'cache');
}
/**
 * Get the path to the commits cache directory
 */
function getCommitsCacheDir() {
    return (0, node_path_1.join)(getCacheDir(), 'commits');
}
/**
 * Get the path to the config file
 */
function getConfigPath() {
    return (0, node_path_1.join)(getConfigDir(), 'config.yml');
}
/**
 * Get the API base URL from config or use default
 */
function getApiBaseUrl(config) {
    return config.settings.apiBaseUrl || 'https://www.bragdoc.ai';
}
