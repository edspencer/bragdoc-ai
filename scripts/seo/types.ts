// Keyword Types (self-contained, no database dependency)
export type KeywordType =
  | 'company_name'
  | 'system_name'
  | 'performance_review'
  | 'self_review'
  | 'achievement'
  | 'career_development'
  | 'product';

// API Response Types
export interface KeywordsEverywhereKeyword {
  keyword: string;
  vol: number;
  cpc: { value: string; currency: string };
  competition: number;
  trend: Array<{ month: string; year: number; value: number }>;
}

export interface KeywordsEverywhereResponse {
  data?: KeywordsEverywhereKeyword[];
  credits?: number;
  time?: number;
  error?: string;
  message?: string;
}

export interface RelatedKeywordsResponse {
  data?: string[]; // Just keyword strings, not objects with volume
  credits_consumed?: number;
  time_taken?: number;
  credits?: number;
  error?: string;
  message?: string;
}

export interface PASFResponse {
  data?: string[]; // Just keyword strings, not objects with volume
  credits_consumed?: number;
  time_taken?: number;
  credits?: number;
  error?: string;
  message?: string;
}

// Generated Keyword Type
export interface GeneratedKeyword {
  keyword: string;
  keywordType: KeywordType;
  entitySlug?: string;
}

// Stored Keyword Volume (what we save to JSON)
export interface StoredKeywordVolume {
  keyword: string;
  searchVolume: number;
  cpc: string | null;
  competition: number | null;
  trendData: number[];
  keywordType: KeywordType;
  entitySlug: string | null;
  country: string;
  fetchedAt: string; // ISO date string
}

// Client Options
export interface KeywordsEverywhereClientOptions {
  apiKey: string;
  country?: string;
  currency?: string;
  dataSource?: 'gkp' | 'cli';
}
