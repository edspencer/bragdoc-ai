import type {
  KeywordsEverywhereClientOptions,
  KeywordsEverywhereResponse,
  RelatedKeywordsResponse,
  PASFResponse,
} from './types';

const API_BASE_URL = 'https://api.keywordseverywhere.com/v1';
const DEFAULT_RATE_LIMIT_DELAY = 1000;
const DEFAULT_MAX_RETRIES = 3;
const BATCH_SIZE = 100;

export class KeywordsEverywhereClient {
  private apiKey: string;
  private country: string;
  private currency: string;
  private dataSource: 'gkp' | 'cli';

  constructor(options: KeywordsEverywhereClientOptions) {
    this.apiKey = options.apiKey;
    this.country = options.country || 'us';
    this.currency = options.currency || 'USD';
    this.dataSource = options.dataSource || 'gkp';
  }

  /**
   * Get keyword data (volume, CPC, competition, trends) for a list of keywords.
   * Handles batching automatically (max 100 keywords per request).
   */
  async getKeywordData(
    keywords: string[],
    options?: {
      maxRetries?: number;
      onProgress?: (batch: number, total: number, credits: number) => void;
    },
  ): Promise<KeywordsEverywhereResponse> {
    const allData: KeywordsEverywhereResponse['data'] = [];
    const batches = Math.ceil(keywords.length / BATCH_SIZE);
    let remainingCredits = 0;

    for (let i = 0; i < batches; i++) {
      const batch = keywords.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
      const response = await this.fetchWithRetry(
        `${API_BASE_URL}/get_keyword_data`,
        { kw: batch },
        options?.maxRetries,
      );

      if (response.error) {
        return response;
      }

      if (response.data) {
        allData.push(...response.data);
      }

      remainingCredits = response.credits || 0;
      options?.onProgress?.(i + 1, batches, remainingCredits);

      // Rate limiting between batches
      if (i < batches - 1) {
        await this.sleep(DEFAULT_RATE_LIMIT_DELAY);
      }
    }

    return { data: allData, credits: remainingCredits };
  }

  /**
   * Get related keywords for a seed keyword.
   * Useful for keyword expansion and discovery.
   * Note: Returns just keyword strings, use getKeywordData() for volumes.
   */
  async getRelatedKeywords(
    keyword: string,
    num: number = 50,
  ): Promise<RelatedKeywordsResponse> {
    return this.fetchWithRetry(`${API_BASE_URL}/get_related_keywords`, {
      keyword,
      num,
    });
  }

  /**
   * Get "People Also Search For" keywords.
   * Returns keywords that users also search for after searching the seed keyword.
   * Note: Returns just keyword strings, use getKeywordData() for volumes.
   */
  async getPeopleAlsoSearchFor(
    keyword: string,
    num: number = 50,
  ): Promise<PASFResponse> {
    return this.fetchWithRetry(`${API_BASE_URL}/get_pasf_keywords`, {
      keyword,
      num,
    });
  }

  /**
   * Check remaining API credits.
   */
  async getCredits(): Promise<{ credits: number }> {
    const response = await fetch(`${API_BASE_URL}/account/credits`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
    });
    return response.json();
  }

  private async fetchWithRetry(
    url: string,
    body: Record<string, unknown>,
    maxRetries: number = DEFAULT_MAX_RETRIES,
  ): Promise<KeywordsEverywhereResponse> {
    let delay = DEFAULT_RATE_LIMIT_DELAY;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const response = await this.makeRequest(url, body);

      if (!response.error?.includes('429')) {
        return response;
      }

      if (attempt < maxRetries) {
        await this.sleep(delay);
        delay *= 2; // Exponential backoff
      }
    }

    return {
      error: 'Max retries exceeded',
      message: 'Rate limit not resolved',
    };
  }

  private async makeRequest(
    url: string,
    body: Record<string, unknown>,
  ): Promise<KeywordsEverywhereResponse> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...body,
        country: this.country,
        currency: this.currency,
        dataSource: this.dataSource,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return {
        error: `HTTP ${response.status}`,
        message: error.message || 'Unknown error',
      };
    }

    return response.json();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a Keywords Everywhere client instance.
 * Convenience factory function.
 */
export function createKeywordsEverywhereClient(
  options: KeywordsEverywhereClientOptions,
): KeywordsEverywhereClient {
  return new KeywordsEverywhereClient(options);
}
