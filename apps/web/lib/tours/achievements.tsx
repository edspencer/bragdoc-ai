import {
  IconTable,
  IconPlus,
  IconStar,
  IconChartBar,
} from '@tabler/icons-react';
import type { TourConfig } from './types';

export const ACHIEVEMENTS_TOUR_CONFIG: TourConfig = {
  id: 'tour-achievements',
  steps: [
    {
      icon: <IconTable className="size-5" />,
      title: 'Your Achievements',
      content:
        'This table shows all your recorded achievements. Use filters to narrow by project, company, or time period.',
      selector: '#tour-achievements-table',
      side: 'bottom',
      showControls: true,
      pointerPadding: 10,
      pointerRadius: 10,
    },
    {
      icon: <IconPlus className="size-5" />,
      title: 'Add Achievements',
      content:
        "Manually add achievements for work that wasn't captured through the CLI.",
      selector: '#tour-add-achievement',
      side: 'bottom',
      showControls: true,
      pointerPadding: 10,
      pointerRadius: 10,
    },
    {
      icon: <IconStar className="size-5" />,
      title: 'Rate Your Impact',
      content:
        'Click the stars to adjust impact (1-10). Higher ratings highlight your most significant contributions.',
      selector: '#tour-impact-rating',
      side: 'top',
      showControls: true,
      pointerPadding: 10,
      pointerRadius: 10,
    },
    {
      icon: <IconChartBar className="size-5" />,
      title: 'Track Your Impact Over Time',
      content:
        'This chart shows your weekly impact trends. Spikes indicate periods of high-impact work.',
      selector: '#tour-weekly-impact',
      side: 'top',
      showControls: true,
      pointerPadding: 10,
      pointerRadius: 10,
    },
  ],
};
