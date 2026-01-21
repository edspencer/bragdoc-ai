#!/usr/bin/env tsx
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  generateAllCompanyKeywords,
  getCompanySlugs,
  getSystemName,
  slugToCompanyName,
  GENERIC_KEYWORDS,
  getKeywordSummary,
  type GeneratedKeyword,
} from './seo';

const DATA_DIR = path.join(process.cwd(), 'scripts', 'seo-data');

interface ParsedArgs {
  dryRun: boolean;
  output: string;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  const dryRunIdx = args.indexOf('--dry-run');
  const outputIdx = args.indexOf('--output');

  return {
    dryRun: dryRunIdx >= 0,
    output:
      outputIdx >= 0 && args[outputIdx + 1]
        ? args[outputIdx + 1]
        : path.join(DATA_DIR, 'generated-keywords.json'),
  };
}

function logKeywordSummary(keywords: GeneratedKeyword[]): void {
  const summary = getKeywordSummary(keywords);
  console.log('\n=== Keyword Summary ===');
  console.log(`Total keywords: ${keywords.length}`);
  for (const [type, count] of Object.entries(summary)) {
    console.log(`  ${type}: ${count}`);
  }
}

async function main() {
  const { dryRun, output } = parseArgs();

  console.log('Generating SEO keywords...');
  if (dryRun) console.log('(DRY RUN - no files will be written)');

  // Use the library to generate company keywords
  const companyKeywords = await generateAllCompanyKeywords();
  const companySlugs = await getCompanySlugs();

  // Log companies with system names found
  for (const slug of companySlugs) {
    const systemName = await getSystemName(slug);
    if (systemName) {
      console.log(
        `  ${slugToCompanyName(slug)}: System name "${systemName}" found`,
      );
    }
  }

  // Combine company keywords with generic keywords
  const keywords = [...companyKeywords, ...GENERIC_KEYWORDS];

  // Log summary
  logKeywordSummary(keywords);

  if (!dryRun) {
    // Ensure data directory exists
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(output, JSON.stringify(keywords, null, 2));
    console.log(`\nKeywords written to: ${output}`);
  }
}

main().catch(console.error);
