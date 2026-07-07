import { v4 as uuidv4 } from 'uuid';
import {
  NoLLMConfigError,
  noLLMConfigResponse,
  resolveModelForUser,
} from 'lib/ai/resolve-model';

// Mock the platform OpenAI provider (demo path)
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn((modelId: string) => ({ provider: 'platform', modelId })),
}));

// Mock database queries
jest.mock('@bragdoc/database', () => ({
  getDefaultLLMConfig: jest.fn(),
}));

// Mock the shared provider factory
jest.mock('@bragdoc/ai', () => ({
  createLLMFromConfig: jest.fn(),
}));

// Mock key decryption
jest.mock('lib/crypto/llm-keys', () => ({
  decryptApiKey: jest.fn(),
}));

const { openai } = require('@ai-sdk/openai');
const { getDefaultLLMConfig } = require('@bragdoc/database');
const { createLLMFromConfig } = require('@bragdoc/ai');
const { decryptApiKey } = require('lib/crypto/llm-keys');

const userId = uuidv4();

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: userId,
    email: 'test@example.com',
    isDemo: false,
    ...overrides,
  } as any;
}

function makeConfigRow(overrides: Record<string, unknown> = {}) {
  return {
    id: uuidv4(),
    userId,
    provider: 'openai',
    encryptedApiKey: 'ciphertext-base64',
    iv: 'iv-base64',
    keyHint: 'cdef',
    model: 'gpt-4o',
    baseURL: null,
    isDefault: true,
    lastVerifiedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('resolveModelForUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('demo users (platform key)', () => {
    it.each([
      ['extraction', 'gpt-4o-mini'],
      ['generation', 'gpt-4.1-mini'],
      ['chat', 'gpt-4o'],
    ] as const)('uses the platform %s model for demo users', async (task, expectedModel) => {
      const model = await resolveModelForUser(makeUser({ isDemo: true }), task);

      expect(openai).toHaveBeenCalledWith(expectedModel);
      expect(model).toEqual({ provider: 'platform', modelId: expectedModel });
      // Never touches the user's stored configs
      expect(getDefaultLLMConfig).not.toHaveBeenCalled();
    });
  });

  describe('users with a stored config', () => {
    it('decrypts the key and builds the model from the stored config', async () => {
      getDefaultLLMConfig.mockResolvedValue(makeConfigRow());
      decryptApiKey.mockResolvedValue('sk-user-key');
      const userModel = { provider: 'user', modelId: 'gpt-4o' };
      createLLMFromConfig.mockReturnValue(userModel);

      const model = await resolveModelForUser(makeUser(), 'chat');

      expect(getDefaultLLMConfig).toHaveBeenCalledWith(userId);
      expect(decryptApiKey).toHaveBeenCalledWith(
        'ciphertext-base64',
        'iv-base64',
      );
      expect(createLLMFromConfig).toHaveBeenCalledWith({
        provider: 'openai',
        openai: { apiKey: 'sk-user-key', model: 'gpt-4o', baseURL: undefined },
      });
      expect(model).toBe(userModel);
      // Never uses the platform key
      expect(openai).not.toHaveBeenCalled();
    });

    it('uses the same stored model for every task in v1', async () => {
      getDefaultLLMConfig.mockResolvedValue(
        makeConfigRow({ provider: 'anthropic', model: 'claude-sonnet-4-5' }),
      );
      decryptApiKey.mockResolvedValue('sk-ant-key');
      createLLMFromConfig.mockReturnValue({ modelId: 'claude-sonnet-4-5' });

      for (const task of ['chat', 'extraction', 'generation'] as const) {
        await resolveModelForUser(makeUser(), task);
      }

      expect(createLLMFromConfig).toHaveBeenCalledTimes(3);
      for (const call of createLLMFromConfig.mock.calls) {
        expect(call[0]).toEqual({
          provider: 'anthropic',
          anthropic: { apiKey: 'sk-ant-key', model: 'claude-sonnet-4-5' },
        });
      }
    });

    it('supports keyless providers (Ollama) without decryption', async () => {
      getDefaultLLMConfig.mockResolvedValue(
        makeConfigRow({
          provider: 'ollama',
          encryptedApiKey: null,
          iv: null,
          model: 'llama3.2',
          baseURL: 'http://localhost:11434/api',
        }),
      );
      const ollamaModel = { modelId: 'llama3.2' };
      createLLMFromConfig.mockReturnValue(ollamaModel);

      const model = await resolveModelForUser(makeUser(), 'generation');

      expect(decryptApiKey).not.toHaveBeenCalled();
      expect(createLLMFromConfig).toHaveBeenCalledWith({
        provider: 'ollama',
        ollama: { model: 'llama3.2', baseURL: 'http://localhost:11434/api' },
      });
      expect(model).toBe(ollamaModel);
    });

    it('throws NoLLMConfigError for a keyed provider without stored key material', async () => {
      getDefaultLLMConfig.mockResolvedValue(
        makeConfigRow({ encryptedApiKey: null, iv: null }),
      );

      await expect(resolveModelForUser(makeUser(), 'chat')).rejects.toThrow(
        NoLLMConfigError,
      );
      // Must not fall back to the env-key path
      expect(createLLMFromConfig).not.toHaveBeenCalled();
    });
  });

  describe('users without a config', () => {
    it('throws NoLLMConfigError when no default config exists', async () => {
      getDefaultLLMConfig.mockResolvedValue(null);

      await expect(
        resolveModelForUser(makeUser(), 'generation'),
      ).rejects.toThrow(NoLLMConfigError);
      expect(openai).not.toHaveBeenCalled();
      expect(createLLMFromConfig).not.toHaveBeenCalled();
    });

    it('treats JWT users without an isDemo flag as non-demo', async () => {
      getDefaultLLMConfig.mockResolvedValue(null);

      // JWT-sourced users (CLI auth) do not carry isDemo
      const jwtUser = makeUser();
      delete (jwtUser as any).isDemo;

      await expect(resolveModelForUser(jwtUser, 'chat')).rejects.toThrow(
        NoLLMConfigError,
      );
      expect(openai).not.toHaveBeenCalled();
    });
  });

  describe('NoLLMConfigError', () => {
    it('is a typed Error with a stable name', () => {
      const error = new NoLLMConfigError();
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('NoLLMConfigError');
      expect(error.message).toContain('No LLM provider configured');
    });
  });

  describe('noLLMConfigResponse', () => {
    it('returns a 409 with the no_llm_configured error code', async () => {
      const response = noLLMConfigResponse();
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: 'no_llm_configured' });
    });
  });
});
