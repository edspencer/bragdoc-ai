// A page that isn't built yet: a taped card saying what will be here. Each feature PR replaces its page's use of it.
import type { ReactNode } from 'react';
import { Card, Hand } from '../kit/index.ts';

export function Placeholder({ tape, children, testId }: { tape: string; children: ReactNode; testId?: string }) {
  return (
    <Card tape={tape} as="section" className="mx-auto mt-12 max-w-2xl rotate-[-0.5deg] px-6 pb-6 pt-8 sm:px-8" data-testid={testId ?? 'placeholder'}>
      <Hand className="text-[26px] text-accent">Coming soon</Hand>
      <div className="mt-2 text-[15px] leading-relaxed text-muted">{children}</div>
    </Card>
  );
}
