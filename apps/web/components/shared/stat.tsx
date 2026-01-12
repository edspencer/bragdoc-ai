import * as React from 'react';
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatProps {
  /** The label/description shown above the value */
  label: string;
  /** The main stat value to display */
  value: string | number;
  /** Badge content (icon + text) */
  badge?: {
    icon: React.ReactNode;
    label: string;
  };
  /** Footer heading with optional icon */
  footerHeading?: {
    text: string;
    icon?: React.ReactNode;
  };
  /** Footer description text */
  footerDescription?: string;
  /** Additional className for the card */
  className?: string;
  /** If true, adds hover effects for clickable stats */
  clickable?: boolean;
  /** Optional id attribute for the card element (e.g., for guided tours) */
  id?: string;
}

export function Stat({
  label,
  value,
  badge,
  footerHeading,
  footerDescription,
  className,
  clickable = false,
  id,
}: StatProps) {
  return (
    <Card
      id={id}
      className={cn(
        '@container/card',
        'from-primary/5 to-card bg-linear-to-t shadow-xs',
        'dark:bg-card',
        clickable && 'cursor-pointer transition-colors hover:bg-muted/50',
        className,
      )}
    >
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
        {badge && (
          <CardAction className="hidden md:flex">
            <Badge variant="outline">
              {badge.icon}
              {badge.label}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      {(footerHeading || footerDescription) && (
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          {footerHeading && (
            <div className="line-clamp-1 flex gap-2 font-medium">
              {footerHeading.text} {footerHeading.icon}
            </div>
          )}
          {footerDescription && (
            <div className="text-muted-foreground">{footerDescription}</div>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
