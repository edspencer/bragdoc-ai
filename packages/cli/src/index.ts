#!/usr/bin/env node

import { Command } from 'commander';
import { reposCommand, initCommand } from './commands/repos';
import { extractCommand } from './commands/extract';
import { authCommand, loginCommand, logoutCommand } from './commands/auth';
import { cacheCommand } from './commands/cache';

// Create a Commander program for the CLI:
const program = new Command();

program
  .name('bragdoc')
  .description('CLI tool for managing your brag document')
  .version('0.1.0');

// Add commands
program.addCommand(reposCommand);
program.addCommand(initCommand);
program.addCommand(extractCommand);
program.addCommand(authCommand);
program.addCommand(loginCommand);
program.addCommand(logoutCommand);
program.addCommand(cacheCommand);

// Parse the command line args.
program.parse(process.argv);
