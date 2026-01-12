import {
  IconTarget,
  IconChartBar,
  IconFolder,
  IconStar,
} from '@tabler/icons-react';
import type { TourConfig } from './types';

export const DASHBOARD_TOUR_CONFIG: TourConfig = {
  id: 'tour-dashboard',
  steps: [
    {
      icon: <IconTarget className="size-5" />,
      title: 'Your Achievements',
      content: (
        <>
          <p>
            <strong>Achievements</strong> are the building blocks of your career
            story. They're automatically extracted from Git commits by the{' '}
            <strong>CLI</strong>, or you can add them manually.
          </p>
          <p className="mt-2">
            Each achievement represents something meaningful you accomplished.
          </p>
        </>
      ),
      selector: '#tour-achievements-stat',
      side: 'bottom',
      showControls: true,
      pointerPadding: 10,
      pointerRadius: 10,
    },
    {
      icon: <IconChartBar className="size-5" />,
      title: 'Track Your Impact Over Time',
      content: (
        <>
          <p>
            Not all achievements are created equal.{' '}
            <strong>Impact Points</strong> measure significance on a scale of
            1-10.
          </p>
          <p className="mt-2">
            A small bug fix might be 2 points, while a major feature could be
            8-10 points.
          </p>
        </>
      ),
      selector: '#tour-weekly-impact',
      side: 'bottom',
      showControls: true,
      pointerPadding: 10,
      pointerRadius: 10,
    },
    {
      icon: <IconFolder className="size-5" />,
      title: 'Organize by Project',
      content: (
        <>
          <p>Projects help organize your achievements by context.</p>
          <p className="mt-3 font-medium">Get started with the CLI:</p>
          <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 font-mono text-sm">
            npm install -g @bragdoc/cli{'\n'}
            bragdoc login{'\n'}
            bragdoc extract
          </pre>
        </>
      ),
      selector: '#tour-top-projects',
      side: 'right',
      showControls: true,
      pointerPadding: 10,
      pointerRadius: 10,
    },
    {
      icon: <IconStar className="size-5" />,
      title: 'Rate Your Impact',
      content: (
        <>
          <p>
            Each <strong>Achievement</strong> has a 1-10 star impact rating. AI
            estimates the initial impact, but you can click the stars to adjust.
          </p>
          <p className="mt-2">Hover over stars to see what each level means.</p>
        </>
      ),
      selector: '#tour-impact-rating',
      side: 'top',
      showControls: true,
      pointerPadding: 10,
      pointerRadius: 10,
    },
  ],
};
