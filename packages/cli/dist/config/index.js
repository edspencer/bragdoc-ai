"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureConfigDir = ensureConfigDir;
exports.loadConfig = loadConfig;
exports.saveConfig = saveConfig;
const promises_1 = require("node:fs/promises");
const yaml_1 = require("yaml");
const types_1 = require("./types");
const paths_1 = require("./paths");
/**
 * Ensure all required directories exist with correct permissions
 */
async function ensureConfigDir() {
    const dirs = [
        (0, paths_1.getConfigDir)(),
        (0, paths_1.getCacheDir)(),
        (0, paths_1.getCommitsCacheDir)()
    ];
    for (const dir of dirs) {
        try {
            await (0, promises_1.access)(dir);
        }
        catch {
            // Directory doesn't exist, create it
            await (0, promises_1.mkdir)(dir, { recursive: true });
            // Set directory permissions to 700 (drwx------)
            await (0, promises_1.chmod)(dir, 0o700);
        }
    }
}
/**
 * Load the configuration file, creating a default if it doesn't exist
 */
async function loadConfig() {
    await ensureConfigDir();
    const configPath = (0, paths_1.getConfigPath)();
    try {
        const content = await (0, promises_1.readFile)(configPath, 'utf8');
        const config = (0, yaml_1.parse)(content);
        // Merge with default config to ensure all fields exist
        return {
            ...types_1.DEFAULT_CONFIG,
            ...config,
            settings: {
                ...types_1.DEFAULT_CONFIG.settings,
                ...(config.settings || {}),
            },
        };
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            // File doesn't exist, create default config
            console.log('Creating new configuration file...');
            await saveConfig(types_1.DEFAULT_CONFIG);
            return types_1.DEFAULT_CONFIG;
        }
        throw error;
    }
}
/**
 * Save the configuration file with correct permissions
 */
async function saveConfig(config) {
    const configPath = (0, paths_1.getConfigPath)();
    const yamlContent = (0, yaml_1.stringify)(config);
    await (0, promises_1.writeFile)(configPath, yamlContent, { encoding: 'utf8', mode: 0o600 });
}
