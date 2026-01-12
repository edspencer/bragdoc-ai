/**
 * @deprecated Use imports from '@/lib/tours' instead.
 * This file is kept for backward compatibility.
 */
export { TOUR_STORAGE_KEY, type TourStep } from './tours/types';
export { DASHBOARD_TOUR_CONFIG } from './tours/dashboard';

import { DASHBOARD_TOUR_CONFIG } from './tours/dashboard';

// Legacy exports for backward compatibility
export const DEMO_TOUR_STEPS = DASHBOARD_TOUR_CONFIG.steps;
export const TOUR_ID = DASHBOARD_TOUR_CONFIG.id;
