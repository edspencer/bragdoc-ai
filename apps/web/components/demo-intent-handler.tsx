'use client';

import { useEffect, useRef, useState } from 'react';
import {
  hasDemoIntentCookie,
  clearDemoIntentClientSide,
} from '@/lib/demo-intent';
import { Loader2 } from 'lucide-react';

/**
 * Demo Intent Handler Component
 *
 * Checks for demo intent cookie after authentication and automatically
 * enters per-user demo mode. Shows a full-screen loading overlay while
 * processing to prevent the user from seeing an empty dashboard.
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
}: DemoIntentHandlerProps): React.ReactNode {
  // Track if we've already run to prevent double execution in React 18 Strict Mode
  const hasRun = useRef(false);

  // Check for demo intent on initial render (before useEffect)
  const [isProcessingDemoIntent, setIsProcessingDemoIntent] = useState(() => {
    // Only show loading if we have a demo intent cookie and not already in demo mode
    if (isDemoMode) return false;
    if (typeof document === 'undefined') return false;
    return hasDemoIntentCookie();
  });

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
          setIsProcessingDemoIntent(false);
        }
      } catch (error) {
        // Request failed - clear cookie and log error
        console.error('Failed to auto-enter demo mode:', error);
        clearDemoIntentClientSide();
        setIsProcessingDemoIntent(false);
      }
    };

    handleDemoIntent();
  }, [isDemoMode]);

  // Show full-screen loading overlay while processing demo intent
  if (isProcessingDemoIntent) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-amber-500" />
        <p className="mt-4 text-lg font-medium text-foreground">
          Loading demo data...
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Setting up your demo experience
        </p>
      </div>
    );
  }

  return null;
}
