'use client';

import { useState, useEffect } from 'react';
import { isDemoHelpEnabled } from '@/lib/demo-mode-utils';

/**
 * Return type for useDemoHelpDialog hook
 */
interface UseDemoHelpDialogReturn {
  /**
   * Whether the dialog is currently open
   */
  isOpen: boolean;

  /**
   * Function to set the dialog open/closed state
   */
  setIsOpen: (open: boolean) => void;
}

/**
 * Manages demo help dialog state with localStorage persistence
 *
 * Behavior:
 * - Automatically opens on first app view if demo mode is active (unless autoOpen is false)
 * - Saves "seen" status to localStorage with key: demo-help-seen
 * - User closing dialog prevents re-opening in same session
 * - Help button can always reopen dialog regardless of seen status
 *
 * @param isDemoMode - Whether user is in demo mode (from session.user.level === 'demo')
 * @param autoOpen - Whether to automatically open dialog on first view (default: true)
 * @returns { isOpen, setIsOpen } - Dialog state and setter
 *
 * @example
 * ```tsx
 * // Auto-open on first view (dashboard)
 * const { isOpen, setIsOpen } = useDemoHelpDialog(isDemoMode);
 *
 * // Disable auto-open (other pages)
 * const { isOpen, setIsOpen } = useDemoHelpDialog(isDemoMode, false);
 *
 * return (
 *   <>
 *     <DemoHelpDialog
 *       open={isOpen}
 *       onOpenChange={setIsOpen}
 *     />
 *   </>
 * );
 * ```
 */
export function useDemoHelpDialog(
  isDemoMode: boolean,
  autoOpen = true,
): UseDemoHelpDialogReturn {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only proceed if running in browser environment
    if (typeof window === 'undefined') {
      return;
    }

    // Check all conditions for opening dialog
    const shouldOpenDialog =
      autoOpen && // Auto-open is enabled
      isDemoHelpEnabled() && // Feature is enabled via env var
      isDemoMode && // User is in demo mode
      !localStorage.getItem('demo-help-seen'); // Dialog hasn't been seen

    if (shouldOpenDialog) {
      setIsOpen(true);
    }
  }, [isDemoMode, autoOpen]);

  // Handle dialog close - mark as seen in localStorage
  const handleSetIsOpen = (open: boolean) => {
    setIsOpen(open);

    // When closing dialog, mark as seen in localStorage
    if (!open && typeof window !== 'undefined') {
      try {
        localStorage.setItem('demo-help-seen', 'true');
      } catch (error) {
        // Gracefully handle localStorage unavailable (private browsing, etc.)
        console.warn('Failed to save demo help seen status:', error);
      }
    }
  };

  return {
    isOpen,
    setIsOpen: handleSetIsOpen,
  };
}
