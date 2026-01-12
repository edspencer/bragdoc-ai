'use client';

import { forwardRef } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderAddButtonProps {
  /** The label to display (e.g., "Add Achievement", "Add Workstream") */
  label: string;
  /** Click handler */
  onClick: () => void;
  /** Whether the button is in a loading state */
  isLoading?: boolean;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Optional tooltip/title text */
  title?: string;
}

/**
 * Standardized "Add" button for page headers.
 *
 * Use this component for all "Add [item]" buttons in page headers to ensure
 * consistent sizing, styling, and behavior across the app.
 *
 * Features:
 * - Consistent size and padding (default Button size = 36px height)
 * - Plus icon with loading state support
 * - Label hidden on mobile, visible on lg+ screens
 * - Works correctly in both light and dark modes
 *
 * @example
 * ```tsx
 * <SiteHeader title="Achievements">
 *   <HeaderAddButton
 *     label="Add Achievement"
 *     onClick={handleOpenDialog}
 *   />
 * </SiteHeader>
 * ```
 */
export const HeaderAddButton = forwardRef<
  HTMLButtonElement,
  HeaderAddButtonProps
>(({ label, onClick, isLoading = false, disabled = false, title }, ref) => {
  return (
    <Button
      ref={ref}
      onClick={onClick}
      disabled={disabled || isLoading}
      title={title || label}
    >
      {isLoading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <IconPlus className="size-4" />
      )}
      <span className="hidden lg:inline">{label}</span>
    </Button>
  );
});

HeaderAddButton.displayName = 'HeaderAddButton';
