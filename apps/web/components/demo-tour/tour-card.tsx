'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Step } from 'onborda';

interface TourCardProps {
  step: Step;
  currentStep: number;
  totalSteps: number;
  nextStep: () => void;
  arrow: React.ReactElement;
  onSkip: () => void;
}

export function TourCard({
  step,
  currentStep,
  totalSteps,
  nextStep,
  arrow,
  onSkip,
}: TourCardProps) {
  const isLastStep = currentStep === totalSteps - 1;

  // Handle Escape key to close tour
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSkip();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onSkip]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="relative z-9999"
      role="dialog"
      aria-label="Product tour"
    >
      {arrow}
      <Card className="w-[320px] shadow-lg z-9999 relative">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-primary">{step.icon}</span>
              <CardTitle className="text-base">{step.title}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onSkip}
              aria-label="Skip tour"
            >
              <X className="size-4" />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            Step {currentStep + 1} of {totalSteps}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">{step.content}</div>
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              aria-label="Skip tour"
            >
              Skip
            </Button>
            <Button
              size="sm"
              onClick={nextStep}
              className="gap-1"
              aria-label={isLastStep ? 'Finish tour' : 'Next step'}
            >
              {isLastStep ? 'Finish' : 'Next'}
              {!isLastStep && <ChevronRight className="size-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
