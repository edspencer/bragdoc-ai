'use client';

import { useState, useEffect, useCallback } from 'react';
import { TOUR_STORAGE_KEY } from '@/lib/demo-tour-config';

interface UseDemoTourReturn {
  /**
   * Whether the tour should be shown
   */
  showTour: boolean;

  /**
   * Whether the tour has been completed
   */
  isTourCompleted: boolean;

  /**
   * Start or restart the tour
   */
  startTour: () => void;

  /**
   * Mark the tour as completed (skip or finish)
   */
  completeTour: () => void;
}

/**
 * Manages tour state with localStorage persistence.
 * Tour auto-starts for users who haven't completed it.
 *
 * @returns Tour state and control functions
 */
export function useDemoTour(): UseDemoTourReturn {
  const [showTour, setShowTour] = useState(false);
  const [isTourCompleted, setIsTourCompleted] = useState(true);

  // Check localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const completed = localStorage.getItem(TOUR_STORAGE_KEY) === 'true';
      setIsTourCompleted(completed);

      // Auto-start tour if not completed
      if (!completed) {
        // Small delay to ensure dashboard elements are rendered
        const timer = setTimeout(() => {
          setShowTour(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    } catch (error) {
      console.warn('Failed to read tour completion status:', error);
    }
  }, []);

  const startTour = useCallback(() => {
    try {
      localStorage.removeItem(TOUR_STORAGE_KEY);
      setIsTourCompleted(false);
      setShowTour(true);
    } catch (error) {
      console.warn('Failed to start tour:', error);
    }
  }, []);

  const completeTour = useCallback(() => {
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, 'true');
      setIsTourCompleted(true);
      setShowTour(false);
    } catch (error) {
      console.warn('Failed to save tour completion:', error);
    }
  }, []);

  return {
    showTour,
    isTourCompleted,
    startTour,
    completeTour,
  };
}
