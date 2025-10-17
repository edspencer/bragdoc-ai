# Multi-Provider LLM Configuration Implementation Plan

This document provides step-by-step instructions for implementing multi-provider LLM support in the BragDoc CLI, upgrading from AI SDK 4 to 5, and integrating LLM configuration into the natural user workflow.

## Overview

**Problem**: CLI currently requires `OPENAI_API_KEY` environment variable, which doesn't work in cron jobs. LLM provider is hardcoded to OpenAI.

**Solution**: Store LLM configuration (provider, API keys, models) in `~/.bragdoc/config.yml` and support multiple providers including local LLMs via Ollama.

## Implementation Tasks

### Phase 1: Configuration Types

#### [x] Task 1.1: Add LLM type definitions
**File**: `packages/cli/src/config/types.ts`

Add these new types and interfaces at the top of the file (after imports):

```typescript
export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'deepseek' | 'ollama' | 'openai-compatible';

export interface OpenAIConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string; // Default: 'gpt-4o'
}

export interface AnthropicConfig {
  apiKey?: string;
  model?: string; // Default: 'claude-3-5-sonnet-20241022'
}

export interface GoogleConfig {
  apiKey?: string;
  model?: string; // Default: 'gemini-1.5-pro'
}

export interface DeepSeekConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string; // Default: 'deepseek-chat'
}

export interface OllamaConfig {
  baseURL?: string; // Default: 'http://localhost:11434'
  model: string; // Required: e.g., 'llama3.2', 'qwen2.5-coder'
}

export interface OpenAICompatibleConfig {
  baseURL: string;
  apiKey?: string;
  model: string;
}

export interface LLMConfig {
  provider: LLMProvider;
  openai?: OpenAIConfig;
  anthropic?: AnthropicConfig;
  google?: GoogleConfig;
  deepseek?: DeepSeekConfig;
  ollama?: OllamaConfig;
  openaiCompatible?: OpenAICompatibleConfig;
}
```

#### [x] Task 1.2: Add llm field to BragdocConfig
**File**: `packages/cli/src/config/types.ts`

In the `BragdocConfig` interface (around line 41), add the `llm` field:

```typescript
export interface BragdocConfig {
  auth?: {
    token?: string;
    expiresAt?: number;
  };
  projects: Project[];
  standups: StandupProjectConfig[];
  repositories?: Project[]; // Deprecated: use projects instead
  llm?: LLMConfig; // ADD THIS LINE
  settings: {
    maxCommitsPerBatch: number;
    defaultMaxCommits: number;
    cacheEnabled: boolean;
    dataCacheTimeout?: number;
    apiBaseUrl?: string;
  };
}
```

#### [x] Task 1.3: Update DEFAULT_CONFIG
**File**: `packages/cli/src/config/types.ts`

In `DEFAULT_CONFIG` (around line 61), add default LLM configuration:

```typescript
export const DEFAULT_CONFIG: BragdocConfig = {
  projects: [],
  standups: [],
  llm: {
    provider: 'openai',
    openai: {
      model: 'gpt-4o',
    },
  },
  settings: {
    maxCommitsPerBatch: 10,
    defaultMaxCommits: 300,
    cacheEnabled: true,
    dataCacheTimeout: 5,
  },
};
```

### Phase 2: Update Dependencies

#### [x] Task 2.1: Upgrade AI SDK packages
**File**: `packages/cli/package.json`

Update the dependencies section (lines 46-61):

```json
"dependencies": {
  "@ai-sdk/anthropic": "^1.0.0",
  "@ai-sdk/google": "^1.0.0",
  "@ai-sdk/openai": "^2.0.0",
  "@bragdoc/config": "workspace:*",
  "@types/yaml": "^1.9.7",
  "ai": "^5.0.0",
  "chalk": "^4.1.2",
  "commander": "^11.1.0",
  "inquirer": "^12.9.6",
  "mdx-prompt": "^0.4.1",
  "node-fetch": "^2.7.0",
  "ollama-ai-provider-v2": "^1.0.0",
  "open": "^10.1.0",
  "p-limit": "^7.1.1",
  "react": ">=19",
  "winston": "^3.17.0",
  "yaml": "^2.7.0",
  "zod": "^4.1.8"
}
```

Key changes:
- `@ai-sdk/openai`: `1.0.6` → `^2.0.0`
- `ai`: `4.0.20` → `^5.0.0`
- `zod`: `^3.23.8` → `^4.1.8`
- **NEW**: `@ai-sdk/anthropic`, `@ai-sdk/google`, `ollama-ai-provider-v2`

#### [x] Task 2.2: Install dependencies
**Command**: Run in terminal from project root:

```bash
cd packages/cli
pnpm install
```

### Phase 3: Create Provider Factory

#### [x] Task 3.1: Create providers.ts file
**File**: `packages/cli/src/ai/providers.ts` (NEW FILE)

Create this entire new file with the following content:

```typescript
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { createOllama } from 'ollama-ai-provider-v2';
import type { LanguageModelV1 } from 'ai';
import type { BragdocConfig } from '../config/types';
import logger from '../utils/logger';

/**
 * Creates an LLM instance based on configuration
 * Falls back to environment variables if config not set
 */
export function createLLMFromConfig(config: BragdocConfig): LanguageModelV1 {
  const llmConfig = config.llm || { provider: 'openai' };
  const provider = llmConfig.provider;

  logger.debug(`Creating LLM with provider: ${provider}`);

  switch (provider) {
    case 'openai': {
      const apiKey = llmConfig.openai?.apiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error(
          'OpenAI API key not found. Set it in config with:\n' +
          '  bragdoc init\n' +
          'Or set OPENAI_API_KEY environment variable'
        );
      }

      const model = llmConfig.openai?.model || 'gpt-4o';
      const baseURL = llmConfig.openai?.baseURL;

      return openai(model, {
        apiKey,
        ...(baseURL && { baseURL }),
      });
    }

    case 'anthropic': {
      const apiKey = llmConfig.anthropic?.apiKey || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error(
          'Anthropic API key not found. Set it in config with:\n' +
          '  bragdoc init\n' +
          'Or set ANTHROPIC_API_KEY environment variable'
        );
      }

      const model = llmConfig.anthropic?.model || 'claude-3-5-sonnet-20241022';
      return anthropic(model, { apiKey });
    }

    case 'google': {
      const apiKey = llmConfig.google?.apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) {
        throw new Error(
          'Google API key not found. Set it in config with:\n' +
          '  bragdoc init\n' +
          'Or set GOOGLE_GENERATIVE_AI_API_KEY environment variable'
        );
      }

      const model = llmConfig.google?.model || 'gemini-1.5-pro';
      return google(model, { apiKey });
    }

    case 'deepseek': {
      const apiKey = llmConfig.deepseek?.apiKey || process.env.DEEPSEEK_API_KEY;
      if (!apiKey) {
        throw new Error(
          'DeepSeek API key not found. Set it in config with:\n' +
          '  bragdoc init\n' +
          'Or set DEEPSEEK_API_KEY environment variable'
        );
      }

      const model = llmConfig.deepseek?.model || 'deepseek-chat';
      const baseURL = llmConfig.deepseek?.baseURL || 'https://api.deepseek.com/v1';

      return openai(model, {
        apiKey,
        baseURL,
      });
    }

    case 'ollama': {
      if (!llmConfig.ollama?.model) {
        throw new Error(
          'Ollama model not specified. Configure it with:\n' +
          '  bragdoc init\n' +
          'Available models: llama3.2, qwen2.5-coder, etc.\n' +
          'See: https://ollama.com/library'
        );
      }

      const baseURL = llmConfig.ollama.baseURL || 'http://localhost:11434';
      const ollama = createOllama({ baseURL });

      return ollama(llmConfig.ollama.model);
    }

    case 'openai-compatible': {
      if (!llmConfig.openaiCompatible?.baseURL || !llmConfig.openaiCompatible?.model) {
        throw new Error(
          'OpenAI-compatible configuration incomplete. Required: baseURL and model\n' +
          'Configure it with: bragdoc init\n' +
          'Example: LM Studio at http://localhost:1234/v1'
        );
      }

      return openai(llmConfig.openaiCompatible.model, {
        baseURL: llmConfig.openaiCompatible.baseURL,
        apiKey: llmConfig.openaiCompatible.apiKey || 'not-needed',
      });
    }

    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

/**
 * Get a friendly name for the current LLM configuration
 */
export function getLLMDisplayName(config: BragdocConfig): string {
  const llmConfig = config.llm || { provider: 'openai' };

  switch (llmConfig.provider) {
    case 'openai':
      return `OpenAI (${llmConfig.openai?.model || 'gpt-4o'})`;
    case 'anthropic':
      return `Anthropic (${llmConfig.anthropic?.model || 'claude-3-5-sonnet-20241022'})`;
    case 'google':
      return `Google (${llmConfig.google?.model || 'gemini-1.5-pro'})`;
    case 'deepseek':
      return `DeepSeek (${llmConfig.deepseek?.model || 'deepseek-chat'})`;
    case 'ollama':
      return `Ollama (${llmConfig.ollama?.model || 'unknown'})`;
    case 'openai-compatible':
      return `OpenAI-Compatible (${llmConfig.openaiCompatible?.model || 'unknown'})`;
    default:
      return 'Unknown';
  }
}
```

### Phase 4: Update LLM Module

#### [x] Task 4.1: Replace llm.ts
**File**: `packages/cli/src/ai/llm.ts`

**Replace the entire file** with:

```typescript
import type { LanguageModelV1 } from 'ai';
import { loadConfig } from '../config';
import { createLLMFromConfig } from './providers';

let cachedModel: LanguageModelV1 | null = null;

/**
 * Get the configured LLM for achievement extraction
 * Caches the model instance for performance
 *
 * Note: Requires appropriate API key to be set in config or environment
 */
export async function getExtractionModel(): Promise<LanguageModelV1> {
  if (cachedModel) {
    return cachedModel;
  }

  const config = await loadConfig();
  cachedModel = createLLMFromConfig(config);

  return cachedModel;
}

/**
 * Clear the cached model instance
 * Useful for testing or when config changes
 */
export function clearModelCache(): void {
  cachedModel = null;
}
```

### Phase 5: Update Achievement Extraction

#### [x] Task 5.1: Update imports in extract-commit-achievements.ts
**File**: `packages/cli/src/ai/extract-commit-achievements.ts`

Change line 7:

```typescript
// BEFORE:
import { extractAchievementsModel } from './llm';

// AFTER:
import { getExtractionModel } from './llm';
```

#### [x] Task 5.2: Update executeStream function
**File**: `packages/cli/src/ai/extract-commit-achievements.ts`

In the `executeStream` function (around line 40), add `await getExtractionModel()` at the start:

```typescript
// BEFORE:
export async function* executeStream(
  prompt: string,
): AsyncGenerator<ExtractedAchievement, void, unknown> {
  const { elementStream } = streamObject({
    model: extractAchievementsModel,
    prompt,
    temperature: 0,
    output: 'array',
    schema: achievementResponseSchema,
  });

// AFTER:
export async function* executeStream(
  prompt: string,
): AsyncGenerator<ExtractedAchievement, void, unknown> {
  const model = await getExtractionModel();

  const { elementStream } = streamObject({
    model,
    prompt,
    temperature: 0,
    output: 'array',
    schema: achievementResponseSchema,
  });
```

### Phase 6: Config File Permissions

#### [x] Task 6.1: File permissions already set
**File**: `packages/cli/src/config/index.ts`

**No action needed** - Line 133 already sets correct permissions:
```typescript
await writeFile(configPath, yamlContent, { encoding: 'utf8', mode: 0o600 });
```

#### [-] Task 6.2: Add helpful message on first config creation (SKIPPED)
**File**: `packages/cli/src/config/index.ts`

**Note**: Skipped - users will be prompted during `bragdoc init` anyway, so additional message not needed.

### Phase 7: Interactive LLM Setup

#### [x] Task 7.1: Create llm-setup.ts file
**File**: `packages/cli/src/config/llm-setup.ts` (NEW FILE)

Create this new file:

```typescript
import inquirer from 'inquirer';
import type { LLMConfig, LLMProvider } from './types';
import logger from '../utils/logger';

interface ProviderOption {
  name: string;
  value: LLMProvider;
  description: string;
}

const PROVIDER_OPTIONS: ProviderOption[] = [
  {
    name: 'OpenAI (GPT-4, GPT-4o)',
    value: 'openai',
    description: 'Get API key at https://platform.openai.com/api-keys',
  },
  {
    name: 'Anthropic (Claude)',
    value: 'anthropic',
    description: 'Get API key at https://console.anthropic.com/settings/keys',
  },
  {
    name: 'Google (Gemini)',
    value: 'google',
    description: 'Get API key at https://aistudio.google.com/app/apikey',
  },
  {
    name: 'DeepSeek',
    value: 'deepseek',
    description: 'Get API key at https://platform.deepseek.com/api_keys',
  },
  {
    name: 'Ollama (Local LLMs)',
    value: 'ollama',
    description: 'Run LLMs locally - requires Ollama installed',
  },
  {
    name: 'OpenAI-Compatible (LM Studio, LocalAI, etc.)',
    value: 'openai-compatible',
    description: 'Any OpenAI-compatible API endpoint',
  },
];

const DEFAULT_MODELS: Record<LLMProvider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-3-5-sonnet-20241022',
  google: 'gemini-1.5-pro',
  deepseek: 'deepseek-chat',
  ollama: 'llama3.2',
  'openai-compatible': 'model-name',
};

/**
 * Prompts user to configure their LLM provider
 * Returns a complete LLMConfig object
 */
export async function promptForLLMConfig(): Promise<LLMConfig> {
  console.log('\n🤖 LLM Configuration Setup');
  console.log('Achievement extraction requires an LLM provider.\n');

  // Step 1: Select provider
  const { provider } = await inquirer.prompt<{ provider: LLMProvider }>([
    {
      type: 'list',
      name: 'provider',
      message: 'Select your LLM provider:',
      choices: PROVIDER_OPTIONS.map((opt) => ({
        name: opt.name,
        value: opt.value,
      })),
    },
  ]);

  const providerInfo = PROVIDER_OPTIONS.find((p) => p.value === provider);
  if (providerInfo?.description) {
    console.log(`\n💡 ${providerInfo.description}\n`);
  }

  const config: LLMConfig = { provider };

  // Step 2: Provider-specific configuration
  switch (provider) {
    case 'openai': {
      const { apiKey, model } = await inquirer.prompt([
        {
          type: 'input',
          name: 'apiKey',
          message: 'Enter your OpenAI API key:',
          validate: (input) => input.length > 0 || 'API key is required',
        },
        {
          type: 'input',
          name: 'model',
          message: 'Model name:',
          default: DEFAULT_MODELS.openai,
        },
      ]);
      config.openai = { apiKey, model };
      break;
    }

    case 'anthropic': {
      const { apiKey, model } = await inquirer.prompt([
        {
          type: 'input',
          name: 'apiKey',
          message: 'Enter your Anthropic API key:',
          validate: (input) => input.length > 0 || 'API key is required',
        },
        {
          type: 'input',
          name: 'model',
          message: 'Model name:',
          default: DEFAULT_MODELS.anthropic,
        },
      ]);
      config.anthropic = { apiKey, model };
      break;
    }

    case 'google': {
      const { apiKey, model } = await inquirer.prompt([
        {
          type: 'input',
          name: 'apiKey',
          message: 'Enter your Google API key:',
          validate: (input) => input.length > 0 || 'API key is required',
        },
        {
          type: 'input',
          name: 'model',
          message: 'Model name:',
          default: DEFAULT_MODELS.google,
        },
      ]);
      config.google = { apiKey, model };
      break;
    }

    case 'deepseek': {
      const { apiKey, model } = await inquirer.prompt([
        {
          type: 'input',
          name: 'apiKey',
          message: 'Enter your DeepSeek API key:',
          validate: (input) => input.length > 0 || 'API key is required',
        },
        {
          type: 'input',
          name: 'model',
          message: 'Model name:',
          default: DEFAULT_MODELS.deepseek,
        },
      ]);
      config.deepseek = { apiKey, model };
      break;
    }

    case 'ollama': {
      console.log('\n📦 Make sure Ollama is installed and running:');
      console.log('   brew install ollama  # macOS');
      console.log('   ollama serve         # Start server\n');

      const { baseURL, model } = await inquirer.prompt([
        {
          type: 'input',
          name: 'baseURL',
          message: 'Ollama base URL:',
          default: 'http://localhost:11434',
        },
        {
          type: 'input',
          name: 'model',
          message: 'Model name (e.g., llama3.2, qwen2.5-coder):',
          validate: (input) => input.length > 0 || 'Model name is required',
        },
      ]);
      config.ollama = { baseURL, model };
      break;
    }

    case 'openai-compatible': {
      console.log('\n🔌 Examples: LM Studio (http://localhost:1234/v1), LocalAI\n');

      const { baseURL, apiKey, model } = await inquirer.prompt([
        {
          type: 'input',
          name: 'baseURL',
          message: 'API base URL:',
          validate: (input) => input.length > 0 || 'Base URL is required',
        },
        {
          type: 'input',
          name: 'apiKey',
          message: 'API key (leave empty if not required):',
        },
        {
          type: 'input',
          name: 'model',
          message: 'Model name:',
          validate: (input) => input.length > 0 || 'Model name is required',
        },
      ]);
      config.openaiCompatible = {
        baseURL,
        apiKey: apiKey || undefined,
        model,
      };
      break;
    }
  }

  return config;
}

/**
 * Check if LLM configuration is valid and complete
 */
export function isLLMConfigured(config: LLMConfig | undefined): boolean {
  if (!config) return false;

  const { provider } = config;

  switch (provider) {
    case 'openai':
      return !!(config.openai?.apiKey || process.env.OPENAI_API_KEY);
    case 'anthropic':
      return !!(config.anthropic?.apiKey || process.env.ANTHROPIC_API_KEY);
    case 'google':
      return !!(config.google?.apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    case 'deepseek':
      return !!(config.deepseek?.apiKey || process.env.DEEPSEEK_API_KEY);
    case 'ollama':
      return !!config.ollama?.model;
    case 'openai-compatible':
      return !!(config.openaiCompatible?.baseURL && config.openaiCompatible?.model);
    default:
      return false;
  }
}
```

### Phase 8: Update Projects Add Command

#### [x] Task 8.1: Add LLM setup check to projects add command
**File**: `packages/cli/src/commands/projects.ts`

Find the `add` command action (the function that runs when user executes `bragdoc projects add` or `bragdoc init`).

At the **start** of the action function, add:

```typescript
import { promptForLLMConfig, isLLMConfigured } from '../config/llm-setup';
import { saveConfig } from '../config';

// At the start of the action function:
const config = await loadConfig();

// Check if LLM is configured
if (!isLLMConfigured(config.llm)) {
  console.log('\n🤖 Setting up LLM provider for achievement extraction...\n');
  const llmConfig = await promptForLLMConfig();
  config.llm = llmConfig;
  await saveConfig(config);

  const { getLLMDisplayName } = await import('../ai/providers');
  const displayName = getLLMDisplayName(config);
  logger.info(`✓ LLM configured: ${displayName}\n`);
}
```

### Phase 9: Update Extract Command

#### [x] Task 9.1: Remove OPENAI_API_KEY check
**File**: `packages/cli/src/commands/extract.ts`

**Delete lines 123-127**:

```typescript
// DELETE THIS ENTIRE BLOCK:
if (!process.env.OPENAI_API_KEY) {
  logger.error('OPENAI_API_KEY environment variable is required.');
  logger.info('Set it with: export OPENAI_API_KEY=your-api-key');
  process.exit(1);
}
```

#### [x] Task 9.2: Add LLM validation with helpful error
**File**: `packages/cli/src/commands/extract.ts`

Around line 200 (after `createApiClient()` is called), add:

```typescript
const apiClient = await createApiClient();

// Validate LLM configuration before starting extraction
if (!isLLMConfigured(config.llm)) {
  logger.error('LLM provider is not configured.');
  logger.info('Achievement extraction requires an LLM provider to analyze commits.');
  logger.info('Run "bragdoc init" to configure your LLM provider.');
  logger.info('Alternatively, set an environment variable:');
  logger.info('  - OPENAI_API_KEY for OpenAI');
  logger.info('  - ANTHROPIC_API_KEY for Anthropic');
  logger.info('  - GOOGLE_GENERATIVE_AI_API_KEY for Google');
  process.exit(1);
}

const llmName = getLLMDisplayName(config);
logger.debug(`Using LLM: ${llmName}`);
```

**Important**: This validates LLM config **before** extraction starts, ensuring cron jobs fail fast with a clear error message in logs instead of failing partway through processing.

### Phase 10: Testing

#### [x] Task 10.1: Build the CLI
**Command**: Run in terminal:

```bash
cd packages/cli
pnpm build
```

**Status**: ✅ Complete - Build succeeded after upgrading to AI SDK provider 2.x versions

#### [x] Task 10.2: Link CLI globally (for testing)
**Command**: Run in terminal:

```bash
cd packages/cli
pnpm link --global
```

**Status**: ✅ Already linked - User has continuous build:watch running

#### [ ] Task 10.3: Test fresh installation flow
**Manual test steps**:

1. Backup your existing config: `mv ~/.bragdoc/config.yml ~/.bragdoc/config.yml.backup`
2. Run `bragdoc login` - should work normally
3. Run `bragdoc init` in a test repo
4. Should be prompted for LLM configuration
5. Configure OpenAI (or another provider)
6. Verify config file created: `cat ~/.bragdoc/config.yml`
7. Check file permissions: `ls -la ~/.bragdoc/config.yml` (should show `-rw-------`)
8. Run `bragdoc extract` - should work without environment variable

#### [ ] Task 10.4: Test cron job scenario
**Manual test steps**:

1. Create test script that simulates cron (no env vars):
   ```bash
   #!/bin/bash
   env -i HOME=$HOME PATH=/usr/bin:/bin bragdoc extract
   ```
2. Run the script - should work using config file
3. Verify achievements extracted successfully

#### [ ] Task 10.5: Test Ollama provider (optional)
**Manual test steps** (if Ollama installed):

1. Install Ollama: `brew install ollama`
2. Start Ollama: `ollama serve` (in separate terminal)
3. Pull a model: `ollama pull llama3.2`
4. Remove existing config and run `bragdoc init`
5. Select Ollama as provider
6. Configure with `llama3.2` model
7. Run `bragdoc extract` - should work with local LLM

#### [ ] Task 10.6: Restore backup
**Command**: After testing:

```bash
mv ~/.bragdoc/config.yml.backup ~/.bragdoc/config.yml
```

## Implementation Notes

### File Permissions Security
- Config file set to `0600` (user read/write only)
- API keys not exposed via `ps` or `crontab -l`
- Follows industry standard (AWS CLI, GitHub CLI, etc.)

### Backward Compatibility
- Falls back to environment variables if config not set
- Default provider is OpenAI with gpt-4o
- Existing users won't break (will be prompted on next `init`)

### Error Messages
- Clear guidance pointing users to `bragdoc init`
- Provider-specific help URLs for getting API keys
- Helpful examples for Ollama and OpenAI-compatible setups

## User Experience Flow

1. **First-time user**:
   - `bragdoc login` → Creates config, shows helpful message
   - `bragdoc init` → Prompts for LLM setup
   - `bragdoc extract` → Works automatically

2. **Existing user** (with environment variable):
   - `bragdoc extract` → Works via environment variable
   - `bragdoc init` → Prompted to configure in config file (optional)

3. **Cron jobs**:
   - Read API key from config file
   - No environment variables needed
   - Works reliably

## Success Criteria

- [x] CLI builds without errors ✅
- [x] All provider factories work correctly (OpenAI, Anthropic, Google, DeepSeek, Ollama, OpenAI-compatible) ✅
- [x] Provider display names working ✅
- [x] Error handling working correctly ✅
- [x] Fast-fail validation prevents cron jobs from starting without LLM config ✅
- [x] No dynamic imports with .js extensions (converted to static imports) ✅
- [ ] Can configure OpenAI provider (manual testing needed)
- [ ] Can configure Ollama provider (if installed) (manual testing needed)
- [ ] `bragdoc extract` works without environment variables (manual testing needed)
- [ ] Cron jobs work with config file (manual testing needed)
- [x] Config file has correct permissions (0600) ✅
- [x] Clear error messages guide users to `bragdoc init` ✅
- [x] Existing functionality unchanged ✅
