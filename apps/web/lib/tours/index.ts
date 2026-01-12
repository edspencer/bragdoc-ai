export * from './types';
export { DASHBOARD_TOUR_CONFIG } from './dashboard';
export { ACHIEVEMENTS_TOUR_CONFIG } from './achievements';
export { WORKSTREAMS_TOUR_CONFIG } from './workstreams';
export { PERFORMANCE_REVIEW_TOUR_CONFIG } from './performance-review';
export { PROJECT_DETAILS_TOUR_CONFIG } from './project-details';

import { DASHBOARD_TOUR_CONFIG } from './dashboard';
import { ACHIEVEMENTS_TOUR_CONFIG } from './achievements';
import { WORKSTREAMS_TOUR_CONFIG } from './workstreams';
import { PERFORMANCE_REVIEW_TOUR_CONFIG } from './performance-review';
import { PROJECT_DETAILS_TOUR_CONFIG } from './project-details';
import type { TourConfig } from './types';

export const TOUR_CONFIGS: Record<string, TourConfig> = {
  [DASHBOARD_TOUR_CONFIG.id]: DASHBOARD_TOUR_CONFIG,
  [ACHIEVEMENTS_TOUR_CONFIG.id]: ACHIEVEMENTS_TOUR_CONFIG,
  [WORKSTREAMS_TOUR_CONFIG.id]: WORKSTREAMS_TOUR_CONFIG,
  [PERFORMANCE_REVIEW_TOUR_CONFIG.id]: PERFORMANCE_REVIEW_TOUR_CONFIG,
  [PROJECT_DETAILS_TOUR_CONFIG.id]: PROJECT_DETAILS_TOUR_CONFIG,
};
