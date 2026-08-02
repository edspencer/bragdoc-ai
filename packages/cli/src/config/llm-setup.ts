import { DEFAULT_MODELS, PROVIDER_OPTIONS } from '@bragdoc/ai';
import type { LLMConfig, LLMProvider } from '@bragdoc/ai';
import inquirer from 'inquirer';

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
          default: 'http://localhost:11434/api',
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
      console.log(
        '\n🔌 Examples: LM Studio (http://localhost:1234/v1), LocalAI\n',
      );

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
