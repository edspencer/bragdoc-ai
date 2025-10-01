import { access, mkdir, readFile, writeFile, chmod } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { ensureConfigDir, loadConfig, saveConfig } from '../../config';
import { getConfigDir, getConfigPath } from '../../config/paths';
import { type BragdocConfig, DEFAULT_CONFIG } from '../../config/types';
import { stringify } from 'yaml';

// Mock fs/promises
jest.mock('node:fs/promises', () => ({
  access: jest.fn(),
  mkdir: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  chmod: jest.fn(),
}));

describe('Config Management', () => {
  const configDir = getConfigDir();
  const configPath = getConfigPath();
  const mockFs = {
    access: jest.mocked(access),
    mkdir: jest.mocked(mkdir),
    readFile: jest.mocked(readFile),
    writeFile: jest.mocked(writeFile),
    chmod: jest.mocked(chmod),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('Config Paths', () => {
    it('returns correct config directory path', () => {
      expect(getConfigDir()).toBe(join(homedir(), '.bragdoc'));
    });

    it('returns correct config file path', () => {
      expect(getConfigPath()).toBe(join(homedir(), '.bragdoc', 'config.yml'));
    });
  });

  describe('ensureConfigDir', () => {
    it('creates directory if it does not exist', async () => {
      mockFs.access.mockRejectedValueOnce(new Error('ENOENT'));

      await ensureConfigDir();

      expect(mockFs.mkdir).toHaveBeenCalledWith(configDir, { recursive: true });
      expect(mockFs.chmod).toHaveBeenCalledWith(configDir, 0o700);
    });

    it('does nothing if directory exists', async () => {
      mockFs.access.mockResolvedValueOnce(undefined);

      await ensureConfigDir();

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
      mockFs.readFile.mockResolvedValueOnce(stringify(existingConfig));

      const config = await loadConfig();

      // Should merge with defaults
      expect(config).toEqual({
        ...DEFAULT_CONFIG,
        ...existingConfig,
        settings: {
          ...DEFAULT_CONFIG.settings,
          ...existingConfig.settings,
        },
      });
    });

    it('creates default config if file does not exist', async () => {
      const error = new Error('ENOENT');
      (error as any).code = 'ENOENT';
      mockFs.readFile.mockRejectedValueOnce(error);

      const config = await loadConfig();

      expect(config).toEqual(DEFAULT_CONFIG);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        configPath,
        stringify(DEFAULT_CONFIG),
        expect.any(Object),
      );
    });

    it('throws error for other file system errors', async () => {
      const error = new Error('EPERM');
      (error as any).code = 'EPERM';
      mockFs.readFile.mockRejectedValueOnce(error);

      await expect(loadConfig()).rejects.toThrow('EPERM');
    });
  });

  describe('saveConfig', () => {
    it('saves config with correct permissions', async () => {
      const config: BragdocConfig = {
        ...DEFAULT_CONFIG,
        repositories: [
          {
            path: '/test/repo',
            name: 'Test Repo',
            enabled: true,
          },
        ],
      };

      await saveConfig(config);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        configPath,
        stringify(config),
        { encoding: 'utf8', mode: 0o600 },
      );
    });
  });
});
