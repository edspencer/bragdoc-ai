"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { WelcomeCard, type WelcomeCardProps } from "./card";
import { cn } from "@/lib/utils";

export interface WelcomeCarouselProps {
  cards: Omit<WelcomeCardProps, "isActive">[];
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
    <div className={cn("flex flex-col gap-8", className)}>
      <div className="relative h-[500px]">
        {cards.map((card, index) => (
          <WelcomeCard key={index} {...card} isActive={index === activeIndex} />
        ))}
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={activeIndex === 0}
          >
            Previous
          </Button>
          <div className="flex items-center gap-2">
            {cards.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-2 w-2 rounded-full transition-colors",
                  index === activeIndex
                    ? "bg-primary"
                    : "bg-muted-foreground/20"
                )}
              />
            ))}
          </div>
          <Button onClick={handleNext}>
            {activeIndex === cards.length - 1 ? "Complete" : "Next"}
          </Button>
        </div>
        <Button variant="ghost" onClick={handleSkip}>
          Skip
        </Button>
      </div>
    </div>
  );
}
