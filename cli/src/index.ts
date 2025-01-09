#!/usr/bin/env node

import { Command } from 'commander';
import { reposCommand } from './commands/repos';
import { extractCommand } from './commands/extract';

// Create a Commander program for the CLI:
const program = new Command();

program
  .name('bragdoc')
  .description('CLI tool for managing your brag document')
  .version('0.1.0');

// Add commands
program.addCommand(reposCommand);
program.addCommand(extractCommand);

// Parse the command line args.
program.parse(process.argv);
