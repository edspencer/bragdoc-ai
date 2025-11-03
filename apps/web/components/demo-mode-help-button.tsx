'use client';

import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';

/**
 * Props for DemoModeHelpButton component
 */
interface DemoModeHelpButtonProps {
  /**
   * Whether the button should be visible
   */
  isVisible: boolean;

  /**
   * Callback when help button is clicked
   */
  onClick: () => void;
}

/**
 * Demo Mode Help Button Component
 *
 * Small icon button displayed in the demo mode banner to reopen the help dialog.
 * Only visible when:
 * - Demo help feature is enabled
 * - User is in demo mode
 * - Current page has help content
 *
 * Features:
 * - Help circle icon (question mark variant)
 * - Hover state for clarity
 * - Accessible tooltip via title attribute
 * - Fits within banner height constraint (40px)
 *
 * @example
 * ```tsx
 * <DemoModeHelpButton
 *   isVisible={isDemoMode && isDemoHelpEnabled()}
 *   onClick={() => setIsOpen(true)}
 * />
 * ```
 */
export function DemoModeHelpButton({
  isVisible,
  onClick,
}: DemoModeHelpButtonProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      title="Click for help about demo mode"
      className="h-8 w-8 p-0 rounded-full flex items-center justify-center hover:bg-amber-400 transition-colors"
      aria-label="Show help dialog"
    >
      <HelpCircle className="size-4 text-amber-950" />
    </Button>
  );
}
