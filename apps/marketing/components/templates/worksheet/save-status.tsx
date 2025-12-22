'use client';

import { useState, useEffect } from 'react';
import { Check, Loader2, AlertCircle } from 'lucide-react';

interface SaveStatusProps {
  lastSaved: Date | null;
  isSaving: boolean;
  saveError: string | null;
}

/**
 * Format a date as relative time (e.g., "just now", "2 minutes ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffSeconds < 10) return 'just now';
  if (diffSeconds < 60) return `${diffSeconds} seconds ago`;
  if (diffMinutes === 1) return '1 minute ago';
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;

  return date.toLocaleDateString();
}

/**
 * Save status indicator showing saving state and last saved time.
 * Updates relative time display every minute.
 */
export function SaveStatus({
  lastSaved,
  isSaving,
  saveError,
}: SaveStatusProps) {
  const [, setTick] = useState(0);

  // Update relative time display every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  if (saveError) {
    return (
      <div
        className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400"
        role="status"
        aria-live="polite"
      >
        <AlertCircle className="w-4 h-4" />
        <span>{saveError}</span>
      </div>
    );
  }

  if (isSaving) {
    return (
      <div
        className="flex items-center gap-1.5 text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Saving...</span>
      </div>
    );
  }

  if (lastSaved) {
    return (
      <div
        className="flex items-center gap-1.5 text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <Check className="w-4 h-4 text-green-600 dark:text-green-500" />
        <span>Saved {formatRelativeTime(lastSaved)}</span>
      </div>
    );
  }

  return null;
}
