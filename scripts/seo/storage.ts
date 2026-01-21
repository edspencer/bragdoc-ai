import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  GeneratedKeyword,
  KeywordsEverywhereKeyword,
  StoredKeywordVolume,
  KeywordType,
} from './types';

const DATA_DIR = path.join(process.cwd(), 'scripts', 'seo-data');
const VOLUMES_FILE = path.join(DATA_DIR, 'keyword-volumes.json');

/**
 * Ensure the data directory exists.
 */
async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

/**
 * Load existing keyword volumes from JSON file.
 */
export async function loadKeywordVolumes(): Promise<StoredKeywordVolume[]> {
  try {
    const content = await fs.readFile(VOLUMES_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return []; // File doesn't exist yet
  }
}

/**
 * Save keyword volumes to JSON file.
 */
export async function saveKeywordVolumes(
  data: StoredKeywordVolume[],
): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(VOLUMES_FILE, JSON.stringify(data, null, 2));
}

/**
 * Store keyword volume data from API response.
 * Merges with existing data (upsert by keyword+country).
 */
export async function storeKeywordData(
  apiData: KeywordsEverywhereKeyword[],
  keywordMap: Map<string, GeneratedKeyword>,
  country: string,
): Promise<number> {
  const existing = await loadKeywordVolumes();
  const existingMap = new Map(
    existing.map((kw) => [`${kw.keyword}:${kw.country}`, kw]),
  );

  let stored = 0;
  const now = new Date().toISOString();

  for (const item of apiData) {
    const kwData = keywordMap.get(item.keyword);
    if (!kwData) continue;

    const key = `${item.keyword}:${country}`;
    const trendValues = item.trend?.map((t) => t.value) || [];

    existingMap.set(key, {
      keyword: item.keyword,
      searchVolume: item.vol,
      cpc: item.cpc?.value || null,
      competition: item.competition,
      trendData: trendValues,
      keywordType: kwData.keywordType,
      entitySlug: kwData.entitySlug || null,
      country,
      fetchedAt: now,
    });

    stored++;
  }

  await saveKeywordVolumes(Array.from(existingMap.values()));
  return stored;
}

/**
 * Get top keywords by search volume.
 */
export async function getTopKeywords(
  limit: number = 50,
): Promise<StoredKeywordVolume[]> {
  const data = await loadKeywordVolumes();
  return data
    .filter((kw) => kw.searchVolume > 0)
    .sort((a, b) => b.searchVolume - a.searchVolume)
    .slice(0, limit);
}

/**
 * Get summary statistics for all keywords.
 */
export async function getSummaryStats(): Promise<{
  totalKeywords: number;
  totalVolume: number;
  avgVolume: number;
  keywordsWithVolume: number;
}> {
  const data = await loadKeywordVolumes();
  const withVolume = data.filter((kw) => kw.searchVolume > 0);
  const totalVolume = data.reduce((sum, kw) => sum + kw.searchVolume, 0);

  return {
    totalKeywords: data.length,
    totalVolume,
    avgVolume: data.length > 0 ? totalVolume / data.length : 0,
    keywordsWithVolume: withVolume.length,
  };
}

/**
 * Get volume aggregated by company.
 */
export async function getVolumeByCompany(limit: number = 10): Promise<
  Array<{
    entitySlug: string;
    totalVolume: number;
    keywordCount: number;
  }>
> {
  const data = await loadKeywordVolumes();
  const byCompany = new Map<
    string,
    { totalVolume: number; keywordCount: number }
  >();

  for (const kw of data) {
    if (!kw.entitySlug) continue;
    const existing = byCompany.get(kw.entitySlug) || {
      totalVolume: 0,
      keywordCount: 0,
    };
    existing.totalVolume += kw.searchVolume;
    existing.keywordCount++;
    byCompany.set(kw.entitySlug, existing);
  }

  return Array.from(byCompany.entries())
    .map(([entitySlug, stats]) => ({ entitySlug, ...stats }))
    .sort((a, b) => b.totalVolume - a.totalVolume)
    .slice(0, limit);
}

/**
 * Get volume aggregated by keyword type.
 */
export async function getVolumeByType(): Promise<
  Array<{
    keywordType: KeywordType;
    totalVolume: number;
    keywordCount: number;
  }>
> {
  const data = await loadKeywordVolumes();
  const byType = new Map<
    KeywordType,
    { totalVolume: number; keywordCount: number }
  >();

  for (const kw of data) {
    const existing = byType.get(kw.keywordType) || {
      totalVolume: 0,
      keywordCount: 0,
    };
    existing.totalVolume += kw.searchVolume;
    existing.keywordCount++;
    byType.set(kw.keywordType, existing);
  }

  return Array.from(byType.entries())
    .map(([keywordType, stats]) => ({ keywordType, ...stats }))
    .sort((a, b) => b.totalVolume - a.totalVolume);
}

/**
 * Get a specific keyword's data.
 */
export async function getKeywordByName(
  keyword: string,
  country: string = 'us',
): Promise<StoredKeywordVolume | null> {
  const data = await loadKeywordVolumes();
  return (
    data.find((kw) => kw.keyword === keyword && kw.country === country) || null
  );
}
