import useSWR from 'swr';
import type { LLMProviderDbValue } from '@/database/schema';

/**
 * Masked LLM provider config as returned by GET /api/user/llm-config.
 * Never contains key material — only the last-4-chars hint.
 */
export interface LLMConfigSummary {
  id: string;
  provider: LLMProviderDbValue;
  model: string;
  baseURL: string | null;
  keyHint: string | null;
  isDefault: boolean;
  lastVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const fetchLLMConfigs = async (url: string): Promise<LLMConfigSummary[]> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch LLM configs');
  }
  const data = await res.json();
  return data.configs as LLMConfigSummary[];
};

export function useLLMConfigs() {
  const { data, error, mutate } = useSWR<LLMConfigSummary[]>(
    '/api/user/llm-config',
    fetchLLMConfigs,
  );

  return {
    configs: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}
