import { IconLayoutGrid, IconEdit } from '@tabler/icons-react';
import type { TourConfig } from './types';

export const PERFORMANCE_REVIEW_TOUR_CONFIG: TourConfig = {
  id: 'tour-performance-review',
  steps: [
    {
      icon: <IconLayoutGrid className="size-5" />,
      title: 'Three Views of Your Work',
      content:
        'Switch between the review document, underlying achievements, and workstream timeline.',
      selector: '#tour-perf-review-tabs',
      side: 'bottom',
      showControls: true,
      pointerPadding: 10,
      pointerRadius: 10,
    },
    {
      icon: <IconEdit className="size-5" />,
      title: 'Edit Your Review',
      content: 'Edit the review name, date range, or other details.',
      selector: '#tour-perf-review-edit',
      side: 'bottom',
      showControls: true,
      pointerPadding: 10,
      pointerRadius: 10,
    },
  ],
};
