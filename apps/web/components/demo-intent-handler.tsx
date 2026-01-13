'use client';

import { useEffect, useRef } from 'react';
import {
  hasDemoIntentCookie,
  clearDemoIntentClientSide,
} from '@/lib/demo-intent';

/**
 * Demo Intent Handler Component
 *
 * Checks for demo intent cookie after authentication and automatically
 * enters per-user demo mode. Clears the cookie after processing.
 *
 * This component should be rendered in the app layout for authenticated users.
 * It runs once on mount and handles the transition into demo mode.
 */
interface DemoIntentHandlerProps {
  /**
   * Whether the user is already in demo mode
   * If true, skip checking for demo intent
   */
  isDemoMode: boolean;
}

export function DemoIntentHandler({
  isDemoMode,
}: DemoIntentHandlerProps): null {
  // Track if we've already run to prevent double execution in React 18 Strict Mode
  const hasRun = useRef(false);

  useEffect(() => {
    // Skip if already run or already in demo mode
    if (hasRun.current || isDemoMode) {
      return;
    }

    // Check for demo intent cookie
    if (!hasDemoIntentCookie()) {
      return;
    }

    // Mark as run to prevent duplicate execution
    hasRun.current = true;

    // Async function to handle demo mode toggle
    const handleDemoIntent = async () => {
      try {
        const res = await fetch('/api/demo-mode/toggle', {
          method: 'POST',
          credentials: 'include',
        });

        if (res.ok) {
          // Successfully entered demo mode - clear cookie and reload
          clearDemoIntentClientSide();
          window.location.reload();
        } else {
          // Toggle failed - still clear cookie to prevent retry loops
          const data = await res.json();
          console.error('Failed to auto-enter demo mode:', data.error);
          clearDemoIntentClientSide();
        }
      } catch (error) {
        // Request failed - clear cookie and log error
        console.error('Failed to auto-enter demo mode:', error);
        clearDemoIntentClientSide();
      }
    };

    handleDemoIntent();
  }, [isDemoMode]);

  return null;
}
