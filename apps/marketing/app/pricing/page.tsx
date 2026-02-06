import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { BetaBanner } from '@/components/pricing/beta-banner';
import { PricingHeader } from '@/components/pricing/pricing-header';
import { PricingTiers } from '@/components/pricing/pricing-tiers';
import { ComparisonTable } from '@/components/pricing/comparison-table';
import { PrivacyArchitecture } from '@/components/how-it-works/privacy-architecture';
import { PricingFaq } from '@/components/pricing/pricing-faq';
import { PricingCta } from '@/components/pricing/pricing-cta';
import { OfferSchema } from '@/components/structured-data/offer-schema';

export const metadata: Metadata = {
  title: 'BragDoc Pricing: $45/year or $99 Lifetime - Free Trial Credits',
  description:
    'BragDoc offers simple pricing: $45/year or $99 lifetime. Start free with 10 AI credits and 20 chat messages. No credit card required.',
  keywords:
    'bragdoc pricing, achievement tracker pricing, developer tool pricing, lifetime deal',
  alternates: {
    canonical: '/pricing',
  },
};

const pricingOffers = [
  {
    name: 'Free Plan',
    price: '0',
    priceCurrency: 'USD',
    description: 'Full CLI features with your own LLM plus free trial credits',
  },
  {
    name: 'Annual Plan',
    price: '45',
    priceCurrency: 'USD',
    description: 'Full cloud AI access, billed annually at $45/year',
  },
  {
    name: 'Lifetime Plan',
    price: '99',
    priceCurrency: 'USD',
    description: 'Pay once, use forever with full cloud AI access',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <OfferSchema offers={pricingOffers} />
      <Header />
      <div className="pt-16">
        <BetaBanner />
      </div>
      <main>
        <PricingHeader />
        <PricingTiers />
        <PrivacyArchitecture />
        <ComparisonTable />
        <PricingFaq />
        <PricingCta />
      </main>
      <Footer />
    </div>
  );
}
