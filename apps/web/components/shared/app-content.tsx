import type * as React from 'react';
import { cn } from '@/lib/utils';

export function AppContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div
          className={cn('flex flex-col gap-2 p-2 md:p-6 md:gap-6', className)}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
