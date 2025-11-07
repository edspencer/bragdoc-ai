import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import type { Workstream } from '@bragdoc/database';
import { toast } from 'sonner';

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

type GenerateResultFull = {
  strategy: 'full';
  reason: string;
  embeddingsGenerated: number;
  workstreamsCreated: number;
  achievementsAssigned: number;
  outliers: number;
  metadata: any;
};

type GenerateResultIncremental = {
  strategy: 'incremental';
  reason: string;
  embeddingsGenerated: number;
  assigned: number;
  unassigned: number;
};

type GenerateResult = GenerateResultFull | GenerateResultIncremental;

export function useWorkstreams() {
  const { data, error, isLoading } = useSWR<WorkstreamsResponse>(
    '/api/workstreams',
    fetcher,
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const generateWorkstreams = async (): Promise<GenerateResult> => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/workstreams/generate', {
        method: 'POST',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to generate workstreams');
      }

      const result = (await res.json()) as GenerateResult;

      // Show appropriate toast based on strategy
      if (result.strategy === 'full') {
        if (result.workstreamsCreated === 0) {
          // No patterns found
          toast.info('No clear patterns found', {
            description: `Your ${result.achievementsAssigned + result.outliers} achievements are quite diverse. We couldn't identify distinct workstream themes.`,
          });
        } else {
          toast.success('Workstreams created', {
            description: `Created ${result.workstreamsCreated} workstream${result.workstreamsCreated === 1 ? '' : 's'} from ${result.achievementsAssigned} achievement${result.achievementsAssigned === 1 ? '' : 's'}`,
          });
        }
      } else {
        // Incremental assignment
        if (result.assigned === 0) {
          toast.info('No assignments made', {
            description: `${result.unassigned} achievement${result.unassigned === 1 ? '' : 's'} didn't match existing workstreams closely enough`,
          });
        } else {
          toast.success('Achievements assigned', {
            description: `Assigned ${result.assigned} achievement${result.assigned === 1 ? '' : 's'} to workstreams`,
          });
        }
      }

      // Refresh workstreams
      await mutate('/api/workstreams');

      return result;
    } catch (error) {
      console.error('Failed to generate workstreams:', error);
      toast.error('Failed to update workstreams', {
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      });
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
