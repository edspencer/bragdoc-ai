#!/usr/bin/env node

const chalk = require('chalk');
const boxen = require('boxen').default || require('boxen');

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
    title: '🎉 BragDoc CLI installed!',
    titleAlignment: 'center',
  }),
);
