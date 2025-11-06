'use client';

import { Badge } from '@/components/ui/badge';
import type { Workstream } from '@bragdoc/database';

interface WorkstreamBadgeProps {
  workstream: Workstream;
  onRemove?: () => void;
}

export function WorkstreamBadge({
  workstream,
  onRemove,
}: WorkstreamBadgeProps) {
  const color = workstream.color || '#3B82F6';
  return (
    <Badge variant="outline" style={{ borderColor: color, color }}>
      {workstream.name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 hover:text-destructive"
          aria-label="Remove workstream"
        >
          ×
        </button>
      )}
    </Badge>
  );
}
