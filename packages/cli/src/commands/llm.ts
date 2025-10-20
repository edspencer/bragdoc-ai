import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, saveConfig } from '../config';
import { promptForLLMConfig, isLLMConfigured } from '../config/llm-setup';
import { getLLMDisplayName } from '../ai/providers';

/**
 * Show current LLM configuration
 */
async function showLLM() {
  try {
    const config = await loadConfig();

    if (!isLLMConfigured(config.llm)) {
      console.log(chalk.yellow('⚠️  No LLM provider configured'));
      console.log(
        chalk.blue(
          '\n💡 Run "bragdoc llm set" to configure your LLM provider.',
        ),
      );
      return;
    }

    const displayName = getLLMDisplayName(config);
    console.log(chalk.green('✓ LLM Provider Configured'));
    console.log(chalk.bold(`\n  ${displayName}`));

    // Show some additional details based on provider
    const llmConfig = config.llm!;
    switch (llmConfig.provider) {
      case 'openai':
        if (llmConfig.openai?.baseURL) {
          console.log(chalk.dim(`  Base URL: ${llmConfig.openai.baseURL}`));
        }
        break;
      case 'deepseek':
        if (llmConfig.deepseek?.baseURL) {
          console.log(chalk.dim(`  Base URL: ${llmConfig.deepseek.baseURL}`));
        }
        break;
      case 'ollama':
        console.log(
          chalk.dim(
            `  Base URL: ${llmConfig.ollama?.baseURL || 'http://localhost:11434/api'}`,
          ),
        );
        break;
      case 'openai-compatible':
        console.log(
          chalk.dim(`  Base URL: ${llmConfig.openaiCompatible?.baseURL}`),
        );
        break;
    }

    console.log(chalk.dim('\nConfiguration stored in: ~/.bragdoc/config.yml'));
  } catch (error: any) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

/**
 * Set/update LLM configuration
 */
async function setLLM() {
  try {
    const config = await loadConfig();

    // Check if already configured and ask if they want to reconfigure
    if (isLLMConfigured(config.llm)) {
      const displayName = getLLMDisplayName(config);
      console.log(chalk.yellow(`\n⚠️  LLM provider already configured:`));
      console.log(chalk.bold(`  ${displayName}\n`));

      // Simple confirmation using inquirer
      const inquirer = await import('inquirer');
      const { confirm } = await inquirer.default.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Do you want to reconfigure?',
          default: false,
        },
      ]);

      if (!confirm) {
        console.log(chalk.blue('Configuration unchanged.'));
        return;
      }
    }

    // Run the interactive LLM configuration
    const llmConfig = await promptForLLMConfig();
    config.llm = llmConfig;
    await saveConfig(config);

    const displayName = getLLMDisplayName(config);
    console.log(chalk.green(`\n✓ LLM provider configured: ${displayName}`));
    console.log(chalk.dim('Configuration saved to: ~/.bragdoc/config.yml\n'));
  } catch (error: any) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export const llmCommand = new Command('llm')
  .description('Manage LLM provider configuration')
  .addCommand(
    new Command('show')
      .description('Show current LLM configuration')
      .action(showLLM),
  )
  .addCommand(
    new Command('set').description('Configure LLM provider').action(setLLM),
  );
