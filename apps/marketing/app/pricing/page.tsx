import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { PricingHeader } from '@/components/pricing/pricing-header';
import { PricingTiers } from '@/components/pricing/pricing-tiers';
import { ComparisonTable } from '@/components/pricing/comparison-table';
import { PrivacyArchitecture } from '@/components/how-it-works/privacy-architecture';
import { PricingFaq } from '@/components/pricing/pricing-faq';
import { PricingCta } from '@/components/pricing/pricing-cta';
import { OfferSchema } from '@/components/structured-data/offer-schema';

export const metadata: Metadata = {
  title:
    'BragDoc Pricing: Free Achievement Tracking, Optional Cloud AI - $4.99/mo',
  description:
    'BragDoc is free to use with your own LLM. Optional cloud AI features are just $4.99/month. No contracts, cancel anytime. Compare free vs paid plans.',
  keywords:
    'bragdoc pricing, free achievement tracker, developer tool pricing, brag document cost',
  alternates: {
    canonical: '/pricing',
  },
};

const pricingOffers = [
  {
    name: 'Free Plan',
    price: '0',
    priceCurrency: 'USD',
    description:
      'Full CLI features with your own LLM (Ollama, OpenAI, Anthropic)',
  },
  {
    name: 'Cloud AI Plan',
    price: '4.99',
    priceCurrency: 'USD',
    description: 'Cloud-based AI document generation and advanced features',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <OfferSchema offers={pricingOffers} />
      <Header />
      <main className="pt-16">
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
