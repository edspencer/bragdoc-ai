'use client';

import type { ReactNode } from 'react';

interface PageZeroStateProps {
  /** Icon element to display at the top */
  icon: ReactNode;
  /** Title text */
  title: string;
  /** Content below the title (description, buttons, cards, etc.) */
  children: ReactNode;
  /** Max width class - defaults to max-w-2xl */
  maxWidth?: 'max-w-md' | 'max-w-lg' | 'max-w-xl' | 'max-w-2xl';
}

/**
 * Standardized zero state wrapper for pages.
 *
 * Use this component for empty/zero states on list pages to ensure
 * consistent layout and styling across the app.
 *
 * @example
 * ```tsx
 * <PageZeroState
 *   icon={<IconClipboardCheck className="h-6 w-6 text-primary" />}
 *   title="No Performance Reviews Yet"
 * >
 *   <p className="text-muted-foreground">
 *     Performance reviews help you compile your achievements...
 *   </p>
 *   <Button onClick={onCreateClick} size="lg">
 *     Create Your First Review
 *   </Button>
 * </PageZeroState>
 * ```
 */
export function PageZeroState({
  icon,
  title,
  children,
  maxWidth = 'max-w-2xl',
}: PageZeroStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center p-8 pt-16">
      <div className={`${maxWidth} w-full space-y-6`}>
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            {icon}
          </div>
          <h1 className="text-3xl font-bold">{title}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
