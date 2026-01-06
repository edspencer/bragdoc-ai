'use client';

import { useState } from 'react';
import { IconChevronDown } from '@tabler/icons-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-0">
          <CollapsibleTrigger className="flex w-full items-center justify-between text-left">
            <div className="flex flex-col gap-1">
              <CardTitle>{title}</CardTitle>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            <IconChevronDown
              className={cn(
                'size-5 text-muted-foreground transition-transform duration-200',
                isOpen && 'rotate-180',
              )}
              aria-hidden="true"
            />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-4">{children}</CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
