import * as React from 'react';
import { cn } from './utils';

const Spinner = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 h-6 w-6',
      className
    )}
    {...props}
  />
));
Spinner.displayName = 'Spinner';

export { Spinner };