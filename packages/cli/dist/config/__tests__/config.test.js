"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("node:fs/promises");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const config_1 = require("../../config");
const paths_1 = require("../../config/paths");
const types_1 = require("../../config/types");
const yaml_1 = require("yaml");
// Mock fs/promises
jest.mock('node:fs/promises', () => ({
    access: jest.fn(),
    mkdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    chmod: jest.fn(),
}));
describe('Config Management', () => {
    const configDir = (0, paths_1.getConfigDir)();
    const configPath = (0, paths_1.getConfigPath)();
    const mockFs = {
        access: jest.mocked(promises_1.access),
        mkdir: jest.mocked(promises_1.mkdir),
        readFile: jest.mocked(promises_1.readFile),
        writeFile: jest.mocked(promises_1.writeFile),
        chmod: jest.mocked(promises_1.chmod),
    };
    beforeEach(() => {
        jest.resetAllMocks();
    });
    describe('Config Paths', () => {
        it('returns correct config directory path', () => {
            expect((0, paths_1.getConfigDir)()).toBe((0, node_path_1.join)((0, node_os_1.homedir)(), '.bragdoc'));
        });
        it('returns correct config file path', () => {
            expect((0, paths_1.getConfigPath)()).toBe((0, node_path_1.join)((0, node_os_1.homedir)(), '.bragdoc', 'config.yml'));
        });
    });
    describe('ensureConfigDir', () => {
        it('creates directory if it does not exist', async () => {
            mockFs.access.mockRejectedValueOnce(new Error('ENOENT'));
            await (0, config_1.ensureConfigDir)();
            expect(mockFs.mkdir).toHaveBeenCalledWith(configDir, { recursive: true });
            expect(mockFs.chmod).toHaveBeenCalledWith(configDir, 0o700);
        });
        it('does nothing if directory exists', async () => {
            mockFs.access.mockResolvedValueOnce(undefined);
            await (0, config_1.ensureConfigDir)();
            expect(mockFs.mkdir).not.toHaveBeenCalled();
        });
    });
    describe('loadConfig', () => {
        it('loads existing config and merges with defaults', async () => {
            const existingConfig = {
                repositories: [
                    {
                        path: '/test/repo',
                        name: 'Test Repo',
                        enabled: true,
                    },
                ],
                settings: {
                    defaultTimeRange: '60d', // Override default
                },
            };
            mockFs.access.mockResolvedValueOnce(undefined);
            mockFs.readFile.mockResolvedValueOnce((0, yaml_1.stringify)(existingConfig));
            const config = await (0, config_1.loadConfig)();
            // Should merge with defaults
            expect(config).toEqual({
                ...types_1.DEFAULT_CONFIG,
                ...existingConfig,
                settings: {
                    ...types_1.DEFAULT_CONFIG.settings,
                    ...existingConfig.settings,
                },
            });
        });
        it('creates default config if file does not exist', async () => {
            const error = new Error('ENOENT');
            error.code = 'ENOENT';
            mockFs.readFile.mockRejectedValueOnce(error);
            const config = await (0, config_1.loadConfig)();
            expect(config).toEqual(types_1.DEFAULT_CONFIG);
            expect(mockFs.writeFile).toHaveBeenCalledWith(configPath, (0, yaml_1.stringify)(types_1.DEFAULT_CONFIG), expect.any(Object));
        });
        it('throws error for other file system errors', async () => {
            const error = new Error('EPERM');
            error.code = 'EPERM';
            mockFs.readFile.mockRejectedValueOnce(error);
            await expect((0, config_1.loadConfig)()).rejects.toThrow('EPERM');
        });
    });
    describe('saveConfig', () => {
        it('saves config with correct permissions', async () => {
            const config = {
                ...types_1.DEFAULT_CONFIG,
                repositories: [
                    {
                        path: '/test/repo',
                        name: 'Test Repo',
                        enabled: true,
                    },
                ],
            };
            await (0, config_1.saveConfig)(config);
            expect(mockFs.writeFile).toHaveBeenCalledWith(configPath, (0, yaml_1.stringify)(config), { encoding: 'utf8', mode: 0o600 });
        });
    });
});
