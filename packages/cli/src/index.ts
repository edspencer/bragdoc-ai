#!/usr/bin/env node

import { Command } from 'commander';
import { projectsCommand, initCommand } from './commands/projects';
import { extractCommand } from './commands/extract';
import { wipCommand } from './commands/wip';
import { authCommand, loginCommand, logoutCommand } from './commands/auth';
import { cacheCommand } from './commands/cache';
import { standupCommand } from './commands/standup';
import { dataCommand } from './commands/data';
import { llmCommand } from './commands/llm';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkAndShowWelcome } from './utils/welcome';

// Read version from package.json
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8'),
);

// Create a Commander program for the CLI:
const program = new Command();

program
  .name('bragdoc')
  .description('CLI tool for managing your brag document')
  .version(packageJson.version);

// Add commands
program.addCommand(projectsCommand);
program.addCommand(initCommand);
program.addCommand(extractCommand);
program.addCommand(wipCommand);
program.addCommand(authCommand);
program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(cacheCommand);
program.addCommand(standupCommand);
program.addCommand(dataCommand);
program.addCommand(llmCommand);

// Main async function to handle first-run check and command parsing
(async () => {
  // Check if this is the first run and show welcome message
  await checkAndShowWelcome();

  // Parse the command line args.
  program.parse(process.argv);
})();
