"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reposCommand = void 0;
exports.normalizeRepoPath = normalizeRepoPath;
exports.listRepos = listRepos;
exports.addRepo = addRepo;
exports.removeRepo = removeRepo;
exports.updateRepo = updateRepo;
exports.toggleRepo = toggleRepo;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const config_1 = require("../config");
const git_1 = require("../utils/git");
const node_path_1 = require("node:path");
/**
 * Normalize a repository path to an absolute path
 */
function normalizeRepoPath(path) {
    return (0, node_path_1.resolve)(path);
}
exports.reposCommand = new commander_1.Command('repos')
    .description('Manage repositories for bragdoc')
    .addCommand(new commander_1.Command('list')
    .description('List all configured repositories')
    .action(listRepos))
    .addCommand(new commander_1.Command('add')
    .description('Add a repository to bragdoc')
    .argument('[path]', 'Path to repository (defaults to current directory)')
    .option('-n, --name <name>', 'Friendly name for the repository')
    .option('-m, --max-commits <number>', 'Maximum number of commits to extract')
    .action(addRepo))
    .addCommand(new commander_1.Command('remove')
    .description('Remove a repository from bragdoc')
    .argument('[path]', 'Path to repository (defaults to current directory)')
    .action(removeRepo))
    .addCommand(new commander_1.Command('update')
    .description('Update repository settings')
    .argument('[path]', 'Path to repository (defaults to current directory)')
    .option('-n, --name <name>', 'Update friendly name')
    .option('-m, --max-commits <number>', 'Update maximum commits')
    .action(updateRepo))
    .addCommand(new commander_1.Command('enable')
    .description('Enable a repository')
    .argument('[path]', 'Path to repository (defaults to current directory)')
    .action((path) => toggleRepo(path, true)))
    .addCommand(new commander_1.Command('disable')
    .description('Disable a repository')
    .argument('[path]', 'Path to repository (defaults to current directory)')
    .action((path) => toggleRepo(path, false)));
/**
 * Format repository for display
 */
function formatRepo(repo, defaultMaxCommits) {
    const status = repo.enabled ? chalk_1.default.green('✓') : chalk_1.default.red('⨯');
    const name = repo.name ? `${repo.name} ` : '';
    const maxCommits = repo.maxCommits || defaultMaxCommits;
    const disabled = !repo.enabled ? ' [disabled]' : '';
    return `${status} ${name}(${repo.path}) [max: ${maxCommits}]${disabled}`;
}
/**
 * List all repositories
 */
async function listRepos() {
    const config = await (0, config_1.loadConfig)();
    if (config.repositories.length === 0) {
        console.log('No repositories configured. Add one with: bragdoc repos add <path>');
        return;
    }
    console.log('Configured repositories:');
    config.repositories.forEach(repo => {
        console.log(formatRepo(repo, config.settings.defaultMaxCommits));
    });
}
/**
 * Add a new repository
 */
async function addRepo(path = process.cwd(), options = {}) {
    const config = await (0, config_1.loadConfig)();
    const absolutePath = normalizeRepoPath(path);
    // Validate repository
    await (0, git_1.validateRepository)(absolutePath);
    // Check for duplicates
    if (config.repositories.some(r => r.path === absolutePath)) {
        throw new Error('Repository already exists in configuration');
    }
    // Add repository
    const newRepo = {
        path: absolutePath,
        name: options.name,
        enabled: true,
        maxCommits: options.maxCommits ? Number.parseInt(options.maxCommits.toString(), 10) : undefined,
    };
    config.repositories.push(newRepo);
    await (0, config_1.saveConfig)(config);
    console.log(`Added repository: ${formatRepo(newRepo, config.settings.defaultMaxCommits)}`);
}
/**
 * Remove a repository
 */
async function removeRepo(path = process.cwd()) {
    const config = await (0, config_1.loadConfig)();
    const absolutePath = normalizeRepoPath(path);
    const index = config.repositories.findIndex(r => r.path === absolutePath);
    if (index === -1) {
        throw new Error('Repository not found in configuration');
    }
    config.repositories.splice(index, 1);
    await (0, config_1.saveConfig)(config);
    console.log(`Removed repository: ${absolutePath}`);
}
/**
 * Update repository settings
 */
async function updateRepo(path = process.cwd(), options = {}) {
    const config = await (0, config_1.loadConfig)();
    const absolutePath = normalizeRepoPath(path);
    const repo = config.repositories.find(r => r.path === absolutePath);
    if (!repo) {
        throw new Error('Repository not found in configuration');
    }
    if (options.name !== undefined) {
        repo.name = options.name;
    }
    if (options.maxCommits !== undefined) {
        repo.maxCommits = Number.parseInt(options.maxCommits.toString(), 10);
    }
    await (0, config_1.saveConfig)(config);
    console.log(`Updated repository: ${formatRepo(repo, config.settings.defaultMaxCommits)}`);
}
/**
 * Enable or disable a repository
 */
async function toggleRepo(path, enabled) {
    const config = await (0, config_1.loadConfig)();
    const absolutePath = normalizeRepoPath(path);
    const repo = config.repositories.find(r => r.path === absolutePath);
    if (!repo) {
        throw new Error('Repository not found in configuration');
    }
    repo.enabled = enabled;
    await (0, config_1.saveConfig)(config);
    console.log(`${enabled ? 'Enabled' : 'Disabled'} repository: ${formatRepo(repo, config.settings.defaultMaxCommits)}`);
}
