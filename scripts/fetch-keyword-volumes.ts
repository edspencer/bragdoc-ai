#!/usr/bin/env tsx
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  createKeywordsEverywhereClient,
  storeKeywordData,
  getTopKeywords,
  type GeneratedKeyword,
} from './seo';

const DATA_DIR = path.join(process.cwd(), 'scripts', 'seo-data');

interface ParsedArgs {
  dryRun: boolean;
  country: string;
  input: string;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  const dryRunIdx = args.indexOf('--dry-run');
  const countryIdx = args.indexOf('--country');
  const inputIdx = args.indexOf('--input');

  return {
    dryRun: dryRunIdx >= 0,
    country:
      countryIdx >= 0 && args[countryIdx + 1] ? args[countryIdx + 1] : 'us',
    input:
      inputIdx >= 0 && args[inputIdx + 1]
        ? args[inputIdx + 1]
        : path.join(DATA_DIR, 'generated-keywords.json'),
  };
}

async function showTopKeywords(): Promise<void> {
  const topKeywords = await getTopKeywords(10);
  console.log('\nTop 10 keywords by search volume:');
  for (const kw of topKeywords) {
    const vol = kw.searchVolume.toLocaleString().padStart(8);
    const entity = kw.entitySlug ? `, ${kw.entitySlug}` : '';
    console.log(`  ${vol} - ${kw.keyword} (${kw.keywordType}${entity})`);
  }
}

async function main() {
  const { dryRun, country, input } = parseArgs();

  // Validate API key
  const apiKey = process.env.KEYWORDS_EVERYWHERE_API_KEY;
  if (!apiKey && !dryRun) {
    console.error(
      'Error: KEYWORDS_EVERYWHERE_API_KEY environment variable is required',
    );
    process.exit(1);
  }

  // Load keywords
  const keywords: GeneratedKeyword[] = JSON.parse(
    await fs.readFile(input, 'utf-8'),
  );
  console.log(`Loaded ${keywords.length} keywords from ${input}`);

  if (dryRun) {
    const batches = Math.ceil(keywords.length / 100);
    console.log('\nDRY RUN MODE');
    console.log(`Would make ${batches} API requests`);
    console.log(`Keywords per request: 100`);
    console.log(`Total keywords: ${keywords.length}`);
    console.log(`Estimated credits: ${keywords.length}`);
    console.log(`Country: ${country}`);
    return;
  }

  // Create client using the library
  const client = createKeywordsEverywhereClient({
    apiKey: apiKey!,
    country,
  });

  // Create keyword map for storage
  const keywordMap = new Map(keywords.map((k) => [k.keyword, k]));
  const keywordStrings = keywords.map((k) => k.keyword);

  // Fetch data using the library (handles batching automatically)
  console.log('\nFetching keyword volumes...');
  const response = await client.getKeywordData(keywordStrings, {
    onProgress: (batch, total, credits) => {
      console.log(
        `  Batch ${batch}/${total} complete. Remaining credits: ${credits}`,
      );
    },
  });

  if (response.error) {
    console.error(`Error: ${response.error} - ${response.message}`);
    process.exit(1);
  }

  // Store data using the library (saves to JSON file)
  const stored = await storeKeywordData(
    response.data || [],
    keywordMap,
    country,
  );

  console.log('\n' + '='.repeat(50));
  console.log('Fetch complete!');
  console.log(`  Keywords stored: ${stored}`);
  console.log(`  Remaining credits: ${response.credits}`);

  // Show top keywords
  await showTopKeywords();
}

main().catch(console.error);
