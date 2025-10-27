'use client';

import { FlaskConical, Sparkles } from 'lucide-react';

/**
 * Beta Feature Banner Component
 *
 * Displays a prominent banner to indicate that a feature is in beta and being actively developed.
 * Uses gradient styling similar to the demo mode CTA for visual consistency.
 */
export function BetaFeatureBanner() {
  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 p-[2px] shadow-md">
        <div className="relative bg-background rounded-[6px] px-4 py-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <FlaskConical className="h-5 w-5 text-amber-500" />
              <h3 className="font-semibold text-base bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                Beta Feature
              </h3>
              <Sparkles className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              BragDoc is in open free beta. This feature is being actively
              developed and improved based on your feedback.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
