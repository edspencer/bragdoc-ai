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

/**
 * Lightweight achievement summary for API responses
 * Includes only fields needed for UI display with project/company context
 */
type AchievementSummary = {
  id: string;
  title: string;
  eventStart: Date | null;
  impact: number | null;
  summary: string | null;
  projectId: string | null;
  projectName: string | null;
  companyId: string | null;
  companyName: string | null;
};

/**
 * Achievement assignments grouped by workstream for incremental response
 */
type AssignmentByWorkstream = {
  workstreamId: string;
  workstreamName: string;
  workstreamColor: string;
  achievements: AchievementSummary[];
};

/**
 * Workstream details with achievements for full clustering response
 */
type WorkstreamDetail = {
  workstreamId: string;
  workstreamName: string;
  workstreamColor: string;
  isNew: boolean;
  achievements: AchievementSummary[];
};

type GenerateResultFull = {
  strategy: 'full';
  reason: string;
  embeddingsGenerated: number;
  workstreamsCreated: number;
  achievementsAssigned: number;
  outliers: number;
  metadata: any;
  // New fields for detailed breakdown
  workstreamDetails: WorkstreamDetail[];
  outlierAchievements: AchievementSummary[];
};

type GenerateResultIncremental = {
  strategy: 'incremental';
  reason: string;
  embeddingsGenerated: number;
  assigned: number;
  unassigned: number;
  // New fields for detailed breakdown
  assignmentsByWorkstream: AssignmentByWorkstream[];
  unassignedAchievements: AchievementSummary[];
};

type GenerateResult = GenerateResultFull | GenerateResultIncremental;

/**
 * Builds a workstreams API URL with optional date range parameters
 * @param startDate - Optional start date for filtering achievements
 * @param endDate - Optional end date for filtering achievements
 * @returns URL string for the API endpoint with query parameters
 */
function buildWorkstreamsUrl(startDate?: Date, endDate?: Date): string {
  const baseUrl = '/api/workstreams';

  if (!startDate && !endDate) {
    return baseUrl;
  }

  const params = new URLSearchParams();

  if (startDate) {
    // Convert Date to ISO string and extract YYYY-MM-DD format
    const dateStr = startDate.toISOString().split('T')[0];
    if (dateStr) params.append('startDate', dateStr);
  }

  if (endDate) {
    // Convert Date to ISO string and extract YYYY-MM-DD format
    const dateStr = endDate.toISOString().split('T')[0];
    if (dateStr) params.append('endDate', dateStr);
  }

  return `${baseUrl}?${params.toString()}`;
}

export function useWorkstreams(startDate?: Date, endDate?: Date) {
  const url = buildWorkstreamsUrl(startDate, endDate);
  const { data, error, isLoading } = useSWR<WorkstreamsResponse>(url, fetcher);
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

      // Refresh workstreams with the current URL (including date filters if present)
      await mutate(url);

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

    // Refresh workstreams to update counts with the current URL (including date filters if present)
    await mutate(url);
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

// Export types for use in UI components
export type {
  AchievementSummary,
  AssignmentByWorkstream,
  WorkstreamDetail,
  GenerateResultIncremental,
  GenerateResultFull,
  GenerateResult,
};
