#!/usr/bin/env tsx
import * as fs from 'fs';
import {
  getSummaryStats,
  getTopKeywords,
  getVolumeByCompany,
  getVolumeByType,
  slugToCompanyName,
} from './seo';

interface ParsedArgs {
  csv: boolean;
  output: string;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  const csvIdx = args.indexOf('--csv');
  const outputIdx = args.indexOf('--output');

  return {
    csv: csvIdx >= 0,
    output:
      outputIdx >= 0 && args[outputIdx + 1]
        ? args[outputIdx + 1]
        : 'keyword-volumes.csv',
  };
}

function exportToCsv(
  keywords: Awaited<ReturnType<typeof getTopKeywords>>,
  outputPath: string,
): void {
  const headers = [
    'keyword',
    'search_volume',
    'cpc',
    'competition',
    'keyword_type',
    'entity_slug',
  ];
  const rows = keywords.map((kw) => [
    `"${kw.keyword}"`,
    kw.searchVolume,
    kw.cpc || '',
    kw.competition || '',
    kw.keywordType,
    kw.entitySlug || '',
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  fs.writeFileSync(outputPath, csv);
}

async function main() {
  const { csv, output } = parseArgs();

  console.log('=== Keyword Volume Summary ===\n');

  // Summary stats (using library)
  const stats = await getSummaryStats();
  console.log(`Total keywords: ${stats.totalKeywords}`);
  console.log(`Keywords with volume > 0: ${stats.keywordsWithVolume}`);
  console.log(
    `Total monthly search volume: ${stats.totalVolume.toLocaleString()}`,
  );
  console.log(
    `Average volume: ${Math.round(stats.avgVolume).toLocaleString()}`,
  );

  // Top keywords (using library)
  console.log('\n=== Top 10 Keywords ===');
  const topKeywords = await getTopKeywords(10);
  for (const kw of topKeywords) {
    const vol = kw.searchVolume.toLocaleString().padStart(8);
    const entity = kw.entitySlug ? `, ${kw.entitySlug}` : '';
    console.log(`  ${vol} - ${kw.keyword} (${kw.keywordType}${entity})`);
  }

  // By company (using library)
  console.log('\n=== By Company (Top 10) ===');
  const byCompany = await getVolumeByCompany();
  for (let i = 0; i < byCompany.length; i++) {
    const c = byCompany[i];
    const vol = c.totalVolume.toLocaleString();
    console.log(
      `  ${i + 1}. ${slugToCompanyName(c.entitySlug)}: ${vol} monthly searches`,
    );
  }

  // By type (using library)
  console.log('\n=== By Keyword Type ===');
  const byType = await getVolumeByType();
  const totalVol = byType.reduce((sum, t) => sum + t.totalVolume, 0);
  for (const t of byType) {
    const vol = t.totalVolume.toLocaleString().padStart(10);
    const pct =
      totalVol > 0 ? ((t.totalVolume / totalVol) * 100).toFixed(1) : '0.0';
    console.log(`  ${t.keywordType}: ${vol} (${pct}%)`);
  }

  // CSV export
  if (csv) {
    const allKeywords = await getTopKeywords(1000);
    exportToCsv(allKeywords, output);
    console.log(`\nCSV exported to: ${output}`);
  }
}

main().catch(console.error);
