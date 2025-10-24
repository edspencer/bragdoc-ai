'use client';

import { usePostHog } from 'posthog-js/react';

export function useTracking() {
  const posthog = usePostHog();

  const trackCTAClick = (
    location: string,
    ctaText: string,
    destinationUrl: string,
  ) => {
    posthog?.capture('marketing_cta_clicked', {
      location,
      cta_text: ctaText,
      destination_url: destinationUrl,
    });
  };

  const trackFeatureExplored = (featureName: string, page: string) => {
    posthog?.capture('feature_explored', {
      feature_name: featureName,
      page,
    });
  };

  const trackPricingInteraction = (planViewed: string) => {
    posthog?.capture('plan_comparison_interacted', {
      plan_viewed: planViewed,
    });
  };

  return {
    trackCTAClick,
    trackFeatureExplored,
    trackPricingInteraction,
  };
}
