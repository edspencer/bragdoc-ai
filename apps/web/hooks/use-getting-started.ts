'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLLMConfigs } from '@/hooks/use-llm-config';
import { useDemoMode } from '@/components/demo-mode-provider';

/**
 * localStorage key for persisting getting started banner dismissal
 */
const GETTING_STARTED_STORAGE_KEY = 'getting-started-dismissed';

export interface ChecklistItem {
  id: string;
  label: string;
  isComplete: boolean;
}

interface UseGettingStartedParams {
  companiesCount: number;
  projectsCount: number;
  achievementsCount: number;
}

interface UseGettingStartedReturn {
  /**
   * Whether the getting started banner has been dismissed
   */
  isDismissed: boolean;

  /**
   * Dismiss the getting started banner (persists to localStorage)
   */
  dismiss: () => void;

  /**
   * Reset dismissal state (removes localStorage key)
   */
  reset: () => void;

  /**
   * Checklist items with completion status based on user data
   */
  checklistItems: ChecklistItem[];

  /**
   * Number of completed checklist items
   */
  completedCount: number;

  /**
   * Total number of checklist items
   */
  totalCount: number;
}

/**
 * Manages getting started banner state with localStorage persistence.
 * Provides checklist items with dynamic completion based on user data.
 *
 * @param params - User counts for determining checklist completion
 * @returns Banner state and control functions
 */
export function useGettingStarted({
  companiesCount,
  projectsCount,
  achievementsCount,
}: UseGettingStartedParams): UseGettingStartedReturn {
  const [isDismissed, setIsDismissed] = useState(true); // Default to true to prevent flash
  const { configs: llmConfigs } = useLLMConfigs();
  const { isDemoMode } = useDemoMode();

  // Demo mode runs on the platform key, so demo users are never nagged to
  // connect a provider. Treat "still loading" as complete to avoid a flash
  // of an incomplete item.
  const hasLLMConfig =
    isDemoMode || llmConfigs === undefined || llmConfigs.length > 0;

  // Check localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const dismissed =
        localStorage.getItem(GETTING_STARTED_STORAGE_KEY) === 'true';
      setIsDismissed(dismissed);
    } catch (error) {
      console.warn('Failed to read getting started dismissal status:', error);
      setIsDismissed(false); // Show banner on error
    }
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(GETTING_STARTED_STORAGE_KEY, 'true');
      setIsDismissed(true);
    } catch (error) {
      console.warn('Failed to dismiss getting started banner:', error);
    }
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(GETTING_STARTED_STORAGE_KEY);
      setIsDismissed(false);
    } catch (error) {
      console.warn('Failed to reset getting started banner:', error);
    }
  }, []);

  const checklistItems: ChecklistItem[] = useMemo(
    () => [
      {
        id: 'account',
        label: 'Create an account',
        isComplete: true, // Always true - user is logged in
      },
      {
        id: 'company',
        label: 'Add a company',
        isComplete: companiesCount > 0,
      },
      {
        id: 'project',
        label: 'Add a project',
        isComplete: projectsCount > 0,
      },
      {
        id: 'achievement',
        label: 'Add an achievement',
        isComplete: achievementsCount > 0,
      },
      {
        id: 'llm',
        label: 'Connect your AI provider',
        isComplete: hasLLMConfig,
      },
    ],
    [companiesCount, projectsCount, achievementsCount, hasLLMConfig],
  );

  const completedCount = useMemo(
    () => checklistItems.filter((item) => item.isComplete).length,
    [checklistItems],
  );

  const totalCount = checklistItems.length;

  // Auto-hide when onboarding is complete (all checklist items done,
  // including connecting an AI provider)
  const isOnboardingComplete = checklistItems.every((item) => item.isComplete);

  return {
    isDismissed: isDismissed || isOnboardingComplete,
    dismiss,
    reset,
    checklistItems,
    completedCount,
    totalCount,
  };
}
