'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  PROJECT_COLORS,
  PROJECT_COLOR_NAMES,
  WORKSTREAM_COLORS,
  WORKSTREAM_COLOR_NAMES,
  getColorIndex,
  getWorkstreamColorIndex,
} from '@/lib/colors';

interface ColorPickerProps {
  value?: string;
  onChange?: (color: string) => void;
  className?: string;
  variant?: 'project' | 'workstream';
}

export function ColorPicker({
  value,
  onChange,
  className,
  variant = 'project',
}: ColorPickerProps) {
  const colors = variant === 'workstream' ? WORKSTREAM_COLORS : PROJECT_COLORS;
  const colorNames =
    variant === 'workstream' ? WORKSTREAM_COLOR_NAMES : PROJECT_COLOR_NAMES;
  const getIndexFn =
    variant === 'workstream' ? getWorkstreamColorIndex : getColorIndex;

  const selectedIndex = value ? getIndexFn(value) : 0;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="grid grid-cols-8 gap-2">
        {colors.map((color, index) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange?.(color)}
            className={cn(
              'relative size-8 rounded-full border-2 transition-all hover:scale-110',
              selectedIndex === index
                ? 'border-foreground shadow-md'
                : 'border-border hover:border-foreground/50',
            )}
            style={{ backgroundColor: color }}
            title={colorNames[index]}
            aria-label={`Select ${colorNames[index]} color`}
          >
            {selectedIndex === index && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="size-2 bg-white rounded-full shadow-sm" />
              </div>
            )}
          </button>
        ))}
      </div>
      {value && (
        <div className="text-xs text-muted-foreground">
          Selected: {colorNames[getIndexFn(value)]}
        </div>
      )}
    </div>
  );
}
