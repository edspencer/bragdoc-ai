import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getConfigDir } from '../config/paths';

/**
 * Path to the welcome flag file
 */
function getWelcomeFlagPath(): string {
  return join(getConfigDir(), '.welcome-shown');
}

/**
 * Check if this is the first run (welcome message hasn't been shown)
 */
function isFirstRun(): boolean {
  return !existsSync(getWelcomeFlagPath());
}

/**
 * Mark that the welcome message has been shown
 */
function markWelcomeShown(): void {
  const configDir = getConfigDir();

  // Ensure config directory exists
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  // Create the flag file
  writeFileSync(getWelcomeFlagPath(), new Date().toISOString(), 'utf-8');
}

/**
 * Show the welcome message
 */
async function showWelcomeMessage(): Promise<void> {
  const chalk = (await import('chalk')).default;
  const boxen = (await import('boxen')).default;

  const message = `
${chalk.green('Get started:')}
  ${chalk.cyan('bragdoc login')}    - Authenticate with BragDoc
  ${chalk.cyan('bragdoc init')}     - Initialize your repo
  ${chalk.cyan('bragdoc extract')}  - Extract achievements

${chalk.dim('Learn more: https://bragdoc.ai/cli')}
`;

  console.log(
    boxen(message, {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
      title: '🎉 Welcome to BragDoc!',
      titleAlignment: 'center',
    }),
  );
}

/**
 * Check if this is the first run and show welcome message if so
 */
export async function checkAndShowWelcome(): Promise<void> {
  if (isFirstRun()) {
    await showWelcomeMessage();
    markWelcomeShown();
  }
}
