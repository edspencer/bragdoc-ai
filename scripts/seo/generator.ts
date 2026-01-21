import * as fs from 'fs/promises';
import * as path from 'path';
import type { KeywordType, GeneratedKeyword } from './types';

// Generic seed keywords that don't depend on company data
export const GENERIC_KEYWORDS: GeneratedKeyword[] = [
  // Achievement/brag document keywords
  { keyword: 'brag document', keywordType: 'product' },
  { keyword: 'brag doc', keywordType: 'product' },
  { keyword: 'brag document template', keywordType: 'product' },
  { keyword: 'bragdoc', keywordType: 'product' },
  { keyword: 'work accomplishments examples', keywordType: 'achievement' },
  { keyword: 'how to track achievements at work', keywordType: 'achievement' },

  // Self review keywords
  { keyword: 'self review examples', keywordType: 'self_review' },
  { keyword: 'self assessment examples', keywordType: 'self_review' },
  { keyword: 'how to write a self assessment', keywordType: 'self_review' },
  {
    keyword: 'performance review examples for software engineers',
    keywordType: 'performance_review',
  },

  // Peer review keywords
  {
    keyword: 'peer review feedback examples',
    keywordType: 'performance_review',
  },
  {
    keyword: 'peer review comments examples',
    keywordType: 'performance_review',
  },

  // Career development keywords
  {
    keyword: 'how to get promoted as a software engineer',
    keywordType: 'career_development',
  },
  {
    keyword: 'engineering promotion document template',
    keywordType: 'career_development',
  },
  {
    keyword: 'quarterly accomplishments examples',
    keywordType: 'career_development',
  },
  { keyword: 'annual review preparation', keywordType: 'career_development' },
  { keyword: 'promotion document', keywordType: 'career_development' },
  {
    keyword: 'career development documentation',
    keywordType: 'career_development',
  },
];

/**
 * Generate keywords for a specific company.
 */
export function generateCompanyKeywords(
  companySlug: string,
  companyName: string,
  systemName: string | null,
): GeneratedKeyword[] {
  const keywords: GeneratedKeyword[] = [];
  const name = companyName.toLowerCase();

  // Company-based keywords
  keywords.push(
    {
      keyword: `${name} performance review`,
      keywordType: 'performance_review',
      entitySlug: companySlug,
    },
    {
      keyword: `${name} self review`,
      keywordType: 'self_review',
      entitySlug: companySlug,
    },
    {
      keyword: `${name} performance review examples`,
      keywordType: 'performance_review',
      entitySlug: companySlug,
    },
    {
      keyword: `${name} performance review tips`,
      keywordType: 'performance_review',
      entitySlug: companySlug,
    },
    {
      keyword: `${name} self assessment examples`,
      keywordType: 'self_review',
      entitySlug: companySlug,
    },
    {
      keyword: `how to write ${name} self review`,
      keywordType: 'self_review',
      entitySlug: companySlug,
    },
  );

  // System name keywords (if available)
  if (systemName) {
    keywords.push(
      {
        keyword: `${systemName.toLowerCase()} review`,
        keywordType: 'system_name',
        entitySlug: companySlug,
      },
      {
        keyword: `${systemName.toLowerCase()} performance review`,
        keywordType: 'system_name',
        entitySlug: companySlug,
      },
    );
  }

  return keywords;
}

/**
 * Generate keywords for a list of seed terms.
 * Useful for custom keyword research beyond companies.
 */
export function generateKeywordsFromSeeds(
  seeds: string[],
  keywordType: KeywordType,
  entitySlug?: string,
): GeneratedKeyword[] {
  return seeds.map((seed) => ({
    keyword: seed.toLowerCase(),
    keywordType,
    entitySlug,
  }));
}

/**
 * Get all company slugs from the companies directory.
 */
export async function getCompanySlugs(
  companiesDir?: string,
): Promise<string[]> {
  const dir = companiesDir || path.join(process.cwd(), 'companies');
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith('.') && name !== 'README.md');
}

/**
 * Extract system name from a company's performance-review.md file.
 */
export async function getSystemName(
  companySlug: string,
  companiesDir?: string,
): Promise<string | null> {
  const dir = companiesDir || path.join(process.cwd(), 'companies');
  const reviewPath = path.join(dir, companySlug, 'performance-review.md');

  try {
    const content = await fs.readFile(reviewPath, 'utf-8');

    // Look for "System Name: X" or "**System Name**: X" patterns
    const systemNameMatch = content.match(
      /\*\*?System Name\*?\*?:?\s*([^\n*]+)/i,
    );
    if (systemNameMatch) {
      return systemNameMatch[1].trim();
    }

    // Also check for patterns like "uses the **GRAD**"
    const namedSystemMatch = content.match(/uses the \*\*([A-Z]+)\*\*/);
    if (namedSystemMatch) {
      return namedSystemMatch[1];
    }

    return null;
  } catch {
    return null; // File doesn't exist
  }
}

/**
 * Convert a slug to a display name.
 */
export function slugToCompanyName(slug: string): string {
  const specialCases: Record<string, string> = {
    ibm: 'IBM',
    sap: 'SAP',
    'palo-alto-networks': 'Palo Alto Networks',
    'check-point': 'Check Point',
    tiktok: 'TikTok',
    hubspot: 'HubSpot',
    docusign: 'DocuSign',
    mongodb: 'MongoDB',
    servicenow: 'ServiceNow',
    crowdstrike: 'CrowdStrike',
    sentinelone: 'SentinelOne',
    zscaler: 'Zscaler',
  };

  if (specialCases[slug]) return specialCases[slug];

  // Default: capitalize first letter of each word
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate all keywords from company data.
 * This is a high-level function that handles the full workflow.
 */
export async function generateAllCompanyKeywords(
  companiesDir?: string,
): Promise<GeneratedKeyword[]> {
  const keywords: GeneratedKeyword[] = [];
  const companySlugs = await getCompanySlugs(companiesDir);

  for (const slug of companySlugs) {
    const companyName = slugToCompanyName(slug);
    const systemName = await getSystemName(slug, companiesDir);
    const companyKeywords = generateCompanyKeywords(
      slug,
      companyName,
      systemName,
    );
    keywords.push(...companyKeywords);
  }

  return keywords;
}

/**
 * Get summary statistics for a list of keywords.
 */
export function getKeywordSummary(
  keywords: GeneratedKeyword[],
): Partial<Record<KeywordType, number>> {
  const summary: Partial<Record<KeywordType, number>> = {};

  for (const kw of keywords) {
    summary[kw.keywordType] = (summary[kw.keywordType] || 0) + 1;
  }

  return summary;
}
