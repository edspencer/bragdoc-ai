"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRepositoryInfo = getRepositoryInfo;
exports.collectGitCommits = collectGitCommits;
exports.getRepositoryName = getRepositoryName;
exports.getCurrentRepoName = getCurrentRepoName;
const node_child_process_1 = require("node:child_process");
/**
 * Get information about the current git repository
 */
function getRepositoryInfo(path = '.') {
    try {
        // Get remote URL
        const remoteUrl = (0, node_child_process_1.execSync)('git config --get remote.origin.url', { cwd: path })
            .toString()
            .trim();
        // Get current branch
        const currentBranch = (0, node_child_process_1.execSync)('git rev-parse --abbrev-ref HEAD', { cwd: path })
            .toString()
            .trim();
        return {
            remoteUrl,
            currentBranch,
            path
        };
    }
    catch (error) {
        throw new Error(`Failed to get repository info: ${error.message}`);
    }
}
/**
 * Collects Git commit data for a given branch and maxCommits count.
 */
function collectGitCommits(branch, maxCommits, repository) {
    try {
        // Get commit hash and full message (title + body).
        // Use %x00 as a commit separator and %x1f as a field separator
        const logCommand = `git log ${branch} --reverse --pretty=format:"%H%x1f%B%x1f%an%x1f%ai%x00" --max-count=${maxCommits}`;
        const output = (0, node_child_process_1.execSync)(logCommand).toString();
        // Split the output by null character to get individual commits
        const commits = output
            .split('\0') // Split commits by null character
            .filter(commit => commit.trim()) // Remove empty entries
            .map(commit => {
            const [hash, message, author, date] = commit
                .split('\x1f') // Split commit fields by unit separator
                .map(field => field.trim());
            if (!hash || !message || !author || !date) {
                throw new Error(`Invalid git log entry format: ${commit}`);
            }
            return {
                repository,
                hash,
                message,
                author,
                date,
                branch
            };
        });
        return commits;
    }
    catch (error) {
        throw new Error(`Failed to extract commits: ${error.message}`);
    }
}
/**
 * Extract repository name from remote URL
 */
function getRepositoryName(remoteUrl) {
    try {
        // Handle SSH URLs (git@github.com:user/repo.git)
        if (remoteUrl.startsWith('git@')) {
            const match = remoteUrl.match(/git@[^:]+:([^\/]+)\/([^\.]+)(\.git)?$/);
            if (match) {
                return `${match[1]}/${match[2]}`;
            }
        }
        // Handle HTTPS URLs (https://github.com/user/repo.git)
        if (remoteUrl.startsWith('http')) {
            const match = remoteUrl.match(/https?:\/\/[^\/]+\/([^\/]+)\/([^\.]+)(\.git)?$/);
            if (match) {
                return `${match[1]}/${match[2]}`;
            }
        }
        // If we can't parse the URL, use it as is (sanitized)
        return remoteUrl.replace(/[^a-zA-Z0-9-]/g, '_');
    }
    catch (error) {
        // If anything goes wrong, return a sanitized version of the URL
        return remoteUrl.replace(/[^a-zA-Z0-9-]/g, '_');
    }
}
/**
 * Get the name of the current repository from the remote URL or directory name
 */
async function getCurrentRepoName() {
    try {
        const repoInfo = getRepositoryInfo();
        return getRepositoryName(repoInfo.remoteUrl);
    }
    catch (error) {
        // If we can't get the repository info, use the current directory name
        return process.cwd().split('/').pop() || '';
    }
}
