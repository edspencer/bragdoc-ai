import * as React from 'react';
import { cn } from '@/lib/utils';

const Container = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('container mx-auto px-4', className)}
    {...props}
  />
));
Container.displayName = 'Container';

export { Container };
