import * as React from 'react';
import { cn } from 'lib/utils';
import { Star } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from 'components/ui/tooltip';

const impactLabels: Record<number, string> = {
  1: 'Minimal Impact',
  2: 'Minor Impact',
  3: 'Low Impact',
  4: 'Low-Medium Impact',
  5: 'Medium Impact',
  6: 'Medium-High Impact',
  7: 'High Impact',
  8: 'Significant Impact',
  9: 'Major Impact',
  10: 'Exceptional Impact',
};

const impactDescriptions: Record<number, string> = {
  1: 'Minimal routine tasks',
  2: 'Small individual tasks',
  3: 'Routine improvements with individual benefit',
  4: 'Minor improvements with small team benefit',
  5: 'Notable improvements with team level impact',
  6: 'Significant improvements with department impact',
  7: 'Major improvements with cross-department impact',
  8: 'Significant initiatives with organization-wide impact',
  9: 'Major strategic initiatives with company-wide impact',
  10: 'Exceptional achievements with industry/market impact',
};

export interface ImpactRatingProps
  extends Omit<React.ComponentPropsWithoutRef<'div'>, 'onChange'> {
  value?: number | null;
  onChange?: (value: number) => void;
  source?: 'user' | 'llm' | null;
  readOnly?: boolean;
  updatedAt?: Date | null;
  showLabel?: boolean;
}

export function ImpactRating({
  value,
  onChange,
  source = 'llm',
  readOnly = false,
  updatedAt,
  className,
  showLabel = false,
  ...props
}: ImpactRatingProps) {
  const [hoveredValue, setHoveredValue] = React.useState<number | null>(null);

  const handleMouseEnter = (starValue: number) => {
    if (!readOnly) {
      setHoveredValue(starValue);
    }
  };

  const handleMouseLeave = () => {
    setHoveredValue(null);
  };

  const handleClick = (starValue: number) => {
    if (!readOnly && onChange) {
      onChange(starValue);
    }
  };

  const renderStar = (starValue: number) => {
    const effectiveValue = hoveredValue ?? value ?? 2;
    const isActive = effectiveValue >= starValue;
    const starClass = cn(
      'size-4 sm:size-6 transition-colors',
      isActive ? 'text-yellow-400' : 'text-gray-300',
      !readOnly && 'cursor-pointer hover:text-yellow-400',
      source === 'llm' && 'opacity-80',
    );

    const tooltipContent = (
      <div className="max-w-xs">
        <div className="font-semibold">
          {impactLabels[starValue as keyof typeof impactLabels]}
        </div>
        <div className="text-sm text-muted-foreground">
          {impactDescriptions[starValue as keyof typeof impactDescriptions]}
        </div>
        {starValue === (value ?? 2) && source && updatedAt && (
          <div className="mt-1 text-xs text-muted-foreground">
            Set by {source === 'llm' ? 'AI' : 'user'}
            {updatedAt && ` on ${new Date(updatedAt).toLocaleDateString()}`}
          </div>
        )}
      </div>
    );

    return (
      <TooltipProvider key={starValue}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Star
              className={starClass}
              onMouseEnter={() => handleMouseEnter(starValue)}
              onMouseLeave={handleMouseLeave}
              onClick={() => handleClick(starValue)}
              data-testid={`impact-star-${starValue}`}
              role="button"
              aria-label={`Rate impact ${starValue} out of 10 stars`}
            />
          </TooltipTrigger>
          <TooltipContent>{tooltipContent}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const getImpactLabel = (value: number) => {
    return impactLabels[value] || 'Unknown Impact';
  };

  return (
    <div className="flex items-center gap-4 md:gap-8">
      <div
        className={cn('flex items-center gap-1', className)}
        onMouseLeave={handleMouseLeave}
        tabIndex={0}
        role="button"
        {...props}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(renderStar)}
      </div>
      {showLabel ? (
        <span className="text-sm text-muted-foreground italic pt-2">
          {getImpactLabel(hoveredValue ?? value ?? 2)}
        </span>
      ) : null}
    </div>
  );
}
