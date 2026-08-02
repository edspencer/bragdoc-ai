import { v4 as uuidv4 } from 'uuid';
import { GET, PUT } from 'app/api/user/llm-config/route';
import { DELETE } from 'app/api/user/llm-config/[provider]/route';
import { encryptApiKey } from 'lib/crypto/llm-keys';

// Crypto secret for the real encrypt/decrypt used by the PUT route
process.env.BYOK_ENCRYPTION_KEY = 'not-a-real-secret-byok-route-tests';

// Mock auth
jest.mock('lib/getAuthUser', () => ({
  getAuthUser: jest.fn(),
}));

// Mock database queries
jest.mock('@bragdoc/database', () => ({
  getLLMConfigsForUser: jest.fn(),
  upsertLLMConfig: jest.fn(),
  deleteLLMConfig: jest.fn(),
}));

// Mock provider verification
jest.mock('@bragdoc/ai', () => ({
  DEFAULT_MODELS: {
    openai: 'gpt-4o',
    anthropic: 'claude-3-5-sonnet-20241022',
    google: 'gemini-1.5-pro',
    deepseek: 'deepseek-chat',
    ollama: 'llama3.2',
    'openai-compatible': 'model-name',
  },
  verifyLLMConfig: jest.fn(),
}));

const { getAuthUser } = require('lib/getAuthUser');
const {
  getLLMConfigsForUser,
  upsertLLMConfig,
  deleteLLMConfig,
} = require('@bragdoc/database');
const { verifyLLMConfig } = require('@bragdoc/ai');

const userId = uuidv4();

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
    lastVerifiedAt: new Date('2026-07-01T00:00:00Z'),
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-07-01T00:00:00Z'),
    ...overrides,
  };
}

function authenticate() {
  getAuthUser.mockResolvedValue({ user: { id: userId }, source: 'session' });
}

function putRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/user/llm-config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

describe('LLM Config API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Base URL SSRF validation rejects private/internal addresses unless
    // this is set; individual tests opt in to the self-hosted behavior.
    delete process.env.BYOK_ALLOW_PRIVATE_BASEURLS;
  });

  afterAll(() => {
    delete process.env.BYOK_ALLOW_PRIVATE_BASEURLS;
  });

  describe('GET /api/user/llm-config', () => {
    it('returns 401 when not authenticated', async () => {
      getAuthUser.mockResolvedValue(null);

      const response = await GET(
        new Request('http://localhost/api/user/llm-config') as any,
      );

      expect(response.status).toBe(401);
    });

    it('returns masked configs without any secret material', async () => {
      authenticate();
      const row = makeConfigRow();
      getLLMConfigsForUser.mockResolvedValue([row]);

      const response = await GET(
        new Request('http://localhost/api/user/llm-config') as any,
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.configs).toHaveLength(1);

      const config = data.configs[0];
      expect(config.provider).toBe('openai');
      expect(config.model).toBe('gpt-4o');
      expect(config.keyHint).toBe('cdef');
      expect(config.isDefault).toBe(true);

      // NEVER expose the encrypted key or IV
      expect(config.encryptedApiKey).toBeUndefined();
      expect(config.iv).toBeUndefined();
      expect(JSON.stringify(data)).not.toContain('ciphertext-base64');
      expect(JSON.stringify(data)).not.toContain('iv-base64');
    });
  });

  describe('PUT /api/user/llm-config', () => {
    it('returns 401 when not authenticated', async () => {
      getAuthUser.mockResolvedValue(null);

      const response = await PUT(
        putRequest({ provider: 'openai', apiKey: 'sk-test' }),
      );

      expect(response.status).toBe(401);
    });

    it('returns 400 for an invalid provider', async () => {
      authenticate();

      const response = await PUT(
        putRequest({ provider: 'not-a-provider', apiKey: 'sk-test' }),
      );

      expect(response.status).toBe(400);
    });

    it('returns 400 when no apiKey is given for a key-requiring provider with no stored config', async () => {
      authenticate();
      getLLMConfigsForUser.mockResolvedValue([]);

      const response = await PUT(putRequest({ provider: 'openai' }));

      expect(response.status).toBe(400);
      expect(verifyLLMConfig).not.toHaveBeenCalled();
      expect(upsertLLMConfig).not.toHaveBeenCalled();
    });

    it('returns 400 when baseURL is missing for ollama', async () => {
      authenticate();
      getLLMConfigsForUser.mockResolvedValue([]);

      const response = await PUT(
        putRequest({ provider: 'ollama', model: 'llama3.2' }),
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.message).toMatch(/base URL/i);
    });

    it('returns 422 with a classified message when verification fails, and stores nothing', async () => {
      authenticate();
      getLLMConfigsForUser.mockResolvedValue([]);
      verifyLLMConfig.mockResolvedValue({
        ok: false,
        code: 'unauthorized',
        error: 'Incorrect API key provided',
      });

      const response = await PUT(
        putRequest({ provider: 'openai', apiKey: 'sk-bad-key' }),
      );

      expect(response.status).toBe(422);
      const data = await response.json();
      expect(data.error).toBe('verification_failed');
      expect(data.code).toBe('unauthorized');
      expect(data.message).toMatch(/rejected that API key/i);
      expect(upsertLLMConfig).not.toHaveBeenCalled();
    });

    it('verifies, encrypts and stores a new config as the first (default) config', async () => {
      authenticate();
      getLLMConfigsForUser.mockResolvedValue([]);
      verifyLLMConfig.mockResolvedValue({ ok: true });
      upsertLLMConfig.mockImplementation(async (input: any) =>
        makeConfigRow({
          ...input,
          id: uuidv4(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const apiKey = 'sk-test-1234567890abcdef';
      const response = await PUT(putRequest({ provider: 'openai', apiKey }));

      expect(response.status).toBe(201);

      // Verification was run with the raw key
      expect(verifyLLMConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'openai',
          openai: expect.objectContaining({ apiKey, model: 'gpt-4o' }),
        }),
        expect.objectContaining({ fetch: expect.any(Function) }),
      );

      // Stored values: encrypted (not plaintext), keyHint, default, verified
      expect(upsertLLMConfig).toHaveBeenCalledTimes(1);
      const stored = upsertLLMConfig.mock.calls[0][0];
      expect(stored.userId).toBe(userId);
      expect(stored.provider).toBe('openai');
      expect(stored.encryptedApiKey).toBeTruthy();
      expect(stored.encryptedApiKey).not.toContain(apiKey);
      expect(stored.iv).toBeTruthy();
      expect(stored.keyHint).toBe('cdef');
      expect(stored.model).toBe('gpt-4o');
      expect(stored.isDefault).toBe(true);
      expect(stored.lastVerifiedAt).toBeInstanceOf(Date);

      // Response is masked
      const data = await response.json();
      expect(data.config.encryptedApiKey).toBeUndefined();
      expect(data.config.iv).toBeUndefined();
      expect(JSON.stringify(data)).not.toContain(apiKey);
    });

    it('re-verifies with the stored decrypted key when apiKey is omitted for an existing config', async () => {
      authenticate();

      const storedKey = 'sk-existing-key-9876';
      const { encrypted, iv } = await encryptApiKey(storedKey);
      const existing = makeConfigRow({
        encryptedApiKey: encrypted,
        iv,
        keyHint: '9876',
        model: 'gpt-4o',
      });
      getLLMConfigsForUser.mockResolvedValue([existing]);
      verifyLLMConfig.mockResolvedValue({ ok: true });
      upsertLLMConfig.mockImplementation(async (input: any) =>
        makeConfigRow({ ...input }),
      );

      const response = await PUT(
        putRequest({ provider: 'openai', model: 'gpt-4.1' }),
      );

      expect(response.status).toBe(200);

      // Verified using the decrypted stored key and the new model
      expect(verifyLLMConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'openai',
          openai: expect.objectContaining({
            apiKey: storedKey,
            model: 'gpt-4.1',
          }),
        }),
        expect.objectContaining({ fetch: expect.any(Function) }),
      );

      // The stored key is kept (re-encrypted) and the model updated
      const stored = upsertLLMConfig.mock.calls[0][0];
      expect(stored.model).toBe('gpt-4.1');
      expect(stored.keyHint).toBe('9876');
      expect(stored.encryptedApiKey).toBeTruthy();
      expect(stored.isDefault).toBe(true); // existing row was default
    });

    it('accepts a keyless ollama config with a localhost baseURL when private base URLs are allowed (self-hosted)', async () => {
      // Hosted BragDoc rejects localhost base URLs (SSRF guard); the
      // self-hosted escape hatch allows them.
      process.env.BYOK_ALLOW_PRIVATE_BASEURLS = 'true';
      authenticate();
      getLLMConfigsForUser.mockResolvedValue([]);
      verifyLLMConfig.mockResolvedValue({ ok: true });
      upsertLLMConfig.mockImplementation(async (input: any) =>
        makeConfigRow({ ...input }),
      );

      const response = await PUT(
        putRequest({
          provider: 'ollama',
          model: 'llama3.2',
          baseURL: 'http://localhost:11434/api',
        }),
      );

      expect(response.status).toBe(201);
      const stored = upsertLLMConfig.mock.calls[0][0];
      expect(stored.encryptedApiKey).toBeNull();
      expect(stored.iv).toBeNull();
      expect(stored.keyHint).toBeNull();
      expect(stored.baseURL).toBe('http://localhost:11434/api');
    });

    it('rejects a private/internal baseURL by default without probing it (SSRF guard)', async () => {
      authenticate();
      getLLMConfigsForUser.mockResolvedValue([]);

      const response = await PUT(
        putRequest({
          provider: 'openai_compatible',
          apiKey: 'x',
          model: 'model-name',
          baseURL: 'http://169.254.169.254/latest/meta-data/',
        }),
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('invalid_base_url');
      expect(verifyLLMConfig).not.toHaveBeenCalled();
      expect(upsertLLMConfig).not.toHaveBeenCalled();
    });

    it('rejects a stored private baseURL reused on edit when private base URLs are not allowed', async () => {
      authenticate();
      const existing = makeConfigRow({
        provider: 'ollama',
        encryptedApiKey: null,
        iv: null,
        keyHint: null,
        model: 'llama3.2',
        baseURL: 'http://192.168.1.50:11434/api',
      });
      getLLMConfigsForUser.mockResolvedValue([existing]);

      // Edit that omits baseURL — the stored private one would be reused
      const response = await PUT(
        putRequest({ provider: 'ollama', model: 'llama3.3' }),
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('invalid_base_url');
      expect(verifyLLMConfig).not.toHaveBeenCalled();
      expect(upsertLLMConfig).not.toHaveBeenCalled();
    });

    it('never echoes upstream response text in the 422 body (SSRF readback)', async () => {
      authenticate();
      getLLMConfigsForUser.mockResolvedValue([]);
      // What a JSONParseError over an internal endpoint's HTML/creds body
      // looks like coming out of the AI SDK
      const leaked =
        'JSON parsing failed: Text: {"AccessKeyId":"ASIA-SECRET-LEAK"}';
      verifyLLMConfig.mockResolvedValue({
        ok: false,
        code: 'invalid_request',
        error: leaked,
      });

      const response = await PUT(
        putRequest({ provider: 'openai', apiKey: 'sk-bad-key' }),
      );

      expect(response.status).toBe(422);
      const body = await response.text();
      expect(body).not.toContain('ASIA-SECRET-LEAK');
      expect(body).not.toContain(leaked);
    });

    it('falls back to a generic message for an unrecognised failure code', async () => {
      authenticate();
      getLLMConfigsForUser.mockResolvedValue([]);
      verifyLLMConfig.mockResolvedValue({
        ok: false,
        code: 'something-new',
        error: 'raw upstream text',
      });

      const response = await PUT(
        putRequest({ provider: 'openai', apiKey: 'sk-bad-key' }),
      );

      expect(response.status).toBe(422);
      const data = await response.json();
      expect(data.message).toMatch(/Could not verify the provider/i);
      expect(JSON.stringify(data)).not.toContain('raw upstream text');
    });

    it('passes an SSRF-guarded fetch into the verification probe', async () => {
      authenticate();
      getLLMConfigsForUser.mockResolvedValue([]);
      verifyLLMConfig.mockResolvedValue({ ok: true });
      upsertLLMConfig.mockImplementation(async (input: any) =>
        makeConfigRow({ ...input }),
      );

      await PUT(putRequest({ provider: 'openai', apiKey: 'sk-test' }));

      expect(verifyLLMConfig).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ fetch: expect.any(Function) }),
      );
    });

    it('returns 400 (not 500) for a body that is not valid JSON', async () => {
      authenticate();

      const request = new Request('http://localhost/api/user/llm-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: '{ not json',
      }) as any;

      const response = await PUT(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('validation_error');
      expect(getLLMConfigsForUser).not.toHaveBeenCalled();
    });

    it('sets the config as default when setDefault is true', async () => {
      authenticate();
      const otherDefault = makeConfigRow({
        provider: 'anthropic',
        isDefault: true,
      });
      getLLMConfigsForUser.mockResolvedValue([otherDefault]);
      verifyLLMConfig.mockResolvedValue({ ok: true });
      upsertLLMConfig.mockImplementation(async (input: any) =>
        makeConfigRow({ ...input }),
      );

      const response = await PUT(
        putRequest({ provider: 'openai', apiKey: 'sk-new', setDefault: true }),
      );

      expect(response.status).toBe(201);
      expect(upsertLLMConfig.mock.calls[0][0].isDefault).toBe(true);
    });

    describe('set-default-only requests', () => {
      it('promotes an existing config without running the live probe', async () => {
        authenticate();
        const anthropic = makeConfigRow({
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
          encryptedApiKey: 'anthropic-ciphertext',
          iv: 'anthropic-iv',
          keyHint: 'wxyz',
          isDefault: false,
          lastVerifiedAt: new Date('2026-06-15T00:00:00Z'),
        });
        getLLMConfigsForUser.mockResolvedValue([makeConfigRow(), anthropic]);
        upsertLLMConfig.mockImplementation(async (input: any) =>
          makeConfigRow({ ...input }),
        );

        const response = await PUT(
          putRequest({ provider: 'anthropic', setDefault: true }),
        );

        expect(response.status).toBe(200);
        // A local flag flip must not depend on the provider being up
        expect(verifyLLMConfig).not.toHaveBeenCalled();

        // Stored credentials/endpoint/model are carried over untouched
        const stored = upsertLLMConfig.mock.calls[0][0];
        expect(stored.provider).toBe('anthropic');
        expect(stored.isDefault).toBe(true);
        expect(stored.encryptedApiKey).toBe('anthropic-ciphertext');
        expect(stored.iv).toBe('anthropic-iv');
        expect(stored.keyHint).toBe('wxyz');
        expect(stored.model).toBe('claude-3-5-sonnet-20241022');
        expect(stored.lastVerifiedAt).toEqual(new Date('2026-06-15T00:00:00Z'));

        // Response stays masked
        const data = await response.json();
        expect(data.config.encryptedApiKey).toBeUndefined();
        expect(data.config.iv).toBeUndefined();
      });

      it('skips the probe even when the stored baseURL is private (nothing is contacted)', async () => {
        authenticate();
        const ollama = makeConfigRow({
          provider: 'ollama',
          encryptedApiKey: null,
          iv: null,
          keyHint: null,
          model: 'llama3.2',
          baseURL: 'http://192.168.1.50:11434/api',
          isDefault: false,
        });
        getLLMConfigsForUser.mockResolvedValue([makeConfigRow(), ollama]);
        upsertLLMConfig.mockImplementation(async (input: any) =>
          makeConfigRow({ ...input }),
        );

        const response = await PUT(
          putRequest({ provider: 'ollama', setDefault: true }),
        );

        expect(response.status).toBe(200);
        expect(verifyLLMConfig).not.toHaveBeenCalled();
        expect(upsertLLMConfig.mock.calls[0][0].baseURL).toBe(
          'http://192.168.1.50:11434/api',
        );
      });

      it.each([
        ['apiKey', { apiKey: 'sk-rotated' }],
        ['model', { model: 'gpt-4.1' }],
        ['baseURL', { baseURL: 'https://api.example.com/v1' }],
      ])('still verifies when setDefault is combined with a %s change', async (_label, change) => {
        authenticate();
        const storedKey = 'sk-existing-key-9876';
        const { encrypted, iv } = await encryptApiKey(storedKey);
        getLLMConfigsForUser.mockResolvedValue([
          makeConfigRow({ encryptedApiKey: encrypted, iv, isDefault: false }),
        ]);
        verifyLLMConfig.mockResolvedValue({ ok: true });
        upsertLLMConfig.mockImplementation(async (input: any) =>
          makeConfigRow({ ...input }),
        );

        const response = await PUT(
          putRequest({ provider: 'openai', setDefault: true, ...change }),
        );

        expect(response.status).toBe(200);
        expect(verifyLLMConfig).toHaveBeenCalledTimes(1);
        expect(upsertLLMConfig.mock.calls[0][0].isDefault).toBe(true);
      });

      it('falls through to the normal path when no config exists yet', async () => {
        authenticate();
        getLLMConfigsForUser.mockResolvedValue([]);

        const response = await PUT(
          putRequest({ provider: 'openai', setDefault: true }),
        );

        // No stored key to promote — this is a validation error, not a no-op
        expect(response.status).toBe(400);
        expect(upsertLLMConfig).not.toHaveBeenCalled();
      });
    });
  });

  describe('DELETE /api/user/llm-config/[provider]', () => {
    const deleteRequest = () =>
      new Request('http://localhost/api/user/llm-config/openai', {
        method: 'DELETE',
      }) as any;

    it('returns 401 when not authenticated', async () => {
      getAuthUser.mockResolvedValue(null);

      const response = await DELETE(deleteRequest(), {
        params: Promise.resolve({ provider: 'openai' }),
      });

      expect(response.status).toBe(401);
    });

    it('returns 400 for an invalid provider', async () => {
      authenticate();

      const response = await DELETE(deleteRequest(), {
        params: Promise.resolve({ provider: 'nonsense' }),
      });

      expect(response.status).toBe(400);
      expect(deleteLLMConfig).not.toHaveBeenCalled();
    });

    it('returns 404 when no config exists for the provider', async () => {
      authenticate();
      deleteLLMConfig.mockResolvedValue(null);

      const response = await DELETE(deleteRequest(), {
        params: Promise.resolve({ provider: 'openai' }),
      });

      expect(response.status).toBe(404);
    });

    it('deletes the config for the authenticated user', async () => {
      authenticate();
      deleteLLMConfig.mockResolvedValue(makeConfigRow());

      const response = await DELETE(deleteRequest(), {
        params: Promise.resolve({ provider: 'openai' }),
      });

      expect(response.status).toBe(200);
      expect(deleteLLMConfig).toHaveBeenCalledWith(userId, 'openai');
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });
});
