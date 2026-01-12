import { IconTarget, IconChartBar, IconEdit } from '@tabler/icons-react';
import type { TourConfig } from './types';

export const PROJECT_DETAILS_TOUR_CONFIG: TourConfig = {
  id: 'tour-project-details',
  steps: [
    {
      icon: <IconTarget className="size-5" />,
      title: 'Project Achievements',
      content:
        'See the total number of achievements recorded for this project.',
      selector: '#tour-project-achievements-stat',
      side: 'bottom',
      showControls: true,
      pointerPadding: 10,
      pointerRadius: 10,
    },
    {
      icon: <IconChartBar className="size-5" />,
      title: 'Your Contribution Over Time',
      content:
        'This chart shows your weekly impact on the project. Spikes indicate periods of high-impact work.',
      selector: '#tour-project-impact-chart',
      side: 'top',
      showControls: true,
      pointerPadding: 10,
      pointerRadius: 10,
    },
    {
      icon: <IconEdit className="size-5" />,
      title: 'Edit Project',
      content: 'Update project details like name, company, status, or dates.',
      selector: '#tour-edit-project',
      side: 'bottom',
      showControls: true,
      pointerPadding: 10,
      pointerRadius: 10,
    },
  ],
};
