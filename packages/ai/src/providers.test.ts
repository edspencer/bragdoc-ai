import {
  createLLMFromConfig,
  DEFAULT_MODELS,
  getLLMDisplayName,
  isLLMConfigured,
} from './providers';
import type { LLMProvider } from './types';

const ENV_VARS = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GOOGLE_GENERATIVE_AI_API_KEY',
  'DEEPSEEK_API_KEY',
] as const;

describe('DEFAULT_MODELS', () => {
  it('has a default for every supported provider', () => {
    const providers: LLMProvider[] = [
      'openai',
      'anthropic',
      'google',
      'deepseek',
      'ollama',
      'openai-compatible',
    ];

    for (const provider of providers) {
      expect(typeof DEFAULT_MODELS[provider]).toBe('string');
      expect(DEFAULT_MODELS[provider].length).toBeGreaterThan(0);
    }
  });
});

describe('getLLMDisplayName', () => {
  it('defaults to OpenAI with its default model when given no config', () => {
    expect(getLLMDisplayName()).toBe(`OpenAI (${DEFAULT_MODELS.openai})`);
  });

  it('falls back to the provider default when no model is configured', () => {
    expect(getLLMDisplayName({ provider: 'anthropic' })).toBe(
      `Anthropic (${DEFAULT_MODELS.anthropic})`,
    );
  });

  it('uses the configured model when present', () => {
    expect(
      getLLMDisplayName({ provider: 'openai', openai: { model: 'gpt-5' } }),
    ).toBe('OpenAI (gpt-5)');
  });

  it('reports unknown for local providers without a model', () => {
    expect(getLLMDisplayName({ provider: 'ollama' } as never)).toBe(
      'Ollama (unknown)',
    );
  });
});

describe('isLLMConfigured', () => {
  it('is false without a config', () => {
    expect(isLLMConfigured(undefined)).toBe(false);
  });

  it('ignores environment variables', () => {
    process.env.OPENAI_API_KEY = 'sk-from-env';
    expect(isLLMConfigured({ provider: 'openai' })).toBe(false);
  });

  it('is true once an API key is in the config', () => {
    expect(
      isLLMConfigured({ provider: 'openai', openai: { apiKey: 'sk-test' } }),
    ).toBe(true);
  });
});

describe('createLLMFromConfig env fallback', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    for (const key of ENV_VARS) {
      delete process.env[key];
    }
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('falls back to the provider env var by default', () => {
    process.env.OPENAI_API_KEY = 'sk-from-env';

    const model = createLLMFromConfig({ provider: 'openai' });

    expect(model).toBeDefined();
  });

  it.each([
    ['openai', 'OPENAI_API_KEY', 'OpenAI'],
    ['anthropic', 'ANTHROPIC_API_KEY', 'Anthropic'],
    ['google', 'GOOGLE_GENERATIVE_AI_API_KEY', 'Google'],
    ['deepseek', 'DEEPSEEK_API_KEY', 'DeepSeek'],
  ] as const)('refuses the %s env var when allowEnvFallback is false', (provider, envVar, label) => {
    process.env[envVar] = 'sk-from-env';

    expect(() =>
      createLLMFromConfig({ provider }, { allowEnvFallback: false }),
    ).toThrow(new RegExp(`^${label} API key not found`));
  });

  it('does not mention the environment variable when the fallback is disabled', () => {
    expect(() =>
      createLLMFromConfig({ provider: 'openai' }, { allowEnvFallback: false }),
    ).toThrow(/environment variable fallback is disabled/);

    expect(() =>
      createLLMFromConfig({ provider: 'openai' }, { allowEnvFallback: false }),
    ).not.toThrow(/set the OPENAI_API_KEY/);
  });

  it('still accepts an explicit config key when the fallback is disabled', () => {
    const model = createLLMFromConfig(
      { provider: 'openai', openai: { apiKey: 'sk-explicit' } },
      { allowEnvFallback: false },
    );

    expect(model).toBeDefined();
  });

  it('mentions the environment variable when the fallback is allowed', () => {
    expect(() => createLLMFromConfig({ provider: 'openai' })).toThrow(
      /set the OPENAI_API_KEY environment variable/,
    );
  });
});

describe('createLLMFromConfig remediation hints', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    for (const key of ENV_VARS) {
      delete process.env[key];
    }
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const hint = 'Run "bragdoc llm set".';

  it('appends the caller hint to missing API key errors', () => {
    expect(() =>
      createLLMFromConfig({ provider: 'openai' }, { remediationHint: hint }),
    ).toThrow(/OpenAI API key not found[\s\S]*\nRun "bragdoc llm set"\.$/);
  });

  it('appends the caller hint to incomplete local provider config', () => {
    expect(() =>
      createLLMFromConfig({ provider: 'ollama' } as never, {
        remediationHint: hint,
      }),
    ).toThrow(/Ollama model not specified[\s\S]*Run "bragdoc llm set"\.$/);
  });

  it('appends the caller hint to unsupported providers', () => {
    expect(() =>
      createLLMFromConfig({ provider: 'nope' } as never, {
        remediationHint: hint,
      }),
    ).toThrow(/Unsupported LLM provider: nope[\s\S]*Run "bragdoc llm set"\.$/);
  });

  it('omits the hint entirely when the caller supplies none', () => {
    expect(() => createLLMFromConfig({ provider: 'openai' })).toThrow(
      /environment variable$/,
    );
  });
});
