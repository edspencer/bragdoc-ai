#!/usr/bin/env tsx
import fs from 'node:fs/promises';
import path from 'node:path';
import { renderMDXFile } from '../lib/ai/mdx-prompt.server';

async function main() {
  // 1) Read the MDX file
  const filePath = path.resolve(
    './lib/ai/prompts/extract-commit-achievements.mdx'
  );
  const mdxSource = await fs.readFile(filePath, 'utf-8');

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

  const result = await renderMDXFile(mdxSource, data);

  console.log(result);
}

// Run the function; catch errors
main().catch((err) => {
  console.error('Error rendering MDX:', err);
  process.exit(1);
});
