'use client';

import { AlertCircle } from 'lucide-react';
import { isDemoHelpEnabled } from '@/lib/demo-mode-utils';
import { DemoModeHelpButton } from './demo-mode-help-button';
import { DemoHelpDialog } from './demo-help-dialog';
import { useDemoHelpDialog } from '@/hooks/use-demo-help-dialog';
import { signOut } from '@/lib/better-auth/client';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';

/**
 * Props for DemoModeBanner component
 */
interface DemoModeBannerProps {
  /**
   * Whether the user is in demo mode (from session.user.level === 'demo')
   */
  isDemoMode: boolean;

  /**
   * Whether to auto-open the dialog on first visit (default: false)
   * Set to true for dashboard page
   */
  autoOpenDialog?: boolean;
}

/**
 * Demo Mode Banner Component
 *
 * Displays a full-width sticky banner at the top of the page for demo users.
 * Warns that data will be deleted on logout.
 * Includes help button to reopen the demo help dialog.
 *
 * Only shown when isDemoMode is true.
 * Can be suppressed with NEXT_PUBLIC_SUPRESSED_DEMO_BANNER=true (useful for screenshots).
 *
 * NOTE: This is a Client Component. The parent page passes isDemoMode as a prop.
 *
 * @example
 * ```tsx
 * <DemoModeBanner isDemoMode={isDemoMode} autoOpenDialog={true} />
 * ```
 */
export function DemoModeBanner({
  isDemoMode,
  autoOpenDialog = false,
}: DemoModeBannerProps) {
  // Dialog state management (auto-open based on prop)
  const { isOpen, setIsOpen } = useDemoHelpDialog(isDemoMode, autoOpenDialog);

  // Check if banner should be suppressed (for screenshots, etc.)
  const isSuppressed = process.env.NEXT_PUBLIC_SUPRESSED_DEMO_BANNER === 'true';

  // Only show for demo users and if not suppressed
  if (!isDemoMode || isSuppressed) {
    return null;
  }

  // Determine if help button should be visible (show on all pages when enabled)
  const showHelpButton = isDemoHelpEnabled();

  // Handle help button click
  const handleHelpClick = () => {
    setIsOpen(true);
  };

  // Handle create account click - logout and redirect to register
  const handleCreateAccount = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = '/register';
        },
      },
    });
  };

  return (
    <>
      <div className="fixed top-0 inset-x-0 z-50 h-[40px] bg-amber-500 text-amber-950 border-b border-amber-600">
        <div className="flex items-center justify-between px-2 h-full w-full text-sm">
          {/* Spacer to balance the help button on the right */}
          {showHelpButton && <div className="w-8 h-8" />}

          {/* Center: message and create account link */}
          <div className="flex items-center gap-2 flex-1 justify-center">
            <AlertCircle className="size-4" />
            <span className="font-medium">
              Demo Mode - Your data will be deleted when you log out
            </span>
            <span className="text-amber-900">|</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleCreateAccount}
                  className="text-amber-950 underline hover:no-underline font-medium"
                >
                  Create Free Account
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                Start fresh with a new account. Your demo data will be cleared
                and you'll begin with a blank slate.
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Right: help button */}
          {showHelpButton && (
            <DemoModeHelpButton isVisible={true} onClick={handleHelpClick} />
          )}
        </div>
      </div>

      {/* Demo Help Dialog */}
      {showHelpButton && (
        <DemoHelpDialog open={isOpen} onOpenChange={setIsOpen} />
      )}
    </>
  );
}
