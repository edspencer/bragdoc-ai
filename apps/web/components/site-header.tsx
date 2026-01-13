import type * as React from 'react';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { DemoToggleWrapper } from '@/components/demo-toggle-wrapper';
import { cn } from '@/lib/utils';

export function SiteHeader({
  title = 'Achievement Dashboard',
  children,
  className,
}: {
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{title}</h1>
        <div
          className={cn(
            'ml-auto flex items-center justify-end gap-2',
            className,
          )}
        >
          <DemoToggleWrapper />
          {children}
        </div>
      </div>
    </header>
  );
}
