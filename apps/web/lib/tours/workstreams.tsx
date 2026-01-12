import {
  IconTimeline,
  IconPlus,
  IconLayersSubtract,
} from '@tabler/icons-react';
import type { TourConfig } from './types';

export const WORKSTREAMS_TOUR_CONFIG: TourConfig = {
  id: 'tour-workstreams',
  steps: [
    {
      icon: <IconTimeline className="size-5" />,
      title: 'Visualize Your Timeline',
      content:
        'The Gantt chart shows your workstreams over time. Click a workstream to see its achievements.',
      selector: '#tour-workstreams-gantt',
      side: 'bottom',
      showControls: true,
      pointerPadding: 10,
      pointerRadius: 10,
    },
    {
      icon: <IconPlus className="size-5" />,
      title: 'Create Workstreams',
      content: 'Manually create a workstream and assign achievements to it.',
      selector: '#tour-add-workstream',
      side: 'bottom',
      showControls: true,
      pointerPadding: 10,
      pointerRadius: 10,
    },
    {
      icon: <IconLayersSubtract className="size-5" />,
      title: 'Unassigned Achievements',
      content:
        'Achievements not yet grouped into a workstream. Assign them manually or use AI to auto-generate workstreams.',
      selector: '#tour-unassigned-workstreams',
      side: 'top',
      showControls: true,
      pointerPadding: 10,
      pointerRadius: 10,
    },
  ],
};
