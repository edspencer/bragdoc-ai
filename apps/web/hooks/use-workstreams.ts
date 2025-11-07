import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import type { Workstream } from '@bragdoc/database';

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

interface WorkstreamsResponse {
  workstreams: Workstream[];
  metadata?: Record<string, unknown>;
  unassignedCount?: number;
  achievementCount?: number;
}

export function useWorkstreams() {
  const { data, error, isLoading } = useSWR<WorkstreamsResponse>(
    '/api/workstreams',
    fetcher,
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const generateWorkstreams = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/workstreams/generate', {
        method: 'POST',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to generate workstreams');
      }

      const result = await res.json();

      // Refresh workstreams
      await mutate('/api/workstreams');

      return result;
    } catch (error) {
      console.error('Failed to generate workstreams:', error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const assignWorkstream = async (
    achievementId: string,
    workstreamId: string | null,
  ) => {
    const res = await fetch('/api/workstreams/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ achievementId, workstreamId }),
    });

    if (!res.ok) {
      throw new Error('Failed to assign workstream');
    }

    // Refresh workstreams to update counts
    await mutate('/api/workstreams');
  };

  return {
    workstreams: data?.workstreams || [],
    metadata: data?.metadata,
    unassignedCount: data?.unassignedCount || 0,
    achievementCount: data?.achievementCount || 0,
    isLoading,
    error,
    generateWorkstreams,
    isGenerating,
    assignWorkstream,
  };
}
