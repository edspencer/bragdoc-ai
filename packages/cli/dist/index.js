#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const repos_1 = require("./commands/repos");
const extract_1 = require("./commands/extract");
const auth_1 = require("./commands/auth");
const cache_1 = require("./commands/cache");
// Create a Commander program for the CLI:
const program = new commander_1.Command();
program
    .name('bragdoc')
    .description('CLI tool for managing your brag document')
    .version('0.1.0');
// Add commands
program.addCommand(repos_1.reposCommand);
program.addCommand(extract_1.extractCommand);
program.addCommand(auth_1.authCommand);
program.addCommand(auth_1.loginCommand);
program.addCommand(auth_1.logoutCommand);
program.addCommand(cache_1.cacheCommand);
// Parse the command line args.
program.parse(process.argv);
