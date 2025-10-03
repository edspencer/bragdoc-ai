import { loadConfig } from '../config';
import { getApiBaseUrl } from '../config/paths';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: any,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class UnauthenticatedError extends ApiError {
  constructor() {
    super('Not authenticated. Please run `bragdoc login` first.', 401);
    this.name = 'UnauthenticatedError';
  }
}

interface ApiClientOptions {
  baseUrl?: string;
  token?: string;
}

/**
 * API client for making authenticated requests to the Bragdoc API
 */
export class ApiClient {
  private baseUrl: string;
  private token?: string;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl || '';
    this.token = options.token;
  }

  /**
   * Create an API client instance with config loaded from disk
   */
  static async create(): Promise<ApiClient> {
    const config = await loadConfig();
    const baseUrl = getApiBaseUrl(config);
    const token = config.auth?.token;

    return new ApiClient({ baseUrl, token });
  }

  /**
   * Make an authenticated GET request
   */
  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  /**
   * Make an authenticated POST request
   */
  async post<T>(path: string, body?: any): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  /**
   * Make an authenticated PUT request
   */
  async put<T>(path: string, body?: any): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  /**
   * Make an authenticated DELETE request
   */
  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  /**
   * Make an authenticated request to the API
   */
  private async request<T>(
    method: string,
    path: string,
    body?: any,
  ): Promise<T> {
    if (!this.token) {
      throw new UnauthenticatedError();
    }

    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        if (response.status === 401) {
          throw new UnauthenticatedError();
        }

        let errorMessage = `API request failed: ${response.statusText}`;
        let errorData;

        try {
          errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Response is not JSON, use statusText
        }

        throw new ApiError(errorMessage, response.status, errorData);
      }

      // Handle empty responses (e.g., 204 No Content)
      if (response.status === 204) {
        return undefined as T;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new Error(`Failed to make API request: ${(error as Error).message}`);
    }
  }

  /**
   * Create multiple achievements in batch
   */
  async createAchievements(
    achievements: Array<{
      title: string;
      summary?: string;
      details?: string;
      eventDuration: string;
      eventStart?: Date | null;
      eventEnd?: Date | null;
      projectId: string;
      companyId?: string | null;
      impact?: number;
      impactSource?: 'llm' | 'user';
      source?: 'llm' | 'manual';
    }>,
  ): Promise<any[]> {
    const results = [];
    for (const achievement of achievements) {
      const result = await this.post('/api/achievements', {
        ...achievement,
        eventStart: achievement.eventStart?.toISOString(),
        eventEnd: achievement.eventEnd?.toISOString(),
        impactUpdatedAt: new Date().toISOString(),
        source: achievement.source || 'llm',
        impactSource: achievement.impactSource || 'llm',
      });
      results.push(result);
    }
    return results;
  }

  /**
   * Check if the client is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.token;
  }
}

/**
 * Create a new API client instance
 */
export async function createApiClient(): Promise<ApiClient> {
  return ApiClient.create();
}
