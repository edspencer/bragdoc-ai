'use client';

import * as React from 'react';
import { Button } from 'components/ui/button';
import { WelcomeCard, type WelcomeCardProps } from './card';
import { cn } from 'lib/utils';
import { AnimatePresence } from 'framer-motion';

export interface WelcomeCarouselProps {
  cards: Omit<WelcomeCardProps, 'isActive'>[];
  onComplete: () => void;
  onSkip: () => void;
  className?: string;
}

export function WelcomeCarousel({
  cards,
  onComplete,
  onSkip,
  className,
}: WelcomeCarouselProps) {
  const [activeIndex, setActiveIndex] = React.useState(0);

  const handleNext = React.useCallback(() => {
    if (activeIndex === cards.length - 1) {
      onComplete();
    } else {
      setActiveIndex((prev) => prev + 1);
    }
  }, [activeIndex, cards.length, onComplete]);

  const handlePrevious = React.useCallback(() => {
    setActiveIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleSkip = React.useCallback(() => {
    onSkip();
  }, [onSkip]);

  return (
    <div
      className={cn(
        'flex flex-grow flex-col gap-8 items-stretch justify-center mx-auto',
        className,
      )}
    >
      <div className="relative flex items-center justify-center">
        <div className="w-full max-w-3xl">
          <AnimatePresence mode="wait">
            {cards.map(
              (card, index) =>
                index === activeIndex && (
                  <WelcomeCard key={index} {...card} isActive={true} />
                ),
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="flex gap-4 px-8">
        <div className="flex grow items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={activeIndex === 0}
          >
            Previous
          </Button>
          {activeIndex === cards.length - 1 ? null : (
            <Button variant="ghost" onClick={handleSkip}>
              Skip
            </Button>
          )}
          <Button onClick={handleNext}>
            {activeIndex === cards.length - 1 ? "Let's Go!" : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
