"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isGitRepository = isGitRepository;
exports.validateRepository = validateRepository;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const execAsync = (0, node_util_1.promisify)(node_child_process_1.exec);
/**
 * Check if a directory is a git repository
 */
async function isGitRepository(path) {
    try {
        const gitDir = (0, node_path_1.join)(path, '.git');
        await (0, promises_1.access)(gitDir);
        // Additional check: try git status
        await execAsync('git status', { cwd: path });
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Validate that a path exists, is accessible, and is a git repository
 * Throws an error if validation fails
 */
async function validateRepository(path) {
    try {
        await (0, promises_1.access)(path);
    }
    catch {
        throw new Error(`Path does not exist or is not accessible: ${path}`);
    }
    if (!await isGitRepository(path)) {
        throw new Error(`Path is not a git repository: ${path}`);
    }
}
