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
  /**
   * When true, renders without the Card wrapper (for embedding inside another container)
   */
  variant?: 'card' | 'bare';
}

export function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = true,
  children,
  variant = 'card',
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const content = (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger
        className={cn(
          'flex w-full items-center justify-between text-left',
          variant === 'bare' && 'py-2',
        )}
      >
        <div className="flex flex-col gap-1">
          {variant === 'card' ? (
            <CardTitle>{title}</CardTitle>
          ) : (
            <h3 className="text-base font-semibold">{title}</h3>
          )}
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
      <CollapsibleContent>
        <div className={cn(variant === 'card' ? 'pt-4' : 'pt-3')}>
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );

  if (variant === 'bare') {
    return content;
  }

  return (
    <Card>
      <CardHeader className="pb-0">{content}</CardHeader>
      <CardContent className="p-0" />
    </Card>
  );
}
