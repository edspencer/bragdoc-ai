import { generateText } from 'ai';
import type { LLMConfig } from './types';
import { verifyLLMConfig } from './verify';

jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

const generateTextMock = generateText as unknown as jest.Mock;

const WORKING_CONFIG: LLMConfig = {
  provider: 'openai',
  openai: { apiKey: 'sk-test', model: 'gpt-4o' },
};

describe('verifyLLMConfig', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    generateTextMock.mockReset();
    delete process.env.OPENAI_API_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns ok when the probe succeeds', async () => {
    generateTextMock.mockResolvedValue({ text: 'pong' });

    await expect(verifyLLMConfig(WORKING_CONFIG)).resolves.toEqual({
      ok: true,
    });
    expect(generateTextMock).toHaveBeenCalledTimes(1);
  });

  it('probes with at least 16 output tokens (reasoning models reject less)', async () => {
    generateTextMock.mockResolvedValue({ text: 'pong' });

    await verifyLLMConfig(WORKING_CONFIG);

    const args = generateTextMock.mock.calls[0][0];
    expect(args.maxOutputTokens).toBeGreaterThanOrEqual(16);
  });

  it('classifies TimeoutError as a timeout rather than a provider error', async () => {
    const error = new Error('The operation was aborted due to timeout');
    error.name = 'TimeoutError';
    generateTextMock.mockRejectedValue(error);

    const result = await verifyLLMConfig(WORKING_CONFIG);

    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining('Verification timed out'),
    });
  });

  it('classifies AbortError as a timeout too', async () => {
    const error = new Error('aborted');
    error.name = 'AbortError';
    generateTextMock.mockRejectedValue(error);

    const result = await verifyLLMConfig(WORKING_CONFIG);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/timed out/);
    }
  });

  it('surfaces the provider error message', async () => {
    generateTextMock.mockRejectedValue(new Error('Incorrect API key provided'));

    const result = await verifyLLMConfig(WORKING_CONFIG);

    expect(result).toEqual({ ok: false, error: 'Incorrect API key provided' });
  });

  it('appends the cause when it adds information', async () => {
    const error = new Error('Failed to call provider', {
      cause: new Error('ECONNREFUSED 127.0.0.1:11434'),
    });
    generateTextMock.mockRejectedValue(error);

    const result = await verifyLLMConfig(WORKING_CONFIG);

    expect(result).toEqual({
      ok: false,
      error: 'Failed to call provider: ECONNREFUSED 127.0.0.1:11434',
    });
  });

  it('does not repeat a cause already contained in the message', async () => {
    const error = new Error('boom: inner detail', {
      cause: new Error('inner detail'),
    });
    generateTextMock.mockRejectedValue(error);

    const result = await verifyLLMConfig(WORKING_CONFIG);

    expect(result).toEqual({ ok: false, error: 'boom: inner detail' });
  });

  it('never throws — model construction failures become results', async () => {
    const result = await verifyLLMConfig({ provider: 'ollama' } as never);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Ollama model not specified/);
    }
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it('stringifies non-Error throwables', async () => {
    generateTextMock.mockRejectedValue('plain string failure');

    await expect(verifyLLMConfig(WORKING_CONFIG)).resolves.toEqual({
      ok: false,
      error: 'plain string failure',
    });
  });

  it('threads allowEnvFallback:false through to model construction', async () => {
    process.env.OPENAI_API_KEY = 'sk-from-env';
    generateTextMock.mockResolvedValue({ text: 'pong' });

    const result = await verifyLLMConfig(
      { provider: 'openai' },
      { allowEnvFallback: false },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/OpenAI API key not found/);
      expect(result.error).toMatch(/environment variable fallback is disabled/);
    }
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it('threads the remediation hint through to model construction', async () => {
    const result = await verifyLLMConfig(
      { provider: 'openai' },
      {
        allowEnvFallback: false,
        remediationHint: 'Open Settings → AI Provider.',
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Open Settings → AI Provider\.$/);
    }
  });

  it('still uses the env fallback by default', async () => {
    process.env.OPENAI_API_KEY = 'sk-from-env';
    generateTextMock.mockResolvedValue({ text: 'pong' });

    await expect(verifyLLMConfig({ provider: 'openai' })).resolves.toEqual({
      ok: true,
    });
  });
});
