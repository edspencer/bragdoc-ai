# TODO

<!-- This file contains tasks to complete after the v0 design phase is finished -->

## Post-Design Implementation Tasks

### A/B Testing Setup

- [ ] Set up A/B testing framework for "Why It Matters" teaser components
  - Three variants exist: `WhyItMattersTeaserV1`, `WhyItMattersTeaserV2`, `WhyItMattersTeaserV3`
  - Currently showing V2 by default on homepage
  - Need to implement A/B testing to determine which variant performs best
  - Track metrics: click-through rate to /why-it-matters page, time on page, conversion to sign-up
  - Location: Homepage, between Privacy Section and Quick Start Section
  - Files: `components/why-it-matters-teaser-v1.tsx`, `components/why-it-matters-teaser-v2.tsx`, `components/why-it-matters-teaser-v3.tsx`

- [ ] Set up A/B testing for CTA section variants
  - Three variants exist: `CTASection`, `CTASectionV2`, `CTASectionV3`
  - Currently showing V2 by default on homepage
  - Need to implement A/B testing to determine which CTA design drives the most conversions
  - Track metrics: click-through rate to sign-up, button clicks, conversion rate
  - Location: Homepage, bottom of page before footer
  - Files: `components/cta-section.tsx`, `components/cta-section-v2.tsx`, `components/cta-section-v3.tsx`
