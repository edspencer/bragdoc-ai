#!/usr/bin/env tsx
/**
 * Ad-hoc SEO keyword research script
 *
 * Usage:
 *   pnpm seo:research "keyword1" "keyword2" "keyword3"
 *   pnpm seo:research --related "seed keyword"
 *   pnpm seo:research --pasf "seed keyword"
 *   pnpm seo:research --credits
 *
 * Examples:
 *   pnpm seo:research "performance review software" "employee review tool"
 *   pnpm seo:research --related "performance review"
 *   pnpm seo:research --pasf "self assessment"
 */

import { createKeywordsEverywhereClient } from './seo';

interface ParsedArgs {
  mode: 'keywords' | 'related' | 'pasf' | 'credits';
  keywords: string[];
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);

  if (args.includes('--credits')) {
    return { mode: 'credits', keywords: [] };
  }

  if (args.includes('--related')) {
    const idx = args.indexOf('--related');
    const keyword = args[idx + 1];
    if (!keyword) {
      console.error('Error: --related requires a keyword argument');
      process.exit(1);
    }
    return { mode: 'related', keywords: [keyword] };
  }

  if (args.includes('--pasf')) {
    const idx = args.indexOf('--pasf');
    const keyword = args[idx + 1];
    if (!keyword) {
      console.error('Error: --pasf requires a keyword argument');
      process.exit(1);
    }
    return { mode: 'pasf', keywords: [keyword] };
  }

  // Default: treat all args as keywords
  const keywords = args.filter((arg) => !arg.startsWith('--'));
  if (keywords.length === 0) {
    console.log(`
SEO Keyword Research Tool

Usage:
  pnpm seo:research "keyword1" "keyword2"    Get volume data for keywords
  pnpm seo:research --related "keyword"      Get related keywords
  pnpm seo:research --pasf "keyword"         Get "People Also Search For"
  pnpm seo:research --credits                Check remaining API credits

Examples:
  pnpm seo:research "performance review software" "brag document app"
  pnpm seo:research --related "self assessment"
`);
    process.exit(0);
  }

  return { mode: 'keywords', keywords };
}

async function main() {
  const apiKey = process.env.KEYWORDS_EVERYWHERE_API_KEY;
  if (!apiKey) {
    console.error(
      'Error: KEYWORDS_EVERYWHERE_API_KEY environment variable is required',
    );
    process.exit(1);
  }

  const { mode, keywords } = parseArgs();
  const client = createKeywordsEverywhereClient({ apiKey });

  switch (mode) {
    case 'credits': {
      const { credits } = await client.getCredits();
      console.log(`Remaining API credits: ${credits.toLocaleString()}`);
      break;
    }

    case 'keywords': {
      console.log(`\nFetching data for ${keywords.length} keyword(s)...\n`);
      const response = await client.getKeywordData(keywords);

      if (response.error) {
        console.error(`Error: ${response.error} - ${response.message}`);
        process.exit(1);
      }

      console.log('='.repeat(80));
      console.log('KEYWORD VOLUME DATA');
      console.log('='.repeat(80));

      // Sort by volume descending
      const sorted = (response.data || []).sort((a, b) => b.vol - a.vol);

      for (const kw of sorted) {
        const vol = kw.vol.toLocaleString().padStart(8);
        const cpc = kw.cpc?.value ? `$${kw.cpc.value}` : '$0.00';
        const comp = kw.competition
          ? (kw.competition * 100).toFixed(0) + '%'
          : '0%';
        console.log(
          `${vol} vol | ${cpc.padStart(7)} CPC | ${comp.padStart(4)} comp | ${kw.keyword}`,
        );

        // Show trend if available
        if (kw.trend && kw.trend.length > 0) {
          const trendStr = kw.trend
            .map((t) => t.value.toString().padStart(5))
            .join(' ');
          console.log(`         | Trend (12mo): ${trendStr}`);
        }
        console.log('');
      }

      console.log(`Remaining credits: ${response.credits?.toLocaleString()}`);
      break;
    }

    case 'related': {
      console.log(`\nFetching related keywords for: "${keywords[0]}"...\n`);
      const response = await client.getRelatedKeywords(keywords[0], 50);

      if (response.error) {
        console.error(`Error: ${response.error} - ${response.message}`);
        process.exit(1);
      }

      const relatedKeywords = response.data || [];
      console.log(
        `Found ${relatedKeywords.length} related keywords. Fetching volumes...\n`,
      );

      // Fetch volumes for the related keywords
      const volumeResponse = await client.getKeywordData(relatedKeywords);

      console.log('='.repeat(80));
      console.log('RELATED KEYWORDS (with volumes)');
      console.log('='.repeat(80));

      const sorted = (volumeResponse.data || []).sort((a, b) => b.vol - a.vol);

      for (const kw of sorted) {
        const vol = kw.vol.toLocaleString().padStart(8);
        const cpc = kw.cpc?.value ? `$${kw.cpc.value}` : '$0.00';
        const comp = kw.competition
          ? (kw.competition * 100).toFixed(0) + '%'
          : '0%';
        console.log(
          `${vol} vol | ${cpc.padStart(7)} CPC | ${comp.padStart(4)} comp | ${kw.keyword}`,
        );
      }

      console.log(`\nTotal related keywords: ${relatedKeywords.length}`);
      console.log(
        `Credits used: ~${response.credits_consumed || 0} (discovery) + ${relatedKeywords.length} (volumes)`,
      );
      console.log(
        `Remaining credits: ${volumeResponse.credits?.toLocaleString()}`,
      );
      break;
    }

    case 'pasf': {
      console.log(
        `\nFetching "People Also Search For" for: "${keywords[0]}"...\n`,
      );
      const response = await client.getPeopleAlsoSearchFor(keywords[0], 50);

      if (response.error) {
        console.error(`Error: ${response.error} - ${response.message}`);
        process.exit(1);
      }

      const pasfKeywords = response.data || [];
      console.log(
        `Found ${pasfKeywords.length} PASF keywords. Fetching volumes...\n`,
      );

      // Fetch volumes for the PASF keywords
      const volumeResponse = await client.getKeywordData(pasfKeywords);

      console.log('='.repeat(80));
      console.log('PEOPLE ALSO SEARCH FOR (with volumes)');
      console.log('='.repeat(80));

      const sorted = (volumeResponse.data || []).sort((a, b) => b.vol - a.vol);

      for (const kw of sorted) {
        const vol = kw.vol.toLocaleString().padStart(8);
        const cpc = kw.cpc?.value ? `$${kw.cpc.value}` : '$0.00';
        const comp = kw.competition
          ? (kw.competition * 100).toFixed(0) + '%'
          : '0%';
        console.log(
          `${vol} vol | ${cpc.padStart(7)} CPC | ${comp.padStart(4)} comp | ${kw.keyword}`,
        );
      }

      console.log(`\nTotal PASF keywords: ${pasfKeywords.length}`);
      console.log(
        `Credits used: ~${response.credits_consumed || 0} (discovery) + ${pasfKeywords.length} (volumes)`,
      );
      console.log(
        `Remaining credits: ${volumeResponse.credits?.toLocaleString()}`,
      );
      break;
    }
  }
}

main().catch(console.error);
