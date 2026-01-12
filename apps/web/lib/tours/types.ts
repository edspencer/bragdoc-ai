import type { ReactNode } from 'react';

export interface TourStep {
  icon: ReactNode;
  title: string;
  content: ReactNode;
  selector: string;
  side: 'top' | 'bottom' | 'left' | 'right';
  showControls: boolean;
  pointerPadding: number;
  pointerRadius: number;
}

export interface TourConfig {
  id: string;
  steps: TourStep[];
}

// Single global storage key for tour completion
// Decision: Once user completes any tour, they understand the mechanics
export const TOUR_STORAGE_KEY = 'demo-tour-completed';
