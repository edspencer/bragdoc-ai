'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Onborda, OnbordaProvider, useOnborda } from 'onborda';
import type { CardComponentProps } from 'onborda';
import { usePathname } from 'next/navigation';
import { useDemoTour } from '@/hooks/use-demo-tour';
import { TourCard } from './tour-card';
import { DEMO_TOUR_STEPS, TOUR_ID } from '@/lib/demo-tour-config';

// Context for sharing tour controls with other components
interface TourContextType {
  startTour: () => void;
  isTourCompleted: boolean;
}

const TourContext = createContext<TourContextType | null>(null);

export function useTourContext() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTourContext must be used within a TourProvider');
  }
  return context;
}

interface TourProviderProps {
  children: React.ReactNode;
}

// Minimum viewport width for showing the tour (matches Tailwind's md breakpoint)
const MIN_TOUR_WIDTH = 768;

// Inner component that uses the Onborda context
function TourContent({ children }: TourProviderProps) {
  const pathname = usePathname();
  const { showTour, isTourCompleted, startTour, completeTour } = useDemoTour();
  const { startOnborda, closeOnborda } = useOnborda();
  const [isDesktop, setIsDesktop] = useState(false);

  // Check viewport width - disable tour on mobile
  useEffect(() => {
    const checkViewport = () => {
      setIsDesktop(window.innerWidth >= MIN_TOUR_WIDTH);
    };

    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  // Only show tour on dashboard and desktop viewports
  const isOnDashboard = pathname === '/dashboard';
  const shouldShowTour = showTour && isOnDashboard && isDesktop;

  // Start or close tour based on state
  useEffect(() => {
    if (shouldShowTour) {
      // Small delay to ensure DOM elements are rendered
      const timer = setTimeout(() => {
        startOnborda(TOUR_ID);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [shouldShowTour, startOnborda]);

  // Create step objects compatible with Onborda
  const tourSteps = useMemo(
    () => [
      {
        tour: TOUR_ID,
        steps: DEMO_TOUR_STEPS.map((step, index) => ({
          ...step,
          // Onborda expects step index
          stepIndex: index,
        })),
      },
    ],
    [],
  );

  // Handle tour completion - close Onborda and persist state
  const handleCompleteTour = useCallback(() => {
    closeOnborda();
    completeTour();
  }, [closeOnborda, completeTour]);

  // Handle starting tour - also needs to call startOnborda
  const handleStartTour = useCallback(() => {
    startTour();
    // The useEffect above will call startOnborda when showTour becomes true
  }, [startTour]);

  // Custom card renderer that wraps our TourCard
  const CustomCard = useCallback(
    ({
      step,
      currentStep,
      totalSteps,
      nextStep,
      arrow,
    }: CardComponentProps) => {
      // Handle completion on last step
      const handleNext = () => {
        if (currentStep === totalSteps - 1) {
          handleCompleteTour();
        } else {
          nextStep();
        }
      };

      return (
        <TourCard
          step={step}
          currentStep={currentStep}
          totalSteps={totalSteps}
          nextStep={handleNext}
          arrow={arrow}
          onSkip={handleCompleteTour}
        />
      );
    },
    [handleCompleteTour],
  );

  // Context value for sharing tour controls
  const contextValue = useMemo(
    () => ({
      startTour: handleStartTour,
      isTourCompleted,
    }),
    [handleStartTour, isTourCompleted],
  );

  return (
    <TourContext.Provider value={contextValue}>
      <Onborda
        steps={tourSteps}
        showOnborda={shouldShowTour}
        shadowRgb="0,0,0"
        shadowOpacity="0.5"
        cardTransition={{ duration: 0.3, ease: 'easeInOut' }}
        cardComponent={CustomCard}
      >
        {children}
      </Onborda>
    </TourContext.Provider>
  );
}

export function TourProvider({ children }: TourProviderProps) {
  return (
    <OnbordaProvider>
      <TourContent>{children}</TourContent>
    </OnbordaProvider>
  );
}

// Keep the old name as an alias for backward compatibility
export const DemoTourProvider = TourProvider;
