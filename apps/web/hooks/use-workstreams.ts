import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import type { Workstream } from '@bragdoc/database';
import { toast } from 'sonner';

// Encouraging messages to show when processing takes a while
const ENCOURAGING_MESSAGES = [
  'Almost there...',
  'Still working...',
  'Processing...',
  'Just a moment...',
  'Working on it...',
  'Nearly done...',
  'Hang tight...',
  'Making progress...',
  'Crunching the numbers...',
  'Analyzing patterns...',
  'Fine-tuning results...',
  'Putting it together...',
  'One moment please...',
  'Getting there...',
  'Wrapping up...',
];

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
 * Request body for POST /api/workstreams/generate
 * Includes optional filter parameters for clustering
 */
interface GenerateWorkstreamsRequest {
  filters?: {
    timeRange?: {
      startDate: string; // ISO 8601 date (YYYY-MM-DD)
      endDate: string; // ISO 8601 date (YYYY-MM-DD)
    };
    projectIds?: string[];
  };
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

/**
 * Hook for workstream generation and assignment actions only (no data fetching)
 * Use this when you already have workstreams data from server-side rendering
 */
export function useWorkstreamsActions() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Simple effect: every time generationStatus changes, reset the 4-second timer
  useEffect(() => {
    // Clear any existing timeout
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = null;
    }

    // Set a new timeout if we're generating and have a status
    if (isGenerating && generationStatus) {
      statusTimeoutRef.current = setTimeout(() => {
        // After 4 seconds of no change, show a random encouraging message
        const randomIndex = Math.floor(
          Math.random() * ENCOURAGING_MESSAGES.length,
        );
        const randomMessage =
          ENCOURAGING_MESSAGES[randomIndex] || 'Processing...';
        setGenerationStatus(randomMessage);
      }, 4000);
    }

    // Cleanup on unmount or before next effect
    return () => {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, [generationStatus, isGenerating]);

  const generateWorkstreams = async (
    filters?: GenerateWorkstreamsRequest['filters'],
  ): Promise<GenerateResult> => {
    setIsGenerating(true);
    setGenerationStatus('Analyzing achievements...');

    try {
      const requestBody: GenerateWorkstreamsRequest = {};
      if (filters) {
        requestBody.filters = filters;
      }

      const response = await fetch('/api/workstreams/generate', {
        method: 'POST',
        headers: requestBody.filters
          ? { 'Content-Type': 'application/json' }
          : undefined,
        body: requestBody.filters ? JSON.stringify(requestBody) : undefined,
      });

      if (!response.ok) {
        throw new Error('Failed to generate workstreams');
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';
      let result: GenerateResult | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'progress') {
                // Update status based on phase
                let newStatus = '';
                if (data.phase === 'workstreams_created') {
                  newStatus = data.message;
                } else if (data.phase === 'achievements_assigned') {
                  newStatus = data.message;
                } else if (data.phase === 'generating_names') {
                  newStatus = data.message;
                } else if (data.phase === 'refreshing') {
                  newStatus = 'Refreshing...';
                }

                if (newStatus) {
                  setGenerationStatus(newStatus);
                }
              } else if (data.type === 'complete') {
                result = data.result as GenerateResult;
                setGenerationStatus('Refreshing...');
              } else if (data.type === 'error') {
                throw new Error(data.message);
              }
            } catch (e) {
              console.error('Failed to parse SSE message:', e);
            }
          }
        }
      }

      if (!result) {
        throw new Error('No result received from server');
      }

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

      // Refresh server components to update workstreams data
      router.refresh();

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
      setGenerationStatus('');
      // Clear any remaining timeout
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
        statusTimeoutRef.current = null;
      }
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

    // Refresh server components to update workstreams data
    router.refresh();
  };

  return {
    generateWorkstreams,
    isGenerating,
    generationStatus,
    assignWorkstream,
  };
}

/**
 * Hook for workstreams data fetching with SWR
 * Use this when you need client-side data fetching (e.g., in pages that aren't server-rendered)
 */
export function useWorkstreams(startDate?: Date, endDate?: Date) {
  const url = buildWorkstreamsUrl(startDate, endDate);
  const { data, error, isLoading } = useSWR<WorkstreamsResponse>(url, fetcher);
  const actions = useWorkstreamsActions();

  return {
    workstreams: data?.workstreams || [],
    metadata: data?.metadata,
    unassignedCount: data?.unassignedCount || 0,
    achievementCount: data?.achievementCount || 0,
    isLoading,
    error,
    ...actions,
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
