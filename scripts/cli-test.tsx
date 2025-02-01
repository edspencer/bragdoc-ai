#!/usr/bin/env tsx
import path from 'node:path';
import { renderMDXPromptFile } from 'mdx-prompt';
import { renderToStaticMarkup } from 'react-dom/server';
import * as components from '../lib/ai/prompts/elements';

async function main() {
  // 1) Read the MDX file
  const filePath = path.resolve(
    './lib/ai/prompts/extract-commit-achievements.mdx'
  );

  // 2) Prepare some data to pass in as scope
  const data = {
    companies: [
      {
        name: 'Palo Alto Networks',
        id: 'Palo-Alto-Networks',
      },
    ],
    commits: [
      {
        message: 'Message',
        hash: 'Hash',
        author: 'Author',
        date: 'Date',
      },
    ],
  };

  const result = await renderMDXPromptFile({
    filePath,
    data,
    renderFn: renderToStaticMarkup,
    components,
  });

  console.log(result);
}

// Run the function; catch errors
main().catch((err) => {
  console.error('Error rendering MDX:', err);
  process.exit(1);
});
