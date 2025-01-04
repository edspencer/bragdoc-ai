import * as fs from 'node:fs';
import * as path from 'node:path';
import { get_encoding } from 'tiktoken';

const IGNORE_DIRS = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  path.join('migrations', 'meta')
];

const VALID_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.md',
  '.mdx',
  '.json',
  '.sql',
  '.css',
  '.scss',
  '.html'
];

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    
    if (IGNORE_DIRS.some(dir => fullPath.includes(dir))) {
      return;
    }

    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      const ext = path.extname(fullPath);
      if (VALID_EXTENSIONS.includes(ext)) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

async function main() {
  const rootDir = process.cwd();
  const files = getAllFiles(rootDir);
  const enc = get_encoding('cl100k_base');  // GPT-4 encoding
  
  let totalTokens = 0;
  const fileStats: { [key: string]: number } = {};

  files.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const tokens = enc.encode(content);
      const tokenCount = tokens.length;
      
      totalTokens += tokenCount;
      fileStats[path.relative(rootDir, file)] = tokenCount;
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  });

  // Sort files by token count
  const sortedStats = Object.entries(fileStats)
    .sort(([, a], [, b]) => b - a);

  console.log('\nTop 10 files by token count:');
  sortedStats.slice(0, 50).forEach(([file, count]) => {
    console.log(`${file}: ${count} tokens`);
  });

  console.log(`\nTotal files processed: ${files.length}`);
  console.log(`Total tokens in codebase: ${totalTokens}`);
  console.log(`Approximate cost to process (at $0.01 per 1K tokens): $${(totalTokens / 1000 * 0.01).toFixed(2)}`);

  enc.free();
}

main().catch(console.error);
