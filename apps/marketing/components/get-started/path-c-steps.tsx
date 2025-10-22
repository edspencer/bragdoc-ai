import type React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export function PathCSteps() {
  return (
    <Card>
      <CardContent className="p-6 sm:p-8">
        <div className="space-y-8">
          <StepItem number={1} title="Start with Path B" subtitle="Week 1">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Use web app to understand the interface</li>
              <li>• Manually add a few achievements</li>
              <li>• Explore features</li>
            </ul>
          </StepItem>

          <StepItem number={2} title="Install CLI" subtitle="Week 2">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Follow Path A steps 1-4</li>
              <li>• Set up automatic extraction</li>
            </ul>
          </StepItem>

          <StepItem number={3} title="Best of Both" subtitle="Ongoing">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• CLI handles data collection automatically</li>
              <li>• Use web app for organization and reports</li>
              <li>• Maximum value with minimal effort</li>
            </ul>
          </StepItem>
        </div>
      </CardContent>
    </Card>
  );
}

function StepItem({
  number,
  title,
  subtitle,
  children,
}: {
  number: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 sm:gap-6">
      <div className="shrink-0">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
          {number}
        </div>
      </div>
      <div className="flex-1 space-y-3">
        <div className="mb-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">({subtitle})</p>
        </div>
        {children}
      </div>
    </div>
  );
}
